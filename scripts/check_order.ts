import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { find_order_problems } from "../lib/order_checks";
import { customer_directory, list_inbox_files } from "../lib/order_inbox";
import { parse_draft_order } from "../lib/order_schema";

/**
 * Check a draft without publishing anything.
 *
 * @returns Nothing. Prints every problem found.
 */
function main(): void {
  const name = process.argv[2];
  if (!name || process.argv.length !== 3) {
    console.log("Usage: npm run check_order -- <customer_name>");
    process.exitCode = 1;
    return;
  }
  const folder = customer_directory(name);
  const draft_path = join(folder, "order.json");
  if (!existsSync(draft_path)) {
    throw new Error(`Missing ${draft_path}.`);
  }
  const draft = parse_draft_order(JSON.parse(readFileSync(draft_path, "utf8")) as unknown);
  const problems = find_order_problems(draft, list_inbox_files(folder));
  if (problems.length === 0) {
    console.log("No problems found. Ready to publish.");
    return;
  }
  for (const problem of problems) {
    console.log(`${problem.level === "error" ? "ERROR  " : "warning"}  ${problem.message}`);
  }
  const errors = problems.filter((problem) => problem.level === "error").length;
  console.log(errors > 0 ? `\n${errors} error(s) must be fixed before publishing.` : "\nOnly warnings. You can publish.");
  process.exitCode = errors > 0 ? 1 : 0;
}

try {
  main();
} catch (error: unknown) {
  console.error(error instanceof Error ? error.message : "The check could not run.");
  process.exitCode = 1;
}
