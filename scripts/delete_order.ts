import { rmSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { join, resolve } from "node:path";
import { order_file_path } from "../lib/order_access";
import { is_public_slug } from "../lib/slug";

/**
 * Delete an order file and its published photos after the slug is typed again.
 *
 * @returns Nothing.
 */
async function main(): Promise<void> {
  const slug = process.argv[2];
  if (!slug || process.argv.length !== 3) {
    console.log("Usage: npm run delete_order -- <slug>");
    process.exitCode = 1;
    return;
  }
  if (!is_public_slug(slug)) {
    throw new Error("That slug is not a published order id.");
  }
  const order_path = order_file_path(slug);
  if (!order_path) {
    throw new Error("That slug is not a published order id.");
  }
  if (!stdin.isTTY) {
    throw new Error("Refusing to delete without a terminal. Run this on your machine and type the slug to confirm.");
  }
  const prompt = createInterface({ input: stdin, output: stdout });
  const answer = await prompt.question(`This permanently deletes the order and its photos. Type ${slug} to confirm: `);
  prompt.close();
  if (answer.trim() !== slug) {
    throw new Error("The slug did not match. Nothing was deleted.");
  }
  const photo_dir = resolve(process.cwd(), "public", "o", slug);
  rmSync(order_path, { force: true });
  rmSync(photo_dir, { recursive: true, force: true });
  console.log(`Deleted orders/${slug}.json and ${join("public", "o", slug)}.`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "The order could not be deleted.";
  console.error(message);
  process.exitCode = 1;
});
