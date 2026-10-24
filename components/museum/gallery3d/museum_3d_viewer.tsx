"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import type { inspect_target, pointer_state, tour_status } from "@/components/museum/gallery3d/camera_rig";
import { GalleryCanvas } from "@/components/museum/gallery3d/gallery_canvas";
import {
  ExhibitList,
  InspectCard,
  LetterOverlay,
  Lightbox,
} from "@/components/museum/gallery3d/gallery_overlays";
import { GalleryHud, MenuSheet, type panel_kind, type stop_action } from "@/components/museum/gallery3d/gallery_hud";
import type { gallery_mode } from "@/components/museum/gallery3d/gallery_state";
import {
  detect_tier,
  read_forced_quality,
  type gallery_tier,
} from "@/components/museum/gallery3d/quality";
import { usePortrait, usePrefersReducedMotion, useViewportAspect } from "@/components/museum/gallery3d/use_media";
import { MusicPlayer, type music_player_handle } from "@/components/museum/music_player";
import { PortraitHint } from "@/components/museum/portrait_hint";
import { inspect_pose, plan_hall, vfov_for_aspect } from "@/lib/gallery_layout";
import { next_mark_ms, previous_mark_ms, room_mark_ms, type gallery_tour_handle } from "@/lib/gallery_tour";
import { theme_css_vars } from "@/lib/themes";
import type { library_track, museum, theme_config } from "@/lib/types";

/**
 * What the HUD offers at a pause stop.
 *
 * @param item_id - The stop's item id.
 * @returns The action, or null.
 */
function action_for_item(item_id: string): stop_action {
  if (item_id.endsWith("-desk")) {
    return "letter";
  }
  return item_id.endsWith("-closing") ? "finale" : null;
}

export interface museum_3d_viewer_props {
  museum: museum;
  theme: theme_config;
  track: library_track | null;
  on_simple_mode: () => void;
}

/**
 * First-person 3D museum. Guided walk, free exploring, close-up inspection,
 * a letter room, and an automatic fall back to the simple viewer on slow phones.
 *
 * @param props - Museum data, theme, track, and the fallback switch.
 * @returns The 3D experience.
 */
export const Museum3DViewer = forwardRef<gallery_tour_handle, museum_3d_viewer_props>(function Museum3DViewer(
  { museum, theme, track, on_simple_mode },
  ref,
) {
  const player_ref = useRef<music_player_handle | null>(null);
  const canvas_ref = useRef<HTMLCanvasElement | null>(null);
  const elapsed_ref = useRef(0);
  const resume_ref = useRef(false);
  const resume_seek_ref = useRef(false);
  const playing_ref = useRef(false);
  const hide_timer = useRef<number | null>(null);
  const pointer = useRef<pointer_state>({ dragging: false, yaw: 0, pitch: 0, key_forward: 0, hold_forward: 0 });

  const reduce_motion = usePrefersReducedMotion();
  const portrait = usePortrait();
  const aspect = useViewportAspect();
  const view = useMemo(() => ({ aspect, vfov_deg: vfov_for_aspect(aspect) }), [aspect]);
  const { layout, timeline } = useMemo(() => plan_hall(museum, view), [museum, view]);

  const [tier, set_tier] = useState<gallery_tier>(() => detect_tier());
  const [entered, set_entered] = useState(false);
  const [mode, set_mode] = useState<gallery_mode>("guided");
  const [playing, set_playing] = useState(false);
  useEffect(() => {
    playing_ref.current = playing;
  }, [playing]);
  const [progress, set_progress] = useState(0);
  const [seek_elapsed_ms, set_seek_elapsed_ms] = useState(0);
  const [seek_target_ms, set_seek_target_ms] = useState<number | null>(null);
  const [tour_epoch, set_tour_epoch] = useState(0);
  const [active_room, set_active_room] = useState(0);
  const [at_stop, set_at_stop] = useState<stop_action>(null);
  const [inspect_id, set_inspect_id] = useState<string | null>(null);
  const [zoomed, set_zoomed] = useState(false);
  const [letter_open, set_letter_open] = useState(false);
  const [letter_reading, set_letter_reading] = useState(false);
  const [panel, set_panel] = useState<panel_kind>(null);
  const [hud_visible, set_hud_visible] = useState(true);
  const [notice, set_notice] = useState<string | null>(null);

  const frames = useMemo(() => layout.rooms.flatMap((entry) => entry.frames), [layout]);
  const inspect_frame = useMemo(() => frames.find((frame) => frame.id === inspect_id) ?? null, [frames, inspect_id]);
  const inspect_target = useMemo<inspect_target | null>(
    () => (inspect_frame ? inspect_pose(inspect_frame, view) : null),
    [inspect_frame, view],
  );
  const rooms_list = useMemo(() => layout.rooms.map((entry) => ({ id: entry.room.id, name: entry.room.name })), [layout]);
  const overlay_open = inspect_id !== null || letter_reading || panel !== null;

  const touch_hud = useCallback(() => {
    set_hud_visible(true);
    if (hide_timer.current !== null) {
      window.clearTimeout(hide_timer.current);
    }
    hide_timer.current = window.setTimeout(() => set_hud_visible(false), 3600);
  }, []);

  useEffect(
    () => () => {
      if (hide_timer.current !== null) {
        window.clearTimeout(hide_timer.current);
      }
    },
    [],
  );

  const seek_to = useCallback((elapsed_ms: number, play: boolean) => {
    elapsed_ref.current = elapsed_ms;
    set_seek_elapsed_ms(elapsed_ms);
    set_seek_target_ms(null);
    set_progress(0);
    set_at_stop(null);
    set_tour_epoch((value) => value + 1);
    set_playing(play);
  }, []);

  const go_to_mark = useCallback((target: number) => {
    set_mode("guided");
    set_at_stop(null);
    resume_seek_ref.current = playing_ref.current;
    set_playing(false);
    set_seek_target_ms(target);
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      get_canvas: () => canvas_ref.current,
      run_guided_tour: () => {
        set_mode("guided");
        set_entered(true);
        seek_to(0, true);
      },
      pause_guided_tour: () => set_playing(false),
      set_playing: (value: boolean) => set_playing(value),
      next_stop: () => go_to_mark(next_mark_ms(timeline, elapsed_ref.current)),
      previous_stop: () => go_to_mark(previous_mark_ms(timeline, elapsed_ref.current)),
      set_mode: (next: gallery_mode) => set_mode(next),
    }),
    [seek_to, go_to_mark, timeline],
  );

  const on_status = useCallback((status: tour_status) => {
    elapsed_ref.current = status.elapsed_ms;
    set_progress((previous) => (Math.abs(previous - status.progress) > 0.004 ? status.progress : previous));
  }, []);

  const on_auto_pause = useCallback(
    (stop_index: number) => {
      set_playing(false);
      set_at_stop(action_for_item(timeline.stops[stop_index]?.item_id ?? ""));
      set_hud_visible(true);
    },
    [timeline],
  );

  const on_complete = useCallback(() => {
    set_playing(false);
    set_progress(1);
    set_at_stop("finale");
  }, []);

  const on_seek_settled = useCallback(
    (elapsed_ms: number) => {
      set_seek_target_ms(null);
      const index = timeline.stops.findIndex(
        (stop, at) => stop.pause && Math.abs((timeline.arrivals[at] ?? 0) - elapsed_ms) < 60,
      );
      if (index >= 0) {
        resume_seek_ref.current = false;
        set_at_stop(action_for_item(timeline.stops[index]?.item_id ?? ""));
        set_hud_visible(true);
        return;
      }
      if (resume_seek_ref.current) {
        resume_seek_ref.current = false;
        set_playing(true);
      }
    },
    [timeline],
  );
  const on_room = useCallback((index: number) => set_active_room(index), []);
  const on_canvas = useCallback((canvas: HTMLCanvasElement | null) => {
    canvas_ref.current = canvas;
  }, []);

  const open_inspect = useCallback((id: string) => {
    resume_ref.current = false;
    set_playing((current) => {
      resume_ref.current = current;
      return false;
    });
    set_inspect_id(id);
    set_zoomed(false);
  }, []);

  const close_inspect = useCallback(() => {
    set_inspect_id(null);
    set_zoomed(false);
    if (resume_ref.current) {
      set_playing(true);
    }
    resume_ref.current = false;
  }, []);

  const open_letter = useCallback(() => {
    set_letter_open(true);
    window.setTimeout(() => set_letter_reading(true), reduce_motion ? 0 : 700);
  }, [reduce_motion]);

  const close_letter = useCallback(() => {
    set_letter_reading(false);
    set_letter_open(false);
  }, []);

  function enter_museum() {
    player_ref.current?.play();
    set_entered(true);
    set_mode("guided");
    seek_to(0, !reduce_motion);
    touch_hud();
  }

  function toggle_play() {
    touch_hud();
    if (progress >= 0.999) {
      seek_to(0, true);
      return;
    }
    set_at_stop(null);
    set_seek_target_ms(null);
    set_playing((current) => !current);
  }

  function jump_to_room(index: number) {
    touch_hud();
    const target = room_mark_ms(timeline, index);
    if (target !== null) {
      go_to_mark(target);
    }
  }

  const on_fps = useCallback(
    (fps: number) => {
      if (read_forced_quality() !== null) {
        return;
      }
      if (tier === "high" && fps < 30) {
        set_tier("low");
        set_notice("Lightening the scene for this device.");
        window.setTimeout(() => set_notice(null), 3000);
      } else if (tier === "low" && fps < 18) {
        set_notice("This device is finding the 3D hall heavy. Switching to the simple viewer.");
        window.setTimeout(on_simple_mode, 2200);
      }
    },
    [tier, on_simple_mode],
  );

  useEffect(() => {
    function on_key(event: KeyboardEvent) {
      if (!entered || overlay_open) {
        return;
      }
      if (event.key === " " && mode === "guided") {
        event.preventDefault();
        toggle_play();
      } else if (event.key === "ArrowRight" && mode === "guided") {
        go_to_mark(next_mark_ms(timeline, elapsed_ref.current));
      } else if (event.key === "ArrowLeft" && mode === "guided") {
        go_to_mark(previous_mark_ms(timeline, elapsed_ref.current));
      }
    }
    window.addEventListener("keydown", on_key);
    return () => window.removeEventListener("keydown", on_key);
  });

  const letters = layout.letters;
  const scene = {
    layout,
    museum,
    theme,
    tier,
    reduce_motion,
    active_room,
    letter_open,
    on_inspect: open_inspect,
    on_open_letter: open_letter,
  };
  const rig = {
    layout,
    timeline,
    mode,
    entered,
    guided_playing: playing,
    tour_epoch,
    seek_elapsed_ms,
    seek_target_ms,
    inspect: inspect_target,
    reduce_motion,
    portrait,
    on_status,
    on_room,
    on_auto_pause,
    on_complete,
    on_seek_settled,
  };

  return (
    <div
      className="mm_viewer gallery3d_viewer"
      style={theme_css_vars(theme)}
      data-music={museum.music.source === "spotify" || museum.music.source === "apple" ? museum.music.source : "player"}
      onPointerDown={touch_hud}
      onPointerMove={() => {
        if (!hud_visible) {
          touch_hud();
        }
      }}
    >
      <PortraitHint />
      <GalleryCanvas
        scene={scene}
        rig={rig}
        pointer={pointer}
        tier={tier}
        explore={entered && mode === "explore" && !overlay_open}
        on_fps={on_fps}
        measure_fps={entered && !overlay_open && (playing || mode === "explore")}
        on_canvas={on_canvas}
      />

      {!entered ? (
        <div className="gallery3d_lobby">
          <p className="kicker">{layout.rooms[0]?.room.name ?? "Entrance"}</p>
          <h1 className="font_display">{museum.title}</h1>
          {museum.title.toLowerCase().includes(museum.recipient_name.toLowerCase()) ? null : (
            <p className="recipient_name font_display">For {museum.recipient_name}</p>
          )}
          <p className="dedication">{museum.dedication}</p>
          <button type="button" className="mm_button" onClick={enter_museum} autoFocus>
            {theme.default_copy.enter_label}
          </button>
          <p className="hint">Best in landscape, with the sound on.</p>
        </div>
      ) : (
        <GalleryHud
          title={museum.title}
          rooms={rooms_list}
          active_room={active_room}
          mode={mode}
          playing={playing}
          progress={progress}
          at_stop={at_stop}
          visible={hud_visible || overlay_open}
          has_letters={letters.length > 0}
          on_mode={(next) => {
            touch_hud();
            set_mode(next);
            if (next === "explore") {
              set_playing(false);
              set_at_stop(null);
            }
          }}
          on_toggle_play={toggle_play}
          on_previous={() => {
            touch_hud();
            go_to_mark(previous_mark_ms(timeline, elapsed_ref.current));
          }}
          on_next={() => {
            touch_hud();
            go_to_mark(next_mark_ms(timeline, elapsed_ref.current));
          }}
          on_room={jump_to_room}
          on_restart={() => seek_to(0, true)}
          on_open_letter={open_letter}
          on_panel={set_panel}
          on_walk={(direction) => {
            pointer.current.hold_forward = direction;
          }}
        />
      )}

      {inspect_frame && !zoomed ? (
        <>
          <div className="gallery3d_vignette" aria-hidden="true" />
          <InspectCard frame={inspect_frame} on_zoom={() => set_zoomed(true)} on_close={close_inspect} />
        </>
      ) : null}
      {inspect_frame && zoomed && inspect_frame.exhibit.image_src ? (
        <Lightbox
          src={inspect_frame.exhibit.image_src}
          alt={inspect_frame.exhibit.caption ?? "Photo"}
          on_close={() => set_zoomed(false)}
        />
      ) : null}
      {letter_reading ? (
        <LetterOverlay letters={letters} theme={theme} reduce_motion={reduce_motion} on_close={close_letter} />
      ) : null}
      {panel === "list" ? <ExhibitList museum={museum} on_close={() => set_panel("menu")} /> : null}
      <MenuSheet
        panel={panel}
        museum={museum}
        on_panel={set_panel}
        on_simple_mode={on_simple_mode}
        on_close={() => set_panel(null)}
      />

      {notice ? (
        <p className="gallery3d_notice" role="status">
          {notice}
        </p>
      ) : null}

      <MusicPlayer music={museum.music} track={track} handle_ref={player_ref} />
    </div>
  );
});

export default Museum3DViewer;
