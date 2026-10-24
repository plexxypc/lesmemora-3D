import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { apple_embed_url, spotify_embed_url, youtube_video_id } from "./music_links";
import { cookie_grants, hash_password } from "./order_gate";
import {
  expires_at_ms,
  parse_published_order,
  type order_music,
  type published_order,
  type published_room,
} from "./order_schema";
import { is_public_slug } from "./slug";
import type { exhibit, museum, music_config, room } from "./types";

/**
 * A published order with the plaintext password and the private notes removed.
 * `password_hash` stays on the server and is never passed to the viewer.
 */
export interface sealed_order {
  slug: string;
  theme_id: string;
  title: string;
  recipient_name: string;
  dedication: string;
  music: order_music;
  rooms: published_room[];
  plan: published_order["plan"];
  show_badge: boolean;
  created_at: string;
  expires_at: string;
  password_hash: string | null;
}

/** What the museum route is allowed to render. */
export type museum_access =
  | { status: "open"; museum: museum }
  | { status: "sample"; museum: museum }
  | { status: "paused"; slug: string }
  | { status: "locked"; slug: string; title: string; theme_id: string }
  | { status: "missing" };

/**
 * Folder of published order files. The repo is private; the files deploy with the site.
 *
 * @returns Absolute path to `/orders`.
 */
export function orders_directory(): string {
  return join(process.cwd(), "orders");
}

/**
 * Read one order, hash its password, and drop notes.
 *
 * @param slug - URL slug.
 * @returns The sealed order, or null when no file exists.
 */
export function load_sealed_order(slug: string): sealed_order | null {
  const path = order_file_path(slug);
  if (!path || !existsSync(path)) {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8")) as unknown;
  } catch {
    throw new Error(`orders/${slug}.json is not valid JSON.`);
  }
  return seal_order(parse_published_order(parsed));
}

/**
 * True when an order file is on disk. This does not read the file body.
 *
 * @param slug - URL slug.
 * @returns Whether `/orders/<slug>.json` exists.
 */
export function order_file_exists(slug: string): boolean {
  const path = order_file_path(slug);
  return path !== null && existsSync(path);
}

/**
 * Replace the plaintext password with a hash and remove internal notes.
 *
 * @param order - Validated order file.
 * @returns A server-only order.
 */
export function seal_order(order: published_order): sealed_order {
  const password = order.password?.trim() ?? "";
  return {
    slug: order.slug,
    theme_id: order.theme_id,
    title: order.title,
    recipient_name: order.recipient_name,
    dedication: order.dedication,
    music: order.music,
    rooms: order.rooms,
    plan: order.plan,
    show_badge: order.show_badge,
    created_at: order.created_at,
    expires_at: order.expires_at,
    password_hash: password ? hash_password(password, order.slug) : null,
  };
}

/**
 * Decide whether a visitor may see the rooms.
 * Expired and locked results carry no exhibits, dedication, notes, or photos.
 *
 * @param order - Sealed order.
 * @param now - Request time.
 * @param cookie_value - Gate cookie, when the browser sent one.
 * @returns The view the page is allowed to render.
 */
export function decide_access(order: sealed_order, now: Date, cookie_value: string | undefined): museum_access {
  if (expires_at_ms(order.expires_at) <= now.getTime()) {
    return { status: "paused", slug: order.slug };
  }
  if (order.password_hash && !cookie_grants(cookie_value, order.slug, order.password_hash, now)) {
    return { status: "locked", slug: order.slug, title: order.title, theme_id: order.theme_id };
  }
  return { status: "open", museum: museum_from_order(order) };
}

/**
 * Build the viewer model. Notes and the password hash are not copied.
 *
 * @param order - Sealed order that has already passed expiry and password checks.
 * @returns A museum the viewer can render.
 */
export function museum_from_order(order: sealed_order): museum {
  const rooms = order.rooms.map(room_from_order);
  const cover = rooms.flatMap((room) => room.exhibits).find((exhibit) => exhibit.image_src)?.image_src;
  return {
    id: order.slug,
    slug: order.slug,
    theme_id: order.theme_id,
    title: order.title,
    recipient_name: order.recipient_name,
    dedication: order.dedication,
    music: music_from_order(order.music),
    rooms,
    show_badge: order.show_badge,
    cover_image: cover ?? `/samples/${order.theme_id}/cover.png`,
  };
}

/**
 * Map an order music block onto the player config.
 *
 * @param music - Validated music block.
 * @returns Player config. Library and YouTube are playable. Spotify and Apple stay embeds.
 */
export function music_from_order(music: order_music): music_config {
  if (music.type === "library") {
    return { source: "library", track_id: music.track_id };
  }
  if (music.type === "youtube") {
    const video_id = youtube_video_id(music.url);
    if (!video_id) {
      throw new Error("The YouTube link on this order could not be read.");
    }
    return { source: "youtube", video_id, title: music.title ?? "YouTube" };
  }
  if (music.type === "spotify") {
    const embed_url = spotify_embed_url(music.embed_url);
    if (!embed_url) {
      throw new Error("The Spotify link on this order could not be read.");
    }
    return { source: "spotify", embed_url, title: music.title ?? "Spotify" };
  }
  const embed_url = apple_embed_url(music.embed_url);
  if (!embed_url) {
    throw new Error("The Apple Music link on this order could not be read.");
  }
  return { source: "apple", embed_url, title: music.title ?? "Apple Music" };
}

/**
 * Resolve a slug to a path inside `/orders`, or null when the slug is unsafe.
 *
 * @param slug - URL slug.
 * @returns Absolute JSON path, or null.
 */
export function order_file_path(slug: string): string | null {
  if (!is_public_slug(slug)) {
    return null;
  }
  const root = resolve(orders_directory());
  const path = resolve(root, `${slug}.json`);
  const from_root = relative(root, path);
  if (from_root.startsWith("..") || isAbsolute(from_root) || from_root.includes(sep)) {
    return null;
  }
  return path;
}

function room_from_order(room: published_room): room {
  const exhibits: exhibit[] = room.exhibits.map((exhibit) => ({
    id: exhibit.id,
    kind: exhibit.kind,
    image_key: null,
    image_src: exhibit.image_src,
    caption: exhibit.caption,
    body: exhibit.body,
    date: exhibit.date,
    position: exhibit.position,
  }));
  return {
    id: room.id,
    type: room.type,
    name: room.name,
    position: room.position,
    exhibits,
  };
}
