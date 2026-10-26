import { readdirSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import { is_photo_file, natural_sort } from "./order_checks";

/**
 * Folder of raw customer photos. It is gitignored.
 *
 * @returns Absolute path to `/order_inbox`.
 */
export function inbox_directory(): string {
  return resolve(process.cwd(), "order_inbox");
}

/**
 * Resolve a customer folder and refuse paths that leave the inbox.
 *
 * @param name - Folder name passed on the command line.
 * @returns Absolute path to `/order_inbox/<name>`.
 */
export function customer_directory(name: string): string {
  const trimmed = name.trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9 _-]{0,48}$/.test(trimmed)) {
    throw new Error("Use a customer folder name made of letters, numbers, spaces, hyphens, or underscores.");
  }
  const root = inbox_directory();
  const path = resolve(root, trimmed);
  const from_root = relative(root, path);
  if (from_root.startsWith("..") || isAbsolute(from_root)) {
    throw new Error("The customer folder has to stay inside order_inbox.");
  }
  return path;
}

/**
 * Status shown by `npm run list_orders`.
 *
 * @param expires_at_ms - Expiry in unix milliseconds.
 * @param now - Clock.
 * @returns Active, expiring within 7 days, or expired.
 */
export function order_status_label(expires_at_ms: number, now: Date): "active" | "expiring within 7 days" | "expired" {
  const remaining = expires_at_ms - now.getTime();
  if (remaining <= 0) {
    return "expired";
  }
  if (remaining <= 7 * 24 * 60 * 60 * 1000) {
    return "expiring within 7 days";
  }
  return "active";
}

/**
 * Photos in a customer folder, in the order they were sent.
 *
 * @param folder - Absolute path to the customer folder.
 * @returns Photo file names, naturally sorted.
 */
export function list_inbox_photos(folder: string): string[] {
  return natural_sort(readdirSync(folder).filter(is_photo_file));
}

/**
 * Every file name in a customer folder.
 *
 * @param folder - Absolute path to the customer folder.
 * @returns File names.
 */
export function list_inbox_files(folder: string): string[] {
  return readdirSync(folder);
}
