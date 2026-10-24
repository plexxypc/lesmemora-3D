"use client";

import { MotionConfig } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FinaleRoom } from "@/components/museum/finale_room";
import { GalleryRoom } from "@/components/museum/gallery_room";
import { LetterRoom } from "@/components/museum/letter_room";
import { LobbyRoom } from "@/components/museum/lobby_room";
import { MusicPlayer, type music_player_handle } from "@/components/museum/music_player";
import { PortraitHint } from "@/components/museum/portrait_hint";
import { RoomShell } from "@/components/museum/room_shell";
import { TimelineRoom } from "@/components/museum/timeline_room";
import { ViewerChrome } from "@/components/museum/viewer_chrome";
import { image_mode_for, ordered_rooms } from "@/lib/panels";
import { theme_css_vars } from "@/lib/themes";
import type { library_track, museum, theme_config } from "@/lib/types";

export interface museum_viewer_props {
  museum: museum;
  theme: theme_config;
  track: library_track | null;
}

/**
 * Horizontal walk-through. Music starts when the visitor taps Enter.
 *
 * @param props - Museum, its theme, and the resolved library track.
 * @returns The full-screen corridor.
 */
export function MuseumViewer({ museum, theme, track }: museum_viewer_props) {
  const rooms = useMemo(() => ordered_rooms(museum), [museum]);
  const scroller_ref = useRef<HTMLDivElement>(null);
  const player_ref = useRef<music_player_handle | null>(null);
  const [active_index, set_active_index] = useState(0);

  const scroll_to = useCallback((index: number) => {
    const scroller = scroller_ref.current;
    if (!scroller) {
      return;
    }
    const next = Math.max(0, Math.min(rooms.length - 1, index));
    const panel = scroller.querySelector<HTMLElement>(`[data-panel-index="${next}"]`);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    panel?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", inline: "start", block: "nearest" });
  }, [rooms.length]);

  useEffect(() => {
    const scroller = scroller_ref.current;
    if (!scroller) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];
        if (!visible) {
          return;
        }
        const index = Number((visible.target as HTMLElement).dataset.panelIndex);
        if (!Number.isNaN(index)) {
          set_active_index(index);
        }
      },
      { root: scroller, threshold: [0.6, 0.8] },
    );
    scroller.querySelectorAll("[data-panel-index]").forEach((panel) => observer.observe(panel));
    return () => observer.disconnect();
  }, [rooms.length]);

  useEffect(() => {
    const scroller = scroller_ref.current;
    if (!scroller) {
      return;
    }
    let frame = 0;
    const on_scroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          return;
        }
        const scroll_left = scroller.scrollLeft;
        scroller.querySelectorAll<HTMLElement>("[data-parallax]").forEach((panel) => {
          const delta = panel.offsetLeft - scroll_left;
          panel.style.setProperty("--parallax", `${delta * 0.12}px`);
        });
      });
    };
    on_scroll();
    scroller.addEventListener("scroll", on_scroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      scroller.removeEventListener("scroll", on_scroll);
    };
  }, [rooms.length]);

  useEffect(() => {
    function on_key(event: KeyboardEvent) {
      const target = event.target;
      if (target instanceof HTMLElement && target.closest("input, textarea, [contenteditable='true']")) {
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        scroll_to(active_index + 1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        scroll_to(active_index - 1);
      } else if (event.key === "Home") {
        event.preventDefault();
        scroll_to(0);
      } else if (event.key === "End") {
        event.preventDefault();
        scroll_to(rooms.length - 1);
      }
    }
    window.addEventListener("keydown", on_key);
    return () => window.removeEventListener("keydown", on_key);
  }, [active_index, rooms.length, scroll_to]);

  function enter_museum() {
    player_ref.current?.play();
    scroll_to(Math.min(1, rooms.length - 1));
  }

  const active_room = rooms[active_index];

  return (
    <MotionConfig reducedMotion="user">
      <div
        className="mm_viewer"
        style={theme_css_vars(theme)}
        data-music={museum.music.source === "spotify" || museum.music.source === "apple" ? museum.music.source : "player"}
      >
        <a className="sr_only" href={`#${rooms[0]?.id ?? "lobby"}`}>
          Skip to the first room
        </a>
        <PortraitHint />
        <ViewerChrome title={museum.title} rooms={rooms} active_index={active_index} on_jump={scroll_to} />
        <div ref={scroller_ref} className="corridor" tabIndex={0} aria-label="Museum rooms">
          {rooms.map((room, index) => (
            <div className="panel" key={room.id} id={room.id} data-panel-index={index} data-parallax>
              <RoomShell
                theme={theme}
                active={index === active_index}
                show_door={room.type !== "lobby"}
                labelled_by={`${room.id}-title`}
              >
                {room.type === "lobby" ? (
                  <LobbyRoom museum={museum} room={room} theme={theme} on_enter={enter_museum} />
                ) : null}
                {room.type === "gallery" ? (
                  <GalleryRoom room={room} theme={theme} image_mode={image_mode_for(index, active_index)} />
                ) : null}
                {room.type === "timeline" ? <TimelineRoom room={room} /> : null}
                {room.type === "letter" ? <LetterRoom room={room} /> : null}
                {room.type === "finale" ? <FinaleRoom museum={museum} room={room} theme={theme} /> : null}
              </RoomShell>
            </div>
          ))}
        </div>
        <MusicPlayer music={museum.music} track={track} handle_ref={player_ref} />
        <p className="sr_only" aria-live="polite">
          {active_room ? active_room.name : ""}
        </p>
      </div>
    </MotionConfig>
  );
}
