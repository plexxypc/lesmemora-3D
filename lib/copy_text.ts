/**
 * Copy a string from a direct user tap.
 *
 * `navigator.clipboard.writeText` runs first. If it throws, a hidden textarea
 * and `document.execCommand("copy")` are used. The caller shows the text when
 * both fail.
 *
 * @param text - Exact text to place on the clipboard.
 * @returns True when either method reports success.
 */
export async function copy_text(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return copy_with_exec_command(text);
  }
}

/**
 * Copy with a temporary textarea outside the page layout.
 *
 * @param text - Exact text to place on the clipboard.
 * @returns True when `execCommand` reports success.
 */
function copy_with_exec_command(text: string): boolean {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.setAttribute("aria-hidden", "true");
  textarea.tabIndex = -1;
  textarea.style.position = "fixed";
  textarea.style.top = "0";
  textarea.style.left = "-9999px";
  textarea.style.opacity = "0";
  let copied = false;
  try {
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  } finally {
    textarea.remove();
  }
  return copied;
}
