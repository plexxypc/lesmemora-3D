import { mkdirSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

/** Longest side of a published photo, in pixels. */
export const photo_max_edge = 1600;

/** WebP quality used for published photos. */
export const photo_quality = 80;

export interface processed_photo {
  width: number;
  height: number;
  bytes: number;
}

/**
 * Resize a photo, apply its orientation, and write a WebP with no EXIF or GPS.
 *
 * @param source_path - Original file in the inbox.
 * @param destination_path - WebP path under `public/o/<slug>/`.
 * @returns The saved size.
 */
export async function process_photo(source_path: string, destination_path: string): Promise<processed_photo> {
  mkdirSync(join(destination_path, ".."), { recursive: true });
  const image = sharp(source_path, { failOn: "error" }).rotate();
  try {
    const saved = await image
      .resize({
        width: photo_max_edge,
        height: photo_max_edge,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: photo_quality })
      .toFile(destination_path);
    return { width: saved.width, height: saved.height, bytes: saved.size };
  } finally {
    image.destroy();
  }
}
