import { createHmac, scryptSync, timingSafeEqual } from "node:crypto";

/** Cookie set after the password matches. It is scoped to one museum path. */
export const gate_cookie_name = "les_memora_gate";

/** Six hours. A new password invalidates older cookies because the hash is part of the signature. */
export const gate_max_age_seconds = 60 * 60 * 6;

const hash_label = "les-memora-order-v1";

/**
 * Secret used to hash passwords and sign the gate cookie.
 * Set `ORDER_GATE_SECRET` in production. The fallback only exists so a local order can be opened.
 *
 * @returns The secret string.
 */
export function gate_secret(): string {
  const secret = process.env.ORDER_GATE_SECRET?.trim();
  return secret && secret.length > 0 ? secret : "les-memora-dev-gate";
}

/**
 * Hash a plaintext password from an order file.
 * The file keeps the plaintext. Callers drop it after this and keep the hash.
 *
 * @param password - Password typed into the order file.
 * @param slug - Order slug, so two museums can reuse a word without sharing a hash.
 * @returns A hex scrypt hash.
 */
export function hash_password(password: string, slug: string): string {
  const salt = `${hash_label}:${slug}:${gate_secret()}`;
  return scryptSync(password, salt, 32).toString("hex");
}

/**
 * Compare a submitted password with the hash taken when the order was read.
 *
 * @param password - Value from the form.
 * @param slug - Museum slug.
 * @param password_hash - Hash stored on the sealed order.
 * @returns True when the password matches.
 */
export function password_matches(password: string, slug: string, password_hash: string): boolean {
  const actual = Buffer.from(hash_password(password, slug), "hex");
  const expected = Buffer.from(password_hash, "hex");
  if (actual.length !== expected.length) {
    return false;
  }
  return timingSafeEqual(actual, expected);
}

/**
 * Sign a short-lived cookie for one museum.
 *
 * @param slug - Museum slug.
 * @param password_hash - Hash the cookie is bound to.
 * @param now - Clock used for the expiry.
 * @returns The cookie value.
 */
export function sign_gate_cookie(slug: string, password_hash: string, now: Date): string {
  const expires = Math.floor(now.getTime() / 1000) + gate_max_age_seconds;
  const body = `${slug}.${expires}`;
  const signature = createHmac("sha256", gate_secret()).update(`${body}.${password_hash}`).digest("hex");
  return `${body}.${signature}`;
}

/**
 * Check the cookie the browser sent with the museum request.
 *
 * @param value - Cookie value, when present.
 * @param slug - Museum being opened.
 * @param password_hash - Current hash. Changing the password invalidates old cookies.
 * @param now - Clock used to reject expired cookies.
 * @returns True when the cookie is intact, unexpired, and for this museum.
 */
export function cookie_grants(value: string | undefined, slug: string, password_hash: string, now: Date): boolean {
  if (!value) {
    return false;
  }
  const parts = value.split(".");
  if (parts.length !== 3) {
    return false;
  }
  const [cookie_slug, expires_text, signature] = parts;
  if (cookie_slug !== slug || !expires_text || !signature) {
    return false;
  }
  const expires = Number(expires_text);
  if (!Number.isFinite(expires) || expires * 1000 <= now.getTime()) {
    return false;
  }
  const expected = createHmac("sha256", gate_secret()).update(`${cookie_slug}.${expires_text}.${password_hash}`).digest("hex");
  const actual_buffer = Buffer.from(signature, "hex");
  const expected_buffer = Buffer.from(expected, "hex");
  if (actual_buffer.length === 0 || actual_buffer.length !== expected_buffer.length) {
    return false;
  }
  return timingSafeEqual(actual_buffer, expected_buffer);
}
