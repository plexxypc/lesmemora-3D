"use client";

import Link from "next/link";
import type { gallery_mode } from "@/components/museum/gallery3d/gallery_state";
import { SharePanel } from "@/components/museum/share_panel";
import { badge_text } from "@/lib/brand";
import type { museum } from "@/lib/types";

export type panel_kind = "menu" | "share" | "list" | null;
export type stop_action = "letter" | "finale" | null;

export interface gallery_hud_props {
  title: string;
  rooms: { id: string; name: string }[];
  active_room: number;
  mode: gallery_mode;
  playing: boolean;
  progress: number;
  at_stop: stop_action;
  visible: boolean;
  has_letters: boolean;
  on_mode: (mode: gallery_mode) => void;
  on_toggle_play: () => void;
  on_previous: () => void;
  on_next: () => void;
  on_room: (index: number) => void;
  on_restart: () => void;
  on_open_letter: () => void;
  on_panel: (panel: panel_kind) => void;
  on_walk: (direction: number) => void;
}

/**
 * Overlay controls. In the guided walk they fade away after a few seconds
 * and return with a tap, so the hall stays in view.
 *
 * @param props - Playback state and handlers.
 * @returns The HUD.
 */
export function GalleryHud({
  title,
  rooms,
  active_room,
  mode,
  playing,
  progress,
  at_stop,
  visible,
  has_letters,
  on_mode,
  on_toggle_play,
  on_previous,
  on_next,
  on_room,
  on_restart,
  on_open_letter,
  on_panel,
  on_walk,
}: gallery_hud_props) {
  const room = rooms[active_room];
  const ended = progress >= 0.999;
  const faded = !visible && mode === "guided" && playing;

  return (
    <div className="gallery3d_hud" data-faded={faded ? "true" : "false"}>
      <div className="gallery3d_top">
        <div className="gallery3d_place">
          <Link className="gallery3d_exit" href="/" aria-label="Leave the museum">
            Exit
          </Link>
          <p className="gallery3d_room" aria-live="polite">
            <span className="font_display">{room?.name ?? title}</span>
          </p>
        </div>
        <div className="gallery3d_top_actions">
          <button type="button" className="gallery3d_chip" onClick={() => on_panel("menu")}>
            Menu
          </button>
        </div>
      </div>

      <div className="gallery3d_bottom">
        <div className="room_dots" role="group" aria-label="Rooms">
          {rooms.map((entry, index) => (
            <button
              key={entry.id}
              type="button"
              aria-label={`Go to ${entry.name}`}
              aria-current={index === active_room}
              onClick={() => on_room(index)}
            />
          ))}
        </div>

        {at_stop === "letter" && has_letters ? (
          <button type="button" className="mm_button gallery3d_cta" onClick={on_open_letter}>
            Open the letter
          </button>
        ) : null}
        {at_stop === "finale" || ended ? (
          <div className="gallery3d_cta_row">
            <button type="button" className="mm_button gallery3d_cta" onClick={() => on_panel("share")}>
              Share this museum
            </button>
            <button type="button" className="mm_button mm_button_quiet gallery3d_cta" onClick={on_restart}>
              Walk again
            </button>
          </div>
        ) : null}

        {mode === "guided" ? (
          <div className="gallery3d_controls">
            <button type="button" className="gallery3d_round" onClick={on_previous} aria-label="Previous stop">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path d="M15 5 8 12l7 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button type="button" className="gallery3d_round gallery3d_play" onClick={on_toggle_play} aria-label={playing ? "Pause the walk" : ended ? "Replay the walk" : "Continue the walk"}>
              {playing ? (
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                  <path d="M8 5v14M16 5v14" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                  <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
                </svg>
              )}
            </button>
            <button type="button" className="gallery3d_round" onClick={on_next} aria-label="Next stop">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path d="m9 5 7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button type="button" className="gallery3d_chip" onClick={() => on_mode("explore")}>
              Explore on my own
            </button>
            <div className="gallery3d_progress" aria-hidden="true">
              <span style={{ width: `${Math.round(Math.min(1, progress) * 100)}%` }} />
            </div>
          </div>
        ) : (
          <div className="gallery3d_controls">
            <button type="button" className="gallery3d_chip" onClick={() => on_mode("guided")}>
              Back to the guided walk
            </button>
            <p className="gallery3d_hint">Drag to look. Hold the arrows to walk, or use W and S.</p>
            <div className="gallery3d_walk">
              <button
                type="button"
                className="gallery3d_round"
                aria-label="Walk forward (hold)"
                onPointerDown={() => on_walk(1)}
                onPointerUp={() => on_walk(0)}
                onPointerLeave={() => on_walk(0)}
                onPointerCancel={() => on_walk(0)}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <path d="m6 15 6-6 6 6" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                type="button"
                className="gallery3d_round"
                aria-label="Walk backward (hold)"
                onPointerDown={() => on_walk(-1)}
                onPointerUp={() => on_walk(0)}
                onPointerLeave={() => on_walk(0)}
                onPointerCancel={() => on_walk(0)}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export interface menu_sheet_props {
  panel: panel_kind;
  museum: museum;
  on_panel: (panel: panel_kind) => void;
  on_simple_mode: () => void;
  on_change_experience: () => void;
  on_close: () => void;
}

/**
 * Menu and share sheet.
 *
 * @param props - Which panel is open and handlers.
 * @returns The sheet, or nothing when no panel is open.
 */
export function MenuSheet({ panel, museum, on_panel, on_simple_mode, on_change_experience, on_close }: menu_sheet_props) {
  if (panel !== "menu" && panel !== "share") {
    return null;
  }
  return (
    <div className="gallery3d_sheet_backdrop" onClick={on_close}>
      <div className="gallery3d_sheet" role="dialog" aria-modal="true" aria-label={panel === "share" ? "Share" : "Menu"} onClick={(event) => event.stopPropagation()}>
        <div className="gallery3d_sheet_head">
          <h2 className="font_display">{panel === "share" ? "Share this museum" : "Menu"}</h2>
          <button type="button" className="gallery3d_chip" onClick={on_close} autoFocus>
            Close
          </button>
        </div>
        {panel === "share" ? (
          <SharePanel museum={museum} />
        ) : (
          <div className="gallery3d_menu_list">
            <button type="button" className="mm_button mm_button_quiet" onClick={() => on_panel("list")}>
              See every exhibit as a list
            </button>
            <button type="button" className="mm_button mm_button_quiet" onClick={() => on_panel("share")}>
              Share this museum
            </button>
            <button type="button" className="mm_button mm_button_quiet" onClick={on_change_experience}>
              Choose another way to visit
            </button>
            <button type="button" className="mm_button mm_button_quiet" onClick={on_simple_mode}>
              Switch to the simple version
            </button>
            <p className="gallery3d_menu_links">
              <Link href="/credits">Music credits</Link>
              <Link href="/report">Report this page</Link>
              <Link href="/privacy">Privacy</Link>
            </p>
            {museum.show_badge ? <p className="made_with">{badge_text}</p> : null}
          </div>
        )}
      </div>
    </div>
  );
}
