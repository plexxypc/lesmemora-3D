import { customAlphabet } from "nanoid";

/** URL-safe alphabet used for order slugs and photo file names. */
const slug_alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

const make_slug = customAlphabet(slug_alphabet, 12);
const make_file_name = customAlphabet(slug_alphabet, 16);

/** Slugs are 12 to 64 letters, numbers, underscores, or hyphens. Sample slugs use hyphens. */
export const slug_pattern = /^[A-Za-z0-9_-]{12,64}$/;

/**
 * Check a route param before it is used as a file name.
 *
 * @param value - Candidate slug.
 * @returns True when the slug is long enough and URL-safe.
 */
export function is_public_slug(value: string): boolean {
  return slug_pattern.test(value);
}

/**
 * Create an unguessable order slug.
 *
 * @returns A 12-character URL-safe id.
 */
export function create_order_slug(): string {
  return make_slug();
}

/**
 * Create an unguessable photo file name.
 *
 * @returns A 16-character id, without an extension.
 */
export function create_photo_name(): string {
  return make_file_name();
}
