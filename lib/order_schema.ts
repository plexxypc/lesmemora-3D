import { ZodError, z } from "zod";
import { load_library_tracks } from "./music";
import { apple_embed_url, spotify_embed_url, youtube_video_id } from "./music_links";
import { get_plan } from "./plans";
import { slug_pattern } from "./slug";
import { list_themes } from "./themes";
import { exhibit_kinds, room_types, type exhibit_kind, type room_type } from "./types";

/** Plan stored on a hand-built order. Paid covers every paid price. */
export const order_plans = ["free", "paid"] as const;

export type order_plan = (typeof order_plans)[number];

/** Music block written in an order file. `type` matches the draft the operator fills in. */
export type order_music =
  | { type: "library"; track_id: string }
  | { type: "youtube"; url: string; title?: string }
  | { type: "spotify"; embed_url: string; title?: string }
  | { type: "apple"; embed_url: string; title?: string };

export interface draft_exhibit {
  kind: exhibit_kind;
  file?: string;
  caption?: string;
  body?: string;
  date?: string;
}

export interface draft_room {
  type: room_type;
  name: string;
  exhibits: draft_exhibit[];
}

/** The inbox file, before photos are renamed and a slug is assigned. */
export interface draft_order {
  theme_id: string;
  title: string;
  recipient_name: string;
  dedication: string;
  music: order_music;
  rooms: draft_room[];
  plan: order_plan;
  show_badge?: boolean;
  expires_at?: string;
  password?: string;
  notes?: string;
}

export interface published_exhibit {
  id: string;
  kind: exhibit_kind;
  image_src: string | null;
  caption: string | null;
  body: string | null;
  date: string | null;
  position: number;
}

export interface published_room {
  id: string;
  type: room_type;
  name: string;
  position: number;
  exhibits: published_exhibit[];
}

/** One file in `/orders`. `password` and `notes` never reach the browser. */
export interface published_order {
  slug: string;
  theme_id: string;
  title: string;
  recipient_name: string;
  dedication: string;
  music: order_music;
  rooms: published_room[];
  plan: order_plan;
  show_badge: boolean;
  created_at: string;
  expires_at: string;
  password?: string;
  notes?: string;
}

const date_only = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Accept a calendar date or a full ISO timestamp.
 *
 * @param value - Text from the order file.
 * @returns True when the value is a real date.
 */
export function is_iso_date(value: string): boolean {
  if (date_only.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
  }
  return /^\d{4}-\d{2}-\d{2}T/.test(value) && !Number.isNaN(Date.parse(value));
}

/**
 * Moment an order stops opening.
 * A calendar date stays available through the end of that UTC day.
 *
 * @param value - `expires_at` from the order file.
 * @returns Unix milliseconds.
 */
export function expires_at_ms(value: string): number {
  if (date_only.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return Date.UTC(year, month - 1, day, 23, 59, 59, 999);
  }
  return Date.parse(value);
}

/**
 * How many photos the plan allows. Limits live in `lib/plans.ts`.
 *
 * @param plan - Free or paid.
 * @returns The photo cap.
 */
export function photo_limit_for_order(plan: order_plan): number {
  if (plan === "free") {
    return get_plan("free")?.photo_limit ?? 20;
  }
  return get_plan("keep_1_year")?.photo_limit ?? 100;
}

/**
 * Default number of days a new order stays open.
 *
 * @param plan - Free or paid.
 * @returns 7 for free and 365 for paid, unless the plan config says otherwise.
 */
export function default_live_days(plan: order_plan): number {
  if (plan === "free") {
    return get_plan("free")?.live_days ?? 7;
  }
  return get_plan("keep_1_year")?.live_days ?? 365;
}

const iso_date = z.string().refine(is_iso_date, "Use an ISO date such as 2026-10-24 or a full timestamp.");
const exhibit_date = z.string().regex(date_only, "Use YYYY-MM-DD.");

const music_schema = z
  .discriminatedUnion("type", [
    z.strictObject({ type: z.literal("library"), track_id: z.string().trim().min(1) }),
    z.strictObject({
      type: z.literal("youtube"),
      url: z.string().trim().min(1),
      title: z.string().trim().min(1).max(120).optional(),
    }),
    z.strictObject({
      type: z.literal("spotify"),
      embed_url: z.string().trim().min(1),
      title: z.string().trim().min(1).max(120).optional(),
    }),
    z.strictObject({
      type: z.literal("apple"),
      embed_url: z.string().trim().min(1),
      title: z.string().trim().min(1).max(120).optional(),
    }),
  ])
  .superRefine((music, context) => {
    if (music.type === "library") {
      const known = load_library_tracks().some((track) => track.id === music.track_id);
      if (!known) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["track_id"],
          message: `Unknown library track "${music.track_id}". Use an id from public/music/tracks.json.`,
        });
      }
    }
    if (music.type === "youtube" && !youtube_video_id(music.url)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["url"],
        message: "Use an 11-character YouTube id or a youtube.com / youtu.be link.",
      });
    }
    if (music.type === "spotify" && !spotify_embed_url(music.embed_url)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["embed_url"],
        message: "Use an open.spotify.com embed, track, album, playlist, or episode link.",
      });
    }
    if (music.type === "apple" && !apple_embed_url(music.embed_url)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["embed_url"],
        message: "Use a music.apple.com link or an embed.music.apple.com link.",
      });
    }
  });

const draft_exhibit_schema = z
  .strictObject({
    kind: z.enum(exhibit_kinds),
    file: z.string().trim().min(1).optional(),
    caption: z.string().max(400).optional(),
    body: z.string().max(8000).optional(),
    date: exhibit_date.optional(),
  })
  .superRefine((exhibit, context) => {
    add_exhibit_issues(exhibit, context);
    if (exhibit.kind === "photo" && !exhibit.file) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["file"], message: "Name the photo file in this folder." });
    }
  });

const published_exhibit_schema = z
  .strictObject({
    id: z.string().trim().min(1).max(80),
    kind: z.enum(exhibit_kinds),
    image_src: z.string().nullable(),
    caption: z.string().max(400).nullable(),
    body: z.string().max(8000).nullable(),
    date: exhibit_date.nullable(),
    position: z.number().int().nonnegative(),
  })
  .superRefine((exhibit, context) => {
    add_exhibit_issues(
      {
        kind: exhibit.kind,
        caption: exhibit.caption ?? undefined,
        body: exhibit.body ?? undefined,
        date: exhibit.date ?? undefined,
      },
      context,
    );
  });

const draft_room_schema = z.strictObject({
  type: z.enum(room_types),
  name: z.string().trim().min(1).max(80),
  exhibits: z.array(draft_exhibit_schema),
});

const published_room_schema = z.strictObject({
  id: z.string().trim().min(1).max(80),
  type: z.enum(room_types),
  name: z.string().trim().min(1).max(80),
  position: z.number().int().nonnegative(),
  exhibits: z.array(published_exhibit_schema),
});

const shared_order_fields = {
  theme_id: z.string().trim().min(1),
  title: z.string().trim().min(1).max(120),
  recipient_name: z.string().trim().min(1).max(80),
  dedication: z.string().trim().min(1).max(400),
  music: music_schema,
  plan: z.enum(order_plans),
  show_badge: z.boolean().optional(),
  expires_at: iso_date.optional(),
  password: z.string().max(80).optional(),
  notes: z.string().max(2000).optional(),
};

const draft_order_schema = z
  .strictObject({
    ...shared_order_fields,
    rooms: z.array(draft_room_schema).min(1),
  })
  .superRefine((order, context) => {
    add_order_issues(order.theme_id, order.plan, order.rooms, context);
  });

const published_order_schema = z
  .strictObject({
    slug: z.string().regex(slug_pattern, "Use 12 to 64 URL-safe characters."),
    theme_id: shared_order_fields.theme_id,
    title: shared_order_fields.title,
    recipient_name: shared_order_fields.recipient_name,
    dedication: shared_order_fields.dedication,
    music: music_schema,
    rooms: z.array(published_room_schema).min(1),
    plan: shared_order_fields.plan,
    show_badge: z.boolean(),
    created_at: iso_date,
    expires_at: iso_date,
    password: shared_order_fields.password,
    notes: shared_order_fields.notes,
  })
  .superRefine((order, context) => {
    add_order_issues(order.theme_id, order.plan, order.rooms, context);
    const seen = new Set<string>();
    order.rooms.forEach((room, room_index) => {
      if (room.position !== room_index) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["rooms", room_index, "position"],
          message: `Expected ${room_index} so the rooms stay in order.`,
        });
      }
      remember_id(seen, room.id, ["rooms", room_index, "id"], context);
      room.exhibits.forEach((exhibit, exhibit_index) => {
        if (exhibit.position !== exhibit_index) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["rooms", room_index, "exhibits", exhibit_index, "position"],
            message: `Expected ${exhibit_index} so the exhibits stay in order.`,
          });
        }
        remember_id(seen, exhibit.id, ["rooms", room_index, "exhibits", exhibit_index, "id"], context);
        if (exhibit.kind === "photo") {
          const pattern = new RegExp(`^/o/${order.slug}/[A-Za-z0-9_-]{12,}\\.webp$`);
          if (!exhibit.image_src || !pattern.test(exhibit.image_src)) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["rooms", room_index, "exhibits", exhibit_index, "image_src"],
              message: "Point this at the WebP saved under /o/<slug>/ with an unguessable file name.",
            });
          }
        } else if (exhibit.image_src) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["rooms", room_index, "exhibits", exhibit_index, "image_src"],
            message: "Only photo exhibits use an image.",
          });
        }
      });
    });
    if (expires_at_ms(order.expires_at) <= Date.parse(order.created_at)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["expires_at"],
        message: "The expiry has to be after the day the order was created.",
      });
    }
  });

/**
 * Turn a Zod error into one line per field.
 *
 * @param error - Failed parse.
 * @returns Lines such as `rooms.0.name: Required`.
 */
export function format_order_issues(error: ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.map(String).join(".") : "order";
      return `${path}: ${issue.message}`;
    })
    .join("\n");
}

/**
 * Validate the inbox draft.
 *
 * @param input - Parsed JSON.
 * @returns The draft.
 */
export function parse_draft_order(input: unknown): draft_order {
  const result = draft_order_schema.safeParse(input);
  if (!result.success) {
    throw new Error(`Order draft\n${format_order_issues(result.error)}`);
  }
  return result.data;
}

/**
 * Validate a published order file.
 *
 * @param input - Parsed JSON.
 * @returns The order, still containing the plaintext password and notes.
 */
export function parse_published_order(input: unknown): published_order {
  const result = published_order_schema.safeParse(input);
  if (!result.success) {
    throw new Error(`Order file\n${format_order_issues(result.error)}`);
  }
  return result.data;
}

function add_exhibit_issues(
  exhibit: { kind: exhibit_kind; caption?: string; body?: string; date?: string },
  context: z.RefinementCtx,
): void {
  if (exhibit.kind === "letter" && !exhibit.body?.trim()) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["body"], message: "Write the letter." });
  }
  if (exhibit.kind === "note" && !exhibit.body?.trim()) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["body"], message: "Write the closing note." });
  }
  if (exhibit.kind === "milestone" && !exhibit.caption?.trim()) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["caption"], message: "Name this date." });
  }
  if (exhibit.kind === "milestone" && !exhibit.date) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["date"], message: "Add the date as YYYY-MM-DD." });
  }
}

function add_order_issues(
  theme_id: string,
  plan: order_plan,
  rooms: Array<{ type: room_type; exhibits: Array<{ kind: exhibit_kind }> }>,
  context: z.RefinementCtx,
): void {
  if (!list_themes().some((theme) => theme.id === theme_id)) {
    const names = list_themes()
      .map((theme) => theme.id)
      .join(", ");
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["theme_id"],
      message: `Unknown theme "${theme_id}". Use one of: ${names}.`,
    });
  }
  const counts = new Map<room_type, number>();
  rooms.forEach((room) => counts.set(room.type, (counts.get(room.type) ?? 0) + 1));
  if (rooms[0]?.type !== "lobby") {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["rooms"], message: "The first room must be the lobby." });
  }
  if (rooms[rooms.length - 1]?.type !== "finale") {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["rooms"], message: "The last room must be the finale." });
  }
  if ((counts.get("lobby") ?? 0) !== 1) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["rooms"], message: "Include one lobby." });
  }
  if ((counts.get("finale") ?? 0) !== 1) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["rooms"], message: "Include one finale." });
  }
  const galleries = counts.get("gallery") ?? 0;
  if (galleries < 1 || galleries > 5) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["rooms"],
      message: "Include 1 to 5 gallery rooms.",
    });
  }
  if ((counts.get("timeline") ?? 0) > 1 || (counts.get("letter") ?? 0) > 1) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["rooms"],
      message: "Use at most one timeline and one letter room.",
    });
  }
  const photos = rooms.reduce((sum, room) => sum + room.exhibits.filter((exhibit) => exhibit.kind === "photo").length, 0);
  const limit = photo_limit_for_order(plan);
  if (photos > limit) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["rooms"],
      message: `The ${plan} plan allows ${limit} photos. This order has ${photos}.`,
    });
  }
}

function remember_id(seen: Set<string>, id: string, path: (string | number)[], context: z.RefinementCtx): void {
  if (seen.has(id)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path, message: `Duplicate id "${id}".` });
    return;
  }
  seen.add(id);
}
