/** How much the scene draws. Low skips reflections and halves particles. */
export type gallery_tier = "high" | "low";

/** A forced mode from the address, for testing: ?q=high, ?q=low, or ?q=simple. */
export type forced_quality = gallery_tier | "simple" | null;

/**
 * Whether this browser can make a WebGL context.
 *
 * @returns True when WebGL works.
 */
export function webgl_supported(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * Read a quality override from the page address.
 *
 * @returns The forced mode, or null.
 */
export function read_forced_quality(): forced_quality {
  try {
    const value = new URLSearchParams(window.location.search).get("q");
    return value === "high" || value === "low" || value === "simple" ? value : null;
  } catch {
    return null;
  }
}

/**
 * Whether the main input is a finger. Phones and tablets report a coarse pointer,
 * and iPads that pretend to be Macs still report touch points.
 *
 * @returns True on touch devices.
 */
export function is_touch_device(): boolean {
  try {
    return window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 1;
  } catch {
    return false;
  }
}

/**
 * Pick a starting tier from what the device reports.
 * Phones, tablets, and machines with few cores or little memory start low,
 * because they have far less graphics power than their screens suggest.
 * Measured speed can still move the tier later.
 *
 * @returns The starting tier.
 */
export function detect_tier(): gallery_tier {
  const forced = read_forced_quality();
  if (forced === "high" || forced === "low") {
    return forced;
  }
  const nav = navigator as Navigator & { deviceMemory?: number };
  const cores = nav.hardwareConcurrency ?? 4;
  const memory = nav.deviceMemory ?? 4;
  return is_touch_device() || cores <= 4 || memory <= 3 ? "low" : "high";
}

/** The three ways to visit a museum. */
export type experience_choice = "guided" | "explore" | "simple";

/**
 * Set to true once the 3D hall is smooth enough on phones to recommend there.
 * Until then phones are pointed at the simple version, which works everywhere.
 */
export const recommend_3d_on_touch = false;

/**
 * Which way to visit to suggest on this device.
 *
 * @param webgl - Whether the browser can show 3D.
 * @param touch - Whether this is a phone or tablet.
 * @returns The suggested choice.
 */
export function recommended_experience(webgl: boolean, touch: boolean): experience_choice {
  if (!webgl) {
    return "simple";
  }
  if (touch && !recommend_3d_on_touch) {
    return "simple";
  }
  return "guided";
}

/**
 * Longest texture side to keep on the GPU for a tier.
 *
 * @param tier - Current tier.
 * @returns Pixels.
 */
export function photo_max_px(tier: gallery_tier): number {
  return tier === "low" ? 640 : 1024;
}
