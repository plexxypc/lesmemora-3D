"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { PhoneIcon } from "@/components/museum/icons";

function subscribe_portrait(on_change: () => void): () => void {
  const query = window.matchMedia("(orientation: portrait)");
  query.addEventListener("change", on_change);
  return () => query.removeEventListener("change", on_change);
}

function portrait_snapshot(): boolean {
  return window.matchMedia("(orientation: portrait)").matches;
}

/**
 * Asks portrait visitors to rotate, with a way to continue.
 *
 * @returns The overlay, or nothing in landscape and after dismiss.
 */
export function PortraitGate() {
  const portrait = useSyncExternalStore(subscribe_portrait, portrait_snapshot, () => false);
  const [dismissed, set_dismissed] = useState(false);
  const button_ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (portrait && !dismissed) {
      button_ref.current?.focus();
    }
  }, [portrait, dismissed]);

  if (!portrait || dismissed) {
    return null;
  }

  return (
    <div className="portrait_gate" role="dialog" aria-modal="true" aria-labelledby="rotate_title">
      <div className="portrait_card">
        <PhoneIcon />
        <h2 id="rotate_title" className="font_display">
          Rotate your phone for the best experience
        </h2>
        <p className="dedication">The museum is a hallway. It opens up in landscape.</p>
        <button ref={button_ref} type="button" className="mm_button" onClick={() => set_dismissed(true)}>
          Continue anyway
        </button>
      </div>
    </div>
  );
}
