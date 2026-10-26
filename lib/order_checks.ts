import type { draft_order } from "./order_schema";

export interface order_problem {
  level: "error" | "warning";
  message: string;
}

/** Text the template and the tools leave behind for the owner to replace. */
export const placeholder_pattern = /\breplace (this|the)\b|lorem ipsum|\btodo\b/i;

export const photo_extensions = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".tif", ".tiff", ".avif", ".heic"] as const;

/**
 * Whether a file name looks like a photo.
 *
 * @param file_name - File name with extension.
 * @returns True for common image types.
 */
export function is_photo_file(file_name: string): boolean {
  const dot = file_name.lastIndexOf(".");
  if (dot < 0) {
    return false;
  }
  return (photo_extensions as readonly string[]).includes(file_name.slice(dot).toLowerCase());
}

/**
 * Sort photo names the way a person reads them: IMG_2 before IMG_10.
 *
 * @param names - File names.
 * @returns A new, sorted list.
 */
export function natural_sort(names: readonly string[]): string[] {
  return [...names].sort((left, right) => left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" }));
}

/**
 * Find what is wrong with a draft before it is published.
 * Errors stop publishing. Warnings are printed and the order goes ahead.
 *
 * @param draft - A draft that already passed the schema.
 * @param folder_files - Every file name in the customer's folder.
 * @returns Problems in plain words.
 */
export function find_order_problems(draft: draft_order, folder_files: readonly string[]): order_problem[] {
  const problems: order_problem[] = [];
  const error = (message: string) => problems.push({ level: "error", message });
  const warn = (message: string) => problems.push({ level: "warning", message });

  const check_text = (where: string, value: string | undefined) => {
    if (value && placeholder_pattern.test(value)) {
      error(`${where} still has template text: "${value.length > 60 ? `${value.slice(0, 57)}...` : value}"`);
    }
  };
  check_text("The title", draft.title);
  check_text("The recipient name", draft.recipient_name);
  check_text("The dedication", draft.dedication);

  const used = new Set<string>();
  let photos = 0;
  let photos_without_caption = 0;
  draft.rooms.forEach((room) => {
    room.exhibits.forEach((exhibit, index) => {
      const where = `${room.name}, item ${index + 1}`;
      check_text(`${where} (caption)`, exhibit.caption);
      check_text(`${where} (text)`, exhibit.body);
      if (exhibit.kind === "photo") {
        photos += 1;
        if (exhibit.file) {
          used.add(exhibit.file);
        }
        if (!exhibit.caption?.trim()) {
          photos_without_caption += 1;
        }
      }
      if (exhibit.kind === "letter" && (exhibit.body?.trim().length ?? 0) < 40) {
        warn(`${where}: the letter is very short.`);
      }
    });
  });

  if (photos === 0) {
    error("The order has no photos. Add photos to the customer folder, then run: npm run add_photos -- <customer_name>");
  }
  if (photos_without_caption > 0) {
    warn(`${photos_without_caption} of ${photos} photos have no caption. They will show without words.`);
  }
  const unused = folder_files.filter((name) => is_photo_file(name) && !used.has(name));
  if (unused.length > 0) {
    error(
      `${unused.length} photo${unused.length === 1 ? " is" : "s are"} in the folder but not in order.json: ${unused.join(", ")}. ` +
        "Run: npm run add_photos -- <customer_name> (or delete the extra files).",
    );
  }
  if (draft.music.type === "library") {
    warn("The music is a placeholder library track. Replace it before real customers see it, or ask for a YouTube link.");
  }
  return problems;
}
