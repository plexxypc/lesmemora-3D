"use client";

import { useState } from "react";
import { SharePanel } from "@/components/museum/share_panel";
import { badge_text } from "@/lib/brand";
import type { museum, room, theme_config } from "@/lib/types";

export interface finale_room_props {
  museum: museum;
  room: room;
  theme: theme_config;
}

/**
 * Closing note, share controls, the free-plan badge, and a video-export stub.
 *
 * @param props - Museum, finale room, and theme fallback copy.
 * @returns The last room.
 */
export function FinaleRoom({ museum, room, theme }: finale_room_props) {
  const note = room.exhibits.find((exhibit) => exhibit.kind === "note");
  const closing = note?.body ?? theme.default_copy.closing;
  const [export_note, set_export_note] = useState<string | null>(null);

  return (
    <div className="finale_copy">
      <p className="kicker">The end of the hall</p>
      <h2 id={`${room.id}-title`}>{room.name}</h2>
      <p className="closing_line">{closing}</p>
      <SharePanel museum={museum} />
      <div className="finale_actions">
        <button
          type="button"
          className="mm_button mm_button_quiet"
          onClick={() =>
            set_export_note(
              "Video export arrives in a later update. It will be paid-only, recorded on this phone, in vertical 9:16 or landscape 16:9.",
            )
          }
        >
          Export video
        </button>
      </div>
      {export_note ? (
        <p className="hint" role="status">
          {export_note}
        </p>
      ) : null}
      {museum.show_badge ? <p className="made_with">{badge_text}</p> : null}
    </div>
  );
}
