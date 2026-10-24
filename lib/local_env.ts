import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Load `.env` and `.env.local` for local scripts.
 * Values already set in the environment win. Next.js loads these for the app; tsx does not.
 *
 * @returns Nothing.
 */
export function load_local_env(): void {
  for (const name of [".env", ".env.local"]) {
    const path = join(process.cwd(), name);
    if (!existsSync(path)) {
      continue;
    }
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }
      const separator = trimmed.indexOf("=");
      if (separator < 1) {
        continue;
      }
      const key = trimmed.slice(0, separator).trim();
      let value = trimmed.slice(separator + 1).trim();
      if (
        (value.startsWith("\"") && value.endsWith("\"")) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }
}

/**
 * Public site origin used when printing an order link.
 *
 * @returns The origin without a trailing slash.
 */
export function public_site_url(): string {
  const value = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!value) {
    throw new Error("Set NEXT_PUBLIC_SITE_URL, for example https://your-site.vercel.app");
  }
  return value.replace(/\/$/, "");
}
