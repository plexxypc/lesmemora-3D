import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { order_status_label } from "../lib/order_inbox";
import { orders_directory } from "../lib/order_access";
import { expires_at_ms, parse_published_order } from "../lib/order_schema";

/**
 * Print every published order and whether it is active, expiring, or expired.
 *
 * @returns Nothing.
 */
function main(): void {
  const root = orders_directory();
  if (!existsSync(root)) {
    console.log("No orders yet.");
    return;
  }
  const files = readdirSync(root).filter((name) => name.endsWith(".json"));
  if (files.length === 0) {
    console.log("No orders yet.");
    return;
  }
  const now = new Date();
  const rows = [["slug", "recipient", "theme", "plan", "created_at", "expires_at", "status"]];
  let failed = false;
  for (const file_name of files.sort()) {
    const slug = file_name.replace(/\.json$/, "");
    try {
      const order = parse_published_order(JSON.parse(readFileSync(join(root, file_name), "utf8")) as unknown);
      rows.push([
        order.slug,
        order.recipient_name,
        order.theme_id,
        order.plan,
        order.created_at.slice(0, 10),
        order.expires_at.slice(0, 10),
        order_status_label(expires_at_ms(order.expires_at), now),
      ]);
    } catch (error) {
      failed = true;
      const message = error instanceof Error ? error.message : "Invalid order.";
      console.error(`orders/${slug}.json\n${message}\n`);
    }
  }
  if (rows.length > 1) {
    console.log(render_table(rows));
  }
  if (failed) {
    process.exitCode = 1;
  }
}

function render_table(rows: string[][]): string {
  const widths = rows[0].map((_, index) => Math.max(...rows.map((row) => row[index]?.length ?? 0)));
  return rows.map((row) => row.map((cell, index) => cell.padEnd(widths[index] ?? 0)).join("  ")).join("\n");
}

main();
