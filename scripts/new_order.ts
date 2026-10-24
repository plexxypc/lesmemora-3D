import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { build_published_order } from "../lib/build_order";
import { load_local_env, public_site_url } from "../lib/local_env";
import { customer_directory } from "../lib/order_inbox";
import { order_file_path, orders_directory } from "../lib/order_access";
import { parse_draft_order, parse_published_order } from "../lib/order_schema";
import { process_photo } from "../lib/process_photo";
import { create_order_slug, create_photo_name } from "../lib/slug";
import { get_theme } from "../lib/themes";

const photo_extensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".tif", ".tiff", ".avif", ".heic"]);

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
  if (args.length !== 1 || !args[0]) {
    usage();
    process.exitCode = 1;
    return;
  }
  load_local_env();
  const site = public_site_url();
  await publish_order(args[0], site);
}

function usage(): void {
  console.log("Usage:");
  console.log("  npm run new_order:template -- <customer_name>");
  console.log("  npm run new_order -- <customer_name>");
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
  const names = theme.default_room_names;
  const draft = {
    theme_id: theme.id,
    title: "For Alex",
    recipient_name: "Alex",
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
        exhibits: [{ kind: "photo", file: "photo-1.jpg", caption: "Replace this caption.", date: "2024-01-01" }],
      },
      {
        type: "timeline",
        name: names.timeline,
        exhibits: [{ kind: "milestone", caption: "A day worth keeping", date: "2020-06-01", body: "Replace this line." }],
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
  console.log("Add the photos named in that file, edit the words, then run:");
  console.log(`  npm run new_order -- "${name}"`);
}

async function publish_order(name: string, site: string): Promise<void> {
  const folder = customer_directory(name);
  const draft_path = join(folder, "order.json");
  if (!existsSync(draft_path)) {
    throw new Error(`Missing ${draft_path}. Create it with: npm run new_order:template -- ${name}`);
  }
  const draft = parse_draft_order(JSON.parse(readFileSync(draft_path, "utf8")) as unknown);
  const slug = unused_slug();
  const public_dir = join(process.cwd(), "public", "o", slug);
  mkdirSync(public_dir, { recursive: true });
  const published_paths = new Map<string, string>();
  const referenced = new Set<string>();
  for (const room of draft.rooms) {
    for (const exhibit of room.exhibits) {
      if (exhibit.kind !== "photo" || !exhibit.file) {
        continue;
      }
      const file_name = exhibit.file;
      if (file_name !== basename(file_name) || file_name.includes("..")) {
        throw new Error(`Photo "${file_name}" must be a file name in the customer folder, not a path.`);
      }
      referenced.add(file_name);
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
  warn_about_unused_photos(folder, referenced);
  const order = build_published_order({
    draft,
    slug,
    created_at: new Date(),
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
  console.log(`Order written to orders/${checked.slug}.json`);
  console.log(`Photos written to public/o/${checked.slug}/`);
  console.log(`Link: ${site}/m/${checked.slug}`);
  console.log(`Expires: ${checked.expires_at}`);
  console.log(`Plan: ${checked.plan}`);
  console.log(`Badge: ${checked.show_badge ? "shown" : "hidden"}`);
  console.log(`Password: ${checked.password ? "set" : "none"}`);
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

function warn_about_unused_photos(folder: string, referenced: Set<string>): void {
  const extras = readdirSync(folder).filter((name) => {
    const extension = name.slice(name.lastIndexOf(".")).toLowerCase();
    return photo_extensions.has(extension) && !referenced.has(name);
  });
  if (extras.length > 0) {
    console.log(`Left unused in the inbox: ${extras.join(", ")}`);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "The order could not be created.";
  console.error(message);
  process.exitCode = 1;
});
