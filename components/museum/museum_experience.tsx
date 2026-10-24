"use client";

import dynamic from "next/dynamic";
import { useCallback, useSyncExternalStore } from "react";
import {
  read_simple_mode,
  subscribe_simple_mode,
  write_simple_mode,
} from "@/components/museum/gallery3d/gallery_state";
import { read_forced_quality, webgl_supported } from "@/components/museum/gallery3d/quality";
import { MuseumViewer } from "@/components/museum/museum_viewer";
import type { library_track, museum, theme_config } from "@/lib/types";

export interface museum_experience_props {
  museum: museum;
  theme: theme_config;
  track: library_track | null;
}

const Museum3DViewer = dynamic(() => import("@/components/museum/gallery3d/museum_3d_viewer"), {
  ssr: false,
  loading: () => (
    <div className="mm_viewer gallery3d_loading" role="status" aria-live="polite">
      <p className="font_display">Preparing the hall…</p>
      <div className="gallery3d_loading_bar" aria-hidden="true">
        <span />
      </div>
    </div>
  ),
});

/**
 * Whether this visit should use the simple viewer: the visitor chose it,
 * the address forces it, or this browser has no WebGL.
 *
 * @returns True for the simple viewer.
 */
function wants_simple(): boolean {
  return read_simple_mode() || read_forced_quality() === "simple" || !webgl_supported();
}

/**
 * Museum entry for `/m/[slug]`. Lazy-loads the 3D viewer and keeps the 2.5D viewer as the fallback.
 *
 * @param props - Museum, theme, and resolved track.
 * @returns The active viewer for this visit.
 */
export function MuseumExperience({ museum, theme, track }: museum_experience_props) {
  const simple = useSyncExternalStore(subscribe_simple_mode, wants_simple, () => false);
  const use_simple = useCallback(() => write_simple_mode(true), []);
  const use_3d = useCallback(() => write_simple_mode(false), []);

  if (simple) {
    return (
      <div className="museum_experience">
        <MuseumViewer museum={museum} theme={theme} track={track} />
        {read_forced_quality() === "simple" || !webgl_supported() ? null : (
          <button type="button" className="gallery3d_switch_back" onClick={use_3d}>
            Switch to 3D mode
          </button>
        )}
      </div>
    );
  }

  return <Museum3DViewer museum={museum} theme={theme} track={track} on_simple_mode={use_simple} />;
}
