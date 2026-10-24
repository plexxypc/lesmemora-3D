/**
 * Join class names, dropping empty values.
 *
 * @param parts - Class names or falsey skips.
 * @returns A single class attribute value.
 */
export function class_names(...parts: Array<string | false | null | undefined>): string {
  return parts.filter((part): part is string => Boolean(part)).join(" ");
}
