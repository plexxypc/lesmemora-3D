import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { customer_directory, list_inbox_photos } from "../lib/order_inbox";
import { parse_draft_order } from "../lib/order_schema";

/**
 * Add every photo in the customer folder that order.json does not use yet.
 * New photos go at the end of the last gallery room, without captions.
 *
 * @returns Nothing. Prints what was added.
 */
function main(): void {
  const name = process.argv[2];
  if (!name || process.argv.length !== 3) {
    console.log("Usage: npm run add_photos -- <customer_name>");
    process.exitCode = 1;
    return;
  }
  const folder = customer_directory(name);
  const draft_path = join(folder, "order.json");
  if (!existsSync(draft_path)) {
    throw new Error(`Missing ${draft_path}. Create it with: npm run new_order:template -- ${name}`);
  }
  const raw = JSON.parse(readFileSync(draft_path, "utf8")) as { rooms?: { type?: string; exhibits?: unknown[] }[] };
  const draft = parse_draft_order(raw);
  const used = new Set(draft.rooms.flatMap((room) => room.exhibits.map((exhibit) => exhibit.file).filter(Boolean)));
  const missing = list_inbox_photos(folder).filter((file) => !used.has(file));
  if (missing.length === 0) {
    console.log("Every photo in the folder is already in order.json.");
    return;
  }
  const galleries = (raw.rooms ?? []).filter((room) => room.type === "gallery");
  const target = galleries[galleries.length - 1];
  if (!target || !Array.isArray(target.exhibits)) {
    throw new Error("order.json has no gallery room to add photos to.");
  }
  for (const file of missing) {
    target.exhibits.push({ kind: "photo", file, caption: "" });
  }
  parse_draft_order(raw);
  writeFileSync(draft_path, `${JSON.stringify(raw, null, 2)}\n`, "utf8");
  console.log(`Added ${missing.length} photo(s) to the last gallery room: ${missing.join(", ")}`);
  console.log("They have no captions yet. Add them in order.json if you want words under them.");
}

try {
  main();
} catch (error: unknown) {
  console.error(error instanceof Error ? error.message : "Photos could not be added.");
  process.exitCode = 1;
}
