import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { build_published_order } from "../lib/build_order";
import { load_local_env, public_site_url } from "../lib/local_env";
import { customer_directory, list_inbox_files, list_inbox_photos } from "../lib/order_inbox";
import { find_order_problems, type order_problem } from "../lib/order_checks";
import { load_sealed_order, order_file_path, orders_directory } from "../lib/order_access";
import { parse_draft_order, parse_published_order, type draft_order } from "../lib/order_schema";
import { process_photo } from "../lib/process_photo";
import { create_order_slug, create_photo_name, is_public_slug } from "../lib/slug";
import { get_theme } from "../lib/themes";

/**
 * Create an inbox draft, or publish the draft into `/orders` and `/public/o`.
 *
 * @returns Nothing. Prints the link or a readable error.
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args[0] === "--template") {
    const name = args[1];
    if (!name || args.length !== 2) {
      usage();
      process.exitCode = 1;
      return;
    }
    write_template(name);
    return;
  }
  const flags = new Set(args.filter((arg) => arg === "--force"));
  const replace_at = args.indexOf("--replace");
  const replace_slug = replace_at >= 0 ? args[replace_at + 1] : undefined;
  const positional = args.filter((arg, index) => !arg.startsWith("--") && !(replace_at >= 0 && index === replace_at + 1));
  const name = positional[0];
  if (!name || positional.length !== 1 || (replace_at >= 0 && !replace_slug)) {
    usage();
    process.exitCode = 1;
    return;
  }
  load_local_env();
  await publish_order(name, public_site_url(), { force: flags.has("--force"), replace_slug });
}

function usage(): void {
  console.log("Usage:");
  console.log("  npm run new_order:template -- <customer_name>     Start a draft from the photos already in the folder");
  console.log("  npm run new_order -- <customer_name>              Check the draft, then publish it");
  console.log("  npm run new_order -- <customer_name> --replace <slug>");
  console.log("                                                    Publish again under the same link (for edits)");
  console.log("  npm run new_order -- <customer_name> --force      Publish even when the check finds errors");
}

function write_template(name: string): void {
  const folder = customer_directory(name);
  const theme = get_theme("romantic");
  if (!theme) {
    throw new Error("The romantic theme is missing, so the draft cannot be created.");
  }
  mkdirSync(folder, { recursive: true });
  const draft_path = join(folder, "order.json");
  if (existsSync(draft_path)) {
    throw new Error(`${draft_path} already exists. Edit it, or pick another folder.`);
  }
  const photos = list_inbox_photos(folder);
  const names = theme.default_room_names;
  const draft = {
    theme_id: theme.id,
    title: "Replace this title",
    recipient_name: "Replace this name",
    dedication: "Replace this dedication.",
    plan: "paid",
    password: "",
    notes: "Internal note. Never shown on the museum.",
    music: { type: "library", track_id: "soft_room" },
    rooms: [
      { type: "lobby", name: names.lobby, exhibits: [] },
      {
        type: "gallery",
        name: names.gallery,
        exhibits:
          photos.length > 0
            ? photos.map((file) => ({ kind: "photo", file, caption: "" }))
            : [{ kind: "photo", file: "photo-1.jpg", caption: "" }],
      },
      {
        type: "timeline",
        name: names.timeline,
        exhibits: [{ kind: "milestone", caption: "Replace this milestone name", date: "2020-06-01", body: "Replace this line." }],
      },
      {
        type: "letter",
        name: names.letter,
        exhibits: [{ kind: "letter", caption: "Read this one aloud", date: "2024-02-14", body: "Replace this letter." }],
      },
      {
        type: "finale",
        name: names.finale,
        exhibits: [{ kind: "note", body: "Replace this closing note." }],
      },
    ],
  };
  writeFileSync(draft_path, `${JSON.stringify(draft, null, 2)}\n`, "utf8");
  console.log(`Draft written to ${draft_path}`);
  console.log(photos.length > 0 ? `Found ${photos.length} photo(s) in the folder and added them all.` : "No photos in the folder yet. Add them, then run: npm run add_photos -- " + name);
  console.log("Now open order.json and replace every line that says \"Replace this ...\". The publish step refuses to run until you do.");
  console.log(`Then: npm run new_order -- "${name}"`);
}

function print_problems(problems: order_problem[]): void {
  for (const problem of problems) {
    console.log(`${problem.level === "error" ? "ERROR  " : "warning"}  ${problem.message}`);
  }
}

async function publish_order(
  name: string,
  site: string,
  options: { force: boolean; replace_slug: string | undefined },
): Promise<void> {
  const folder = customer_directory(name);
  const draft_path = join(folder, "order.json");
  if (!existsSync(draft_path)) {
    throw new Error(`Missing ${draft_path}. Create it with: npm run new_order:template -- ${name}`);
  }
  let draft = parse_draft_order(JSON.parse(readFileSync(draft_path, "utf8")) as unknown);

  const problems = find_order_problems(draft, list_inbox_files(folder));
  print_problems(problems);
  const errors = problems.filter((problem) => problem.level === "error");
  if (errors.length > 0 && !options.force) {
    throw new Error(`Not published: ${errors.length} problem(s) above. Fix them and run the command again (or add --force to publish anyway).`);
  }

  let slug: string;
  let created_at = new Date();
  let old_files: string[] = [];
  if (options.replace_slug) {
    if (!is_public_slug(options.replace_slug)) {
      throw new Error("That slug is not a published order id.");
    }
    const existing = load_sealed_order(options.replace_slug);
    if (!existing) {
      throw new Error(`No order found for ${options.replace_slug}.`);
    }
    slug = options.replace_slug;
    created_at = new Date(existing.created_at);
    draft = { ...draft, expires_at: draft.expires_at ?? existing.expires_at } as draft_order;
    const old_dir = join(process.cwd(), "public", "o", slug);
    old_files = existsSync(old_dir) ? readdirSync(old_dir) : [];
  } else {
    slug = unused_slug();
  }

  const public_dir = join(process.cwd(), "public", "o", slug);
  mkdirSync(public_dir, { recursive: true });
  const published_paths = new Map<string, string>();
  for (const room of draft.rooms) {
    for (const exhibit of room.exhibits) {
      if (exhibit.kind !== "photo" || !exhibit.file) {
        continue;
      }
      const file_name = exhibit.file;
      if (file_name !== basename(file_name) || file_name.includes("..")) {
        throw new Error(`Photo "${file_name}" must be a file name in the customer folder, not a path.`);
      }
      if (published_paths.has(file_name)) {
        continue;
      }
      const source = join(folder, file_name);
      if (!existsSync(source)) {
        throw new Error(`Missing photo "${file_name}" in ${folder}.`);
      }
      const output_name = `${create_photo_name()}.webp`;
      await process_photo(source, join(public_dir, output_name));
      published_paths.set(file_name, `/o/${slug}/${output_name}`);
    }
  }
  const order = build_published_order({
    draft,
    slug,
    created_at,
    image_for_file: (file_name) => {
      const image = published_paths.get(file_name);
      if (!image) {
        throw new Error(`Photo "${file_name}" was not processed.`);
      }
      return image;
    },
  });
  const checked = parse_published_order(order);
  const destination = order_file_path(checked.slug);
  if (!destination) {
    throw new Error("The generated slug was rejected.");
  }
  mkdirSync(orders_directory(), { recursive: true });
  writeFileSync(destination, `${JSON.stringify(checked, null, 2)}\n`, "utf8");
  for (const old of old_files) {
    rmSync(join(public_dir, old), { force: true });
  }
  const photo_count = published_paths.size;
  console.log("");
  console.log(`Order written to orders/${checked.slug}.json`);
  console.log(`Photos written to public/o/${checked.slug}/ (${photo_count})`);
  console.log(`Link: ${site}/m/${checked.slug}`);
  console.log(`Expires: ${checked.expires_at}`);
  console.log(`Plan: ${checked.plan}`);
  console.log(`Badge: ${checked.show_badge ? "shown" : "hidden"}`);
  console.log(`Password: ${checked.password ? "set" : "none"}`);
  if (options.replace_slug) {
    console.log("Replaced the earlier version. The customer's link did not change.");
  }
  console.log("Next: git add orders public/o, commit, and push to publish.");
}

function unused_slug(): string {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const slug = create_order_slug();
    const path = order_file_path(slug);
    if (path && !existsSync(path)) {
      return slug;
    }
  }
  throw new Error("Could not find a free slug. Run the command again.");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "The order could not be created.";
  console.error(message);
  process.exitCode = 1;
});
