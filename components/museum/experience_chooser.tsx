"use client";

import { theme_css_vars } from "@/lib/themes";
import type { experience_choice } from "@/components/museum/gallery3d/quality";
import type { museum, theme_config } from "@/lib/types";

export interface experience_chooser_props {
  museum: museum;
  theme: theme_config;
  /** Whether this browser can show 3D at all. */
  webgl: boolean;
  recommended: experience_choice;
  on_choose: (choice: experience_choice) => void;
}

interface option {
  id: experience_choice;
  name: string;
  summary: string;
  note: string;
  needs_3d: boolean;
}

const options: option[] = [
  {
    id: "guided",
    name: "Guided 3D tour",
    summary: "A camera walks you through every room and pauses at each photo, date and letter. Nothing to steer. Just watch and listen.",
    note: "Best on a recent phone or a computer. This is the full experience.",
    needs_3d: true,
  },
  {
    id: "explore",
    name: "Explore in 3D",
    summary: "Walk the same 3D rooms yourself. Look around, linger where you like, and tap any picture to get close.",
    note: "Needs a recent phone or a computer. Feels best with a mouse or a fast phone.",
    needs_3d: true,
  },
  {
    id: "simple",
    name: "Simple version",
    summary: "Swipe from room to room like a gallery. The same photos, dates and letter, with less to load.",
    note: "Works on every phone, tablet and computer, even older ones or slow connections.",
    needs_3d: false,
  },
];

/**
 * The first thing a visitor sees. It asks how they want to visit and suggests one,
 * and it loads none of the 3D code, so choosing the simple version stays light.
 *
 * @param props - Museum, theme, device ability, suggestion, and the choice handler.
 * @returns The chooser.
 */
export function ExperienceChooser({ museum, theme, webgl, recommended, on_choose }: experience_chooser_props) {
  return (
    <div className="experience_chooser" style={theme_css_vars(theme)}>
      <div className="experience_inner">
        <p className="kicker">{museum.title}</p>
        <h1 className="font_display">How would you like to visit?</h1>
        <p className="experience_lead">
          Pick whichever feels right. You can change your mind at any time from the menu.
        </p>
        <ul className="experience_options">
          {options.map((entry) => {
            const disabled = entry.needs_3d && !webgl;
            return (
              <li key={entry.id}>
                <button
                  type="button"
                  className="experience_card"
                  data-recommended={entry.id === recommended}
                  disabled={disabled}
                  onClick={() => on_choose(entry.id)}
                >
                  {entry.id === recommended ? <span className="experience_badge">Suggested for this device</span> : null}
                  <strong className="font_display">{entry.name}</strong>
                  <span>{entry.summary}</span>
                  <small>{disabled ? "This browser cannot show 3D, so this one is switched off." : entry.note}</small>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="experience_foot">Turn your sound on. There is music.</p>
      </div>
    </div>
  );
}
