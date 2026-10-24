"use client";

import { useState, useSyncExternalStore } from "react";

function subscribe_portrait(on_change: () => void): () => void {
  const query = window.matchMedia("(orientation: portrait)");
  query.addEventListener("change", on_change);
  return () => query.removeEventListener("change", on_change);
}

function portrait_snapshot(): boolean {
  return window.matchMedia("(orientation: portrait)").matches;
}

/**
 * Soft landscape suggestion. Never blocks the museum.
 *
 * @returns A dismissible chip in portrait, or nothing in landscape.
 */
export function PortraitHint() {
  const portrait = useSyncExternalStore(subscribe_portrait, portrait_snapshot, () => false);
  const [dismissed, set_dismissed] = useState(false);

  if (!portrait || dismissed) {
    return null;
  }

  return (
    <div className="portrait_hint" role="status">
      <p>Best in landscape</p>
      <button type="button" onClick={() => set_dismissed(true)} aria-label="Dismiss landscape tip">
        Dismiss
      </button>
    </div>
  );
}
