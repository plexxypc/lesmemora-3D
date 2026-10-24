import { share_description } from "./brand";
import type { museum } from "./types";

/** Public metadata for a museum link. Captions and letter text stay out of it. */
export interface public_museum_meta {
  title: string;
  description: string;
  image: string;
}

/**
 * Build the title, description, and image used for Open Graph and Twitter cards.
 * The description is generic on purpose so private captions are not embedded in previews.
 *
 * @param museum - Museum being shared.
 * @returns Safe share metadata.
 */
export function public_museum_metadata(museum: Pick<museum, "title" | "cover_image">): public_museum_meta {
  return {
    title: museum.title,
    description: share_description,
    image: museum.cover_image,
  };
}

/**
 * Text sent with the share sheet and the fallback share links.
 *
 * @param museum - Museum being shared.
 * @returns `<title> - A private memory museum on Les Memora`.
 */
export function share_message(museum: Pick<museum, "title">): string {
  return `${museum.title} - ${share_description}`;
}
