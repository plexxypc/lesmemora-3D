"use client";

import { useSyncExternalStore } from "react";

function subscribe_query(query: string) {
  return (on_change: () => void) => {
    const list = window.matchMedia(query);
    list.addEventListener("change", on_change);
    return () => list.removeEventListener("change", on_change);
  };
}

const subscribe_motion = subscribe_query("(prefers-reduced-motion: reduce)");
const subscribe_orientation = subscribe_query("(orientation: portrait)");

/**
 * Whether the visitor asked for less motion.
 *
 * @returns True when reduced motion is preferred.
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe_motion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

/**
 * Whether the viewport is portrait.
 *
 * @returns True in portrait orientation.
 */
export function usePortrait(): boolean {
  return useSyncExternalStore(
    subscribe_orientation,
    () => window.matchMedia("(orientation: portrait)").matches,
    () => false,
  );
}

function subscribe_resize(on_change: () => void) {
  window.addEventListener("resize", on_change);
  return () => window.removeEventListener("resize", on_change);
}

/**
 * Screen shape, rounded so small resizes do not rebuild the tour.
 *
 * @returns Width over height, in steps of 0.2.
 */
export function useViewportAspect(): number {
  return useSyncExternalStore(
    subscribe_resize,
    () => Math.max(0.3, Math.round((window.innerWidth / Math.max(1, window.innerHeight)) * 5) / 5),
    () => 2,
  );
}
