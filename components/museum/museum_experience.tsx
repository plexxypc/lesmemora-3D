"use client";

import dynamic from "next/dynamic";
import { useCallback, useState, useSyncExternalStore } from "react";
import { ExperienceChooser } from "@/components/museum/experience_chooser";
import {
  is_touch_device,
  read_forced_quality,
  recommended_experience,
  webgl_supported,
  type experience_choice,
} from "@/components/museum/gallery3d/quality";
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

function subscribe_nothing(): () => void {
  return () => {};
}

/**
 * What this device can do, as one short string so the snapshot stays stable:
 * "<webgl 0/1><touch 0/1><forced simple 0/1>".
 *
 * @returns The device hints.
 */
function read_device(): string {
  return `${webgl_supported() ? 1 : 0}${is_touch_device() ? 1 : 0}${read_forced_quality() === "simple" ? 1 : 0}`;
}

/**
 * Museum entry for `/m/[slug]`.
 * It first asks how the visitor wants to explore. The 3D code is only downloaded when
 * a 3D option is chosen. The simple version is the fallback for any device.
 *
 * @param props - Museum, theme, and resolved track.
 * @returns The chooser, then the chosen viewer.
 */
export function MuseumExperience({ museum, theme, track }: museum_experience_props) {
  const device = useSyncExternalStore(subscribe_nothing, read_device, () => "100");
  const webgl = device[0] === "1";
  const touch = device[1] === "1";
  const forced_simple = device[2] === "1";
  const [choice, set_choice] = useState<experience_choice | null>(null);
  const choose_again = useCallback(() => set_choice(null), []);
  const use_simple = useCallback(() => set_choice("simple"), []);

  const active = choice ?? (forced_simple ? "simple" : null);

  if (active === null) {
    return (
      <ExperienceChooser
        museum={museum}
        theme={theme}
        webgl={webgl}
        recommended={recommended_experience(webgl, touch)}
        on_choose={set_choice}
      />
    );
  }

  if (active === "simple") {
    return (
      <div className="museum_experience">
        <MuseumViewer museum={museum} theme={theme} track={track} />
        <button type="button" className="change_experience" onClick={choose_again}>
          Change how I visit
        </button>
      </div>
    );
  }

  return (
    <Museum3DViewer
      museum={museum}
      theme={theme}
      track={track}
      start_mode={active}
      on_simple_mode={use_simple}
      on_change_experience={choose_again}
    />
  );
}
