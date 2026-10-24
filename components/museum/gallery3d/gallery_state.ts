/** Visitor movement mode for the 3D gallery. */
export type gallery_mode = "guided" | "explore";

/** Session-only preference for the simple 2.5D viewer. */
export const simple_mode_session_key = "lesmemora_simple_viewer";

const listeners = new Set<() => void>();

/**
 * Subscribe to changes in the simple-mode preference.
 *
 * @param on_change - Called after the preference changes.
 * @returns A function that removes the subscription.
 */
export function subscribe_simple_mode(on_change: () => void): () => void {
  listeners.add(on_change);
  return () => {
    listeners.delete(on_change);
  };
}

/**
 * Whether this visit asked for the simple viewer.
 *
 * @returns True when the visitor chose simple mode.
 */
export function read_simple_mode(): boolean {
  try {
    return sessionStorage.getItem(simple_mode_session_key) === "1";
  } catch {
    return false;
  }
}

/**
 * Remember the choice for this visit only.
 *
 * @param simple - True for the simple viewer.
 */
export function write_simple_mode(simple: boolean): void {
  try {
    if (simple) {
      sessionStorage.setItem(simple_mode_session_key, "1");
    } else {
      sessionStorage.removeItem(simple_mode_session_key);
    }
  } catch {
    // Private mode may block sessionStorage. The choice then lasts until reload.
  }
  listeners.forEach((listener) => listener());
}
