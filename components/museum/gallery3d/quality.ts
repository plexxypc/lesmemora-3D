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
 * Pick a starting tier from what the device reports.
 * Few cores or little memory start low. Measured speed can still move it later.
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
  return cores <= 4 || memory <= 3 ? "low" : "high";
}

/**
 * Longest texture side to keep on the GPU for a tier.
 *
 * @param tier - Current tier.
 * @returns Pixels.
 */
export function photo_max_px(tier: gallery_tier): number {
  return tier === "low" ? 768 : 1024;
}
