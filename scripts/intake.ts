import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { intake_to_draft, parse_intake_message } from "../lib/intake";
import { customer_directory, list_inbox_photos } from "../lib/order_inbox";
import { parse_draft_order } from "../lib/order_schema";

/**
 * Turn the WhatsApp order form message into order.json.
 * The message is read from order_inbox/<name>/intake.txt unless a file is given.
 *
 * @returns Nothing. Prints a summary and any mismatch between photos and captions.
 */
function main(): void {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const rest = args.filter((arg) => arg !== "--force");
  const name = rest[0];
  if (!name || rest.length > 2) {
    console.log("Usage: npm run intake -- <customer_name> [message_file] [--force]");
    console.log("Save the customer's WhatsApp message as order_inbox/<customer_name>/intake.txt first.");
    process.exitCode = 1;
    return;
  }
  const folder = customer_directory(name);
  mkdirSync(folder, { recursive: true });
  const message_path = rest[1] ?? join(folder, "intake.txt");
  if (!existsSync(message_path)) {
    throw new Error(`Missing ${message_path}. Paste the customer's order form message into that file.`);
  }
  const draft_path = join(folder, "order.json");
  if (existsSync(draft_path) && !force) {
    throw new Error(`${draft_path} already exists. Add --force to overwrite it.`);
  }
  const form = parse_intake_message(readFileSync(message_path, "utf8"));
  const photos = list_inbox_photos(folder);
  const draft = parse_draft_order(intake_to_draft(form, photos));
  writeFileSync(draft_path, `${JSON.stringify(draft, null, 2)}\n`, "utf8");

  const captions = form.photo_captions.filter((caption) => caption.trim()).length;
  console.log(`Draft written to ${draft_path}`);
  console.log(`Customer: ${form.customer_name || "(no name)"}  |  For: ${form.recipient_name}  |  Style: ${draft.theme_id}  |  Plan: ${draft.plan}`);
  console.log(`Photos in folder: ${photos.length}  |  Captions in the form: ${form.photo_captions.length} (${captions} with words)`);
  if (photos.length === 0) {
    console.log("No photos found yet. Put them in the folder, then run: npm run add_photos -- " + name);
  } else if (photos.length !== form.photo_captions.length) {
    console.log(
      "The photo count does not match the caption count. Captions were matched by position, so check the order in order.json.",
    );
  }
  if (draft.music.type === "library") {
    console.log(`Music request: ${form.music || "(none)"}. A placeholder track was chosen. Change the music block if needed.`);
  }
  console.log(`Next: npm run check_order -- "${name}"  then  npm run new_order -- "${name}"`);
}

try {
  main();
} catch (error: unknown) {
  console.error(error instanceof Error ? error.message : "The form message could not be read.");
  process.exitCode = 1;
}
