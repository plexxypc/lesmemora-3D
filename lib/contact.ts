import { brand_name } from "./brand";

/** WhatsApp number in international form, with no plus sign. */
export const whatsapp_number = "2349033539305";

/** Leave empty until the account exists. Empty links are not rendered. */
export const instagram_url = "";

/** Leave empty until the page exists. Empty links are not rendered. */
export const facebook_url = "";

/** Leave empty until the profile exists. Empty links are not rendered. */
export const linkedin_url = "";

/** Prefill for the landing-page order button. */
export const order_message = `Hi, I'd like to order a ${brand_name} museum`;

/**
 * Build a WhatsApp click-to-chat link.
 *
 * @param message - Text placed in the chat draft.
 * @returns A `https://wa.me` URL.
 */
export function whatsapp_link(message: string): string {
  return `https://wa.me/${whatsapp_number}?text=${encodeURIComponent(message)}`;
}

/**
 * Prefill used on the paused museum page.
 *
 * @param slug - Order slug, so a reply can find the file.
 * @returns The chat draft.
 */
export function reactivate_message(slug: string): string {
  return `Hi, I'd like to reactivate my ${brand_name} museum. The link ends with ${slug}.`;
}

export const contact_platforms = ["whatsapp", "instagram", "facebook", "linkedin"] as const;

/** A platform a buyer can use to reach the team. */
export type contact_platform = (typeof contact_platforms)[number];

export interface contact_link {
  platform: contact_platform;
  label: string;
  href: string;
}

/**
 * Social profiles that have a URL. Empty strings are omitted.
 *
 * @returns Links safe to render.
 */
export function public_contact_links(): contact_link[] {
  const links: contact_link[] = [];
  if (instagram_url) {
    links.push({ platform: "instagram", label: "Instagram", href: instagram_url });
  }
  if (facebook_url) {
    links.push({ platform: "facebook", label: "Facebook", href: facebook_url });
  }
  if (linkedin_url) {
    links.push({ platform: "linkedin", label: "LinkedIn", href: linkedin_url });
  }
  return links;
}

/**
 * Platforms shown in the landing-page contact card.
 * WhatsApp is always included. A social row appears only after its URL is set.
 *
 * @returns Links a buyer can open to place an order.
 */
export function order_contact_links(): contact_link[] {
  const links: contact_link[] = [];
  if (whatsapp_number) {
    links.push({ platform: "whatsapp", label: "WhatsApp", href: whatsapp_link(order_message) });
  }
  return links.concat(public_contact_links());
}
