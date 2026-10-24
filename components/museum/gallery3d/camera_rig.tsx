"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, type MutableRefObject } from "react";
import { MathUtils, Vector3, type PerspectiveCamera } from "three";
import type { gallery_mode } from "@/components/museum/gallery3d/gallery_state";
import { hall, room_index_at, step_explore, type gallery_layout } from "@/lib/gallery_layout";
import {
  approach_elapsed,
  head_bob,
  look_from_yaw_pitch,
  pause_crossed,
  pitch_from_look,
  pose_at,
  step_guided_elapsed,
  yaw_from_look,
  type gallery_vec3,
  type tour_timeline,
} from "@/lib/gallery_tour";

/** Input shared between the pointer bridge, the on-screen buttons, and the rig. */
export interface pointer_state {
  dragging: boolean;
  yaw: number;
  pitch: number;
  /** -1..1 from the keyboard or mouse wheel. */
  key_forward: number;
  /** -1..1 from the on-screen walk buttons. */
  hold_forward: number;
}

export interface tour_status {
  elapsed_ms: number;
  progress: number;
  stop_index: number;
}

export interface inspect_target {
  position: gallery_vec3;
  look_at: gallery_vec3;
}

export interface camera_rig_props {
  layout: gallery_layout;
  timeline: tour_timeline;
  mode: gallery_mode;
  entered: boolean;
  guided_playing: boolean;
  /** Bumps when the visitor restarts or jumps. The clock moves to `seek_elapsed_ms`. */
  tour_epoch: number;
  seek_elapsed_ms: number;
  /** Soft target for next, previous, and room jumps. Null while free-playing. */
  seek_target_ms: number | null;
  inspect: inspect_target | null;
  reduce_motion: boolean;
  portrait: boolean;
  pointer: MutableRefObject<pointer_state>;
  on_status: (status: tour_status) => void;
  on_room: (index: number) => void;
  on_auto_pause: (stop_index: number) => void;
  on_complete: () => void;
  on_seek_settled: (elapsed_ms: number) => void;
}

const look_now = new Vector3();
const look_want = new Vector3();
const pos_want = new Vector3();

/**
 * First-person camera: the guided walk, free exploring, and gliding up to a frame.
 *
 * @param props - Layout, clock, mode, and callbacks.
 * @returns null. It moves the default camera each frame.
 */
export function CameraRig(props: camera_rig_props) {
  const { camera, invalidate } = useThree();
  const sim = useRef({
    elapsed: 0,
    ready: false,
    explore: { x: 0, y: hall.eye, z: 0 } as gallery_vec3,
    walked: 0,
    room: -1,
    report_at: 0,
    completed: false,
    target: null as number | null,
    look: new Vector3(0, 1.5, -4),
    last_mode: "guided" as gallery_mode,
  });
  const latest = useRef(props);
  useEffect(() => {
    latest.current = props;
  });

  const { timeline, tour_epoch, seek_elapsed_ms, seek_target_ms, portrait, mode, pointer } = props;

  useEffect(() => {
    const state = sim.current;
    state.elapsed = seek_elapsed_ms;
    state.completed = seek_elapsed_ms >= timeline.duration_ms && timeline.duration_ms > 0;
    state.target = null;
    invalidate();
  }, [tour_epoch, seek_elapsed_ms, timeline, invalidate]);

  useEffect(() => {
    sim.current.target = seek_target_ms;
    invalidate();
  }, [seek_target_ms, invalidate]);

  useEffect(() => {
    const perspective = camera as PerspectiveCamera;
    perspective.fov = portrait ? 72 : 62;
    perspective.near = 0.08;
    perspective.far = 60;
    perspective.updateProjectionMatrix();
    invalidate();
  }, [camera, invalidate, portrait]);

  useEffect(() => {
    const state = sim.current;
    if (mode === "explore" && state.last_mode !== "explore") {
      state.explore = { x: camera.position.x, y: hall.eye, z: camera.position.z };
      const here = { x: camera.position.x, y: camera.position.y, z: camera.position.z };
      const there = { x: state.look.x, y: state.look.y, z: state.look.z };
      pointer.current.yaw = yaw_from_look(here, there);
      pointer.current.pitch = Math.max(-0.45, Math.min(0.45, pitch_from_look(here, there)));
    }
    if (mode === "guided" && state.last_mode === "explore") {
      let best_ms = 0;
      let best = Infinity;
      timeline.marks.forEach((mark) => {
        const stop = timeline.stops[mark.stop_index];
        if (!stop) {
          return;
        }
        const d = Math.hypot(stop.position.x - camera.position.x, stop.position.z - camera.position.z);
        if (d < best) {
          best = d;
          best_ms = mark.ms;
        }
      });
      state.elapsed = best_ms;
    }
    state.last_mode = mode;
    invalidate();
  }, [mode, camera, timeline, pointer, invalidate]);

  useFrame((frame, delta) => {
    const p = latest.current;
    const state = sim.current;
    const dt = Math.min(delta, 0.05);
    const t = frame.clock.elapsedTime;
    let moving = false;

    if (!state.ready) {
      const start = pose_at(p.timeline, 0, true);
      camera.position.set(start.position.x, start.position.y, start.position.z);
      state.look.set(start.look_at.x, start.look_at.y, start.look_at.z);
      camera.lookAt(state.look);
      state.explore = { ...start.position };
      state.ready = true;
    }

    let want_position: gallery_vec3;
    let want_look: gallery_vec3;
    let lambda = 10;

    if (p.inspect) {
      want_position = p.inspect.position;
      want_look = p.inspect.look_at;
      lambda = 4.2;
    } else if (!p.entered) {
      const base = pose_at(p.timeline, 0, true);
      const drift = p.reduce_motion ? 0 : Math.sin(t * 0.3) * 0.16;
      want_position = { x: base.position.x + drift, y: base.position.y, z: base.position.z - (p.reduce_motion ? 0 : (Math.sin(t * 0.2) + 1) * 0.1) };
      want_look = base.look_at;
      lambda = 3;
    } else if (p.mode === "guided") {
      if (state.target !== null) {
        state.elapsed = approach_elapsed(state.elapsed, state.target, dt, p.reduce_motion);
        moving = Math.abs(state.elapsed - state.target) > 12;
        if (!moving) {
          state.elapsed = state.target;
          state.target = null;
          p.on_seek_settled(state.elapsed);
        }
      } else if (p.guided_playing) {
        const before = state.elapsed;
        const next = step_guided_elapsed(before, dt * 1000, p.timeline.duration_ms);
        const crossed = pause_crossed(p.timeline, before, next);
        if (crossed) {
          state.elapsed = crossed.ms;
          p.on_auto_pause(crossed.stop_index);
        } else {
          state.elapsed = next;
          moving = next < p.timeline.duration_ms;
          if (next >= p.timeline.duration_ms && !state.completed) {
            state.completed = true;
            p.on_complete();
          }
        }
      }
      const pose = pose_at(p.timeline, state.elapsed, p.reduce_motion);
      want_position = { x: pose.position.x + pose.sway, y: pose.position.y + pose.bob, z: pose.position.z };
      want_look = { x: pose.look_at.x + pose.sway * 0.35, y: pose.look_at.y + pose.bob * 0.25, z: pose.look_at.z };
      lambda = p.reduce_motion ? 30 : 12;
    } else {
      const forward = Math.max(-1, Math.min(1, pointer.current.key_forward + pointer.current.hold_forward));
      moving = Math.abs(forward) > 0.01;
      if (moving) {
        state.explore = step_explore(p.layout, state.explore, pointer.current.yaw, forward, dt);
        state.walked += Math.abs(forward) * 1.7 * dt;
      }
      const bob = head_bob(state.walked, moving, p.reduce_motion);
      want_position = { x: state.explore.x + bob.sway, y: hall.eye + bob.bob, z: state.explore.z };
      want_look = look_from_yaw_pitch(want_position, pointer.current.yaw, pointer.current.pitch);
      lambda = 14;
    }

    pos_want.set(want_position.x, want_position.y, want_position.z);
    look_want.set(want_look.x, want_look.y, want_look.z);
    const before_x = camera.position.x;
    const before_z = camera.position.z;
    camera.position.x = MathUtils.damp(camera.position.x, pos_want.x, lambda, dt);
    camera.position.y = MathUtils.damp(camera.position.y, pos_want.y, lambda, dt);
    camera.position.z = MathUtils.damp(camera.position.z, pos_want.z, lambda, dt);
    look_now.copy(state.look);
    look_now.x = MathUtils.damp(look_now.x, look_want.x, lambda, dt);
    look_now.y = MathUtils.damp(look_now.y, look_want.y, lambda, dt);
    look_now.z = MathUtils.damp(look_now.z, look_want.z, lambda, dt);
    state.look.copy(look_now);
    camera.lookAt(state.look);

    const settled =
      Math.abs(before_x - camera.position.x) + Math.abs(before_z - camera.position.z) < 0.0004 &&
      camera.position.distanceTo(pos_want) < 0.004;
    if (!settled || moving || p.guided_playing || pointer.current.dragging) {
      invalidate();
    }

    const room = room_index_at(p.layout, camera.position.z);
    if (room !== state.room) {
      state.room = room;
      p.on_room(room);
    }

    if (p.entered && p.mode === "guided" && !p.inspect) {
      const now = performance.now();
      if (now - state.report_at > 140 || !moving) {
        state.report_at = now;
        let stop_index = 0;
        for (let index = 0; index < p.timeline.stops.length; index += 1) {
          if ((p.timeline.arrivals[index] ?? 0) <= state.elapsed + 50) {
            stop_index = index;
          }
        }
        p.on_status({
          elapsed_ms: state.elapsed,
          progress: p.timeline.duration_ms > 0 ? state.elapsed / p.timeline.duration_ms : 1,
          stop_index,
        });
      }
    }
  });

  return null;
}
