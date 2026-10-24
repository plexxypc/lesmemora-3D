import { default_live_days, type draft_order, type published_order } from "./order_schema";

export interface build_order_input {
  draft: draft_order;
  slug: string;
  created_at: Date;
  /** Public path for a photo file name from the inbox. */
  image_for_file: (file_name: string) => string;
}

/**
 * Turn a filled-in draft into the JSON written to `/orders`.
 * Photo paths come from the image step. The plaintext password is copied through
 * and hashed later, when the site reads the file.
 *
 * @param input - Draft, slug, clock, and photo paths.
 * @returns A published order.
 */
export function build_published_order(input: build_order_input): published_order {
  const { draft, slug, created_at } = input;
  const password = draft.password?.trim() ?? "";
  const order: published_order = {
    slug,
    theme_id: draft.theme_id,
    title: draft.title,
    recipient_name: draft.recipient_name,
    dedication: draft.dedication,
    music: draft.music,
    plan: draft.plan,
    show_badge: draft.show_badge ?? draft.plan === "free",
    created_at: created_at.toISOString(),
    expires_at: draft.expires_at ?? default_expires_at(draft.plan, created_at),
    rooms: draft.rooms.map((room, room_index) => ({
      id: `${slug}-room-${room_index}`,
      type: room.type,
      name: room.name,
      position: room_index,
      exhibits: room.exhibits.map((exhibit, exhibit_index) => ({
        id: `${slug}-x-${room_index}-${exhibit_index}`,
        kind: exhibit.kind,
        image_src: exhibit.kind === "photo" && exhibit.file ? input.image_for_file(exhibit.file) : null,
        caption: exhibit.caption?.trim() ? exhibit.caption.trim() : null,
        body: exhibit.body?.trim() ? exhibit.body.trim() : null,
        date: exhibit.date ?? null,
        position: exhibit_index,
      })),
    })),
  };
  if (password) {
    order.password = password;
  }
  if (draft.notes?.trim()) {
    order.notes = draft.notes.trim();
  }
  return order;
}

/**
 * Default expiry. Free orders last 7 days. Paid orders last one calendar year.
 * A date in the draft replaces this.
 *
 * @param plan - Free or paid.
 * @param created_at - Creation time.
 * @returns An ISO timestamp.
 */
export function default_expires_at(plan: draft_order["plan"], created_at: Date): string {
  const expires = new Date(created_at.getTime());
  if (plan === "paid") {
    expires.setUTCFullYear(expires.getUTCFullYear() + 1);
    return expires.toISOString();
  }
  expires.setUTCDate(expires.getUTCDate() + default_live_days("free"));
  return expires.toISOString();
}
