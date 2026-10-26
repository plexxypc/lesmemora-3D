/**
 * Camera math for the first-person gallery.
 *
 * Poses depend only on the elapsed time, so a later recorder can replay the
 * guided tour by stepping that clock. This module does not import three.js.
 */

export type gallery_move_mode = "guided" | "explore";

/** A point in the hall, in meters. The hall runs toward -Z. */
export interface gallery_vec3 {
  x: number;
  y: number;
  z: number;
}

/** What the camera is doing at a stop. */
export type tour_stop_kind = "walk" | "view" | "door";

/** One stop on the guided tour. */
export interface tour_stop {
  position: gallery_vec3;
  look_at: gallery_vec3;
  /** Time spent walking here from the previous stop. */
  travel_ms: number;
  /** Time spent standing still once here. */
  hold_ms: number;
  /** When true the tour stops here until the visitor presses play. */
  pause: boolean;
  room_index: number;
  kind: tour_stop_kind;
  /** Exhibit or prop the camera is looking at, when there is one. */
  item_id: string | null;
}

/** Where the camera should be, including the head-bob offsets. */
export interface gallery_pose {
  position: gallery_vec3;
  look_at: gallery_vec3;
  bob: number;
  sway: number;
}

/** A point on the tour the visitor can jump to. */
export interface tour_mark {
  ms: number;
  room_index: number;
  stop_index: number;
}

/** Stops with their clock times. Built once per layout and view. */
export interface tour_timeline {
  stops: readonly tour_stop[];
  /** When walking into stop i begins. */
  starts: readonly number[];
  /** When the camera reaches stop i. */
  arrivals: readonly number[];
  /** When the camera leaves stop i. */
  ends: readonly number[];
  duration_ms: number;
  marks: readonly tour_mark[];
}

/**
 * Imperative controls for the gallery camera. A later video recorder uses these.
 * `run_guided_tour` restarts at the entrance and plays to the end.
 */
export interface gallery_tour_handle {
  run_guided_tour: () => void;
  pause_guided_tour: () => void;
  set_playing: (playing: boolean) => void;
  next_stop: () => void;
  previous_stop: () => void;
  set_mode: (mode: gallery_move_mode) => void;
  get_canvas: () => HTMLCanvasElement | null;
}

export const walk_speed_mps = 1.35;

/**
 * Clamp a number to the 0..1 range.
 *
 * @param value - Any finite number.
 * @returns The value limited to 0..1.
 */
export function clamp_unit(value: number): number {
  if (value <= 0) {
    return 0;
  }
  if (value >= 1) {
    return 1;
  }
  return value;
}

/**
 * Smoothstep used so a move starts and ends with zero speed.
 *
 * @param value - Progress, usually 0..1.
 * @returns Eased progress.
 */
export function smoothstep(value: number): number {
  const t = clamp_unit(value);
  return t * t * (3 - 2 * t);
}

/**
 * Linear blend.
 *
 * @param from - Start value.
 * @param to - End value.
 * @param t - Blend amount, not necessarily clamped.
 * @returns The blended number.
 */
export function lerp_number(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

/**
 * Linear blend of two points.
 *
 * @param from - Start point.
 * @param to - End point.
 * @param t - Blend amount.
 * @returns A new point.
 */
export function lerp_vec3(from: gallery_vec3, to: gallery_vec3, t: number): gallery_vec3 {
  return {
    x: lerp_number(from.x, to.x, t),
    y: lerp_number(from.y, to.y, t),
    z: lerp_number(from.z, to.z, t),
  };
}

/**
 * Distance between two points.
 *
 * @param a - First point.
 * @param b - Second point.
 * @returns Meters.
 */
export function distance_between(a: gallery_vec3, b: gallery_vec3): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

/**
 * Frame-rate independent damping.
 *
 * @param current - Value this frame started from.
 * @param target - Value being approached.
 * @param lambda - How quickly to catch the target. Larger is faster.
 * @param dt - Frame delta in seconds.
 * @returns The damped value.
 */
export function damp_number(current: number, target: number, lambda: number, dt: number): number {
  if (dt <= 0) {
    return current;
  }
  return lerp_number(current, target, 1 - Math.exp(-lambda * dt));
}

/**
 * Copy a point so later edits cannot change a stop.
 *
 * @param value - Point to copy.
 * @returns A new point with the same components.
 */
export function clone_vec3(value: gallery_vec3): gallery_vec3 {
  return { x: value.x, y: value.y, z: value.z };
}

/**
 * Walking time between two points, kept inside a comfortable range.
 *
 * @param from - Start point.
 * @param to - End point.
 * @param min_ms - Shortest allowed time.
 * @param max_ms - Longest allowed time.
 * @returns Milliseconds.
 */
export function travel_time_ms(from: gallery_vec3, to: gallery_vec3, min_ms = 1800, max_ms = 6200): number {
  const ms = (distance_between(from, to) / walk_speed_mps) * 1000;
  return Math.round(Math.min(max_ms, Math.max(min_ms, ms)));
}

/**
 * Work out when each stop begins, arrives, and ends.
 *
 * @param stops - Stops in walk order. The first stop's travel time is ignored.
 * @returns The timeline with its jump marks.
 */
export function build_timeline(stops: readonly tour_stop[]): tour_timeline {
  const starts: number[] = [];
  const arrivals: number[] = [];
  const ends: number[] = [];
  const marks: tour_mark[] = [];
  let clock = 0;
  stops.forEach((stop, index) => {
    const travel = index === 0 ? 0 : stop.travel_ms;
    starts.push(clock);
    clock += travel;
    arrivals.push(clock);
    clock += stop.hold_ms;
    ends.push(clock);
    if (index === 0 || stop.kind === "view") {
      marks.push({ ms: arrivals[index] ?? 0, room_index: stop.room_index, stop_index: index });
    }
  });
  return { stops, starts, arrivals, ends, duration_ms: clock, marks };
}

/**
 * Speed-aware ease. A stop with a hold starts and ends at rest.
 * A stop without one keeps walking, so the camera passes through a doorway at speed.
 *
 * @param t - Progress 0..1.
 * @param start_speed - 0 to start at rest, 1 to start at walking pace.
 * @param end_speed - 0 to end at rest, 1 to end at walking pace.
 * @returns Eased progress.
 */
export function hermite_ease(t: number, start_speed: number, end_speed: number): number {
  const u = clamp_unit(t);
  const u2 = u * u;
  const u3 = u2 * u;
  return (u3 - 2 * u2 + u) * start_speed + (-2 * u3 + 3 * u2) + (u3 - u2) * end_speed;
}

const default_pose: gallery_pose = {
  position: { x: 0, y: 1.55, z: 0 },
  look_at: { x: 0, y: 1.5, z: -4 },
  bob: 0,
  sway: 0,
};

/**
 * Camera pose at an elapsed time on the guided path.
 * The same arguments always return the same pose.
 *
 * @param timeline - Built timeline.
 * @param elapsed_ms - Time since the entrance. Values outside the tour are clamped.
 * @param reduced_motion - When true, the pose cuts between stops and does not bob.
 * @returns The pose for that instant.
 */
export function pose_at(timeline: tour_timeline, elapsed_ms: number, reduced_motion: boolean): gallery_pose {
  const stops = timeline.stops;
  const first = stops[0];
  if (!first) {
    return { ...default_pose, position: clone_vec3(default_pose.position), look_at: clone_vec3(default_pose.look_at) };
  }
  const elapsed = Math.min(timeline.duration_ms, Math.max(0, elapsed_ms));
  let index = 0;
  for (let next = 1; next < stops.length; next += 1) {
    if ((timeline.starts[next] ?? Infinity) <= elapsed) {
      index = next;
    } else {
      break;
    }
  }
  const stop = stops[index] ?? first;
  const arrival = timeline.arrivals[index] ?? 0;
  const from = index > 0 ? stops[index - 1] : undefined;

  if (from && elapsed < arrival) {
    const start = timeline.starts[index] ?? 0;
    const local = (elapsed - start) / Math.max(1, stop.travel_ms);
    if (reduced_motion) {
      const target = local >= 0.5 ? stop : from;
      return { position: clone_vec3(target.position), look_at: clone_vec3(target.look_at), bob: 0, sway: 0 };
    }
    const eased = hermite_ease(local, from.hold_ms > 0 ? 0 : 1, stop.hold_ms > 0 ? 0 : 1);
    const distance = distance_between(from.position, stop.position);
    const walked = eased * distance;
    const pace = distance < 0.8 ? 0 : Math.min(1, Math.sin(clamp_unit(local) * Math.PI) * 2.4);
    return {
      position: lerp_vec3(from.position, stop.position, eased),
      look_at: lerp_vec3(from.look_at, stop.look_at, eased),
      bob: Math.sin(walked * Math.PI * 1.6) * 0.02 * pace,
      sway: Math.sin(walked * Math.PI * 0.8) * 0.012 * pace,
    };
  }

  return {
    position: clone_vec3(stop.position),
    look_at: clone_vec3(stop.look_at),
    bob: 0,
    sway: reduced_motion ? 0 : Math.sin(elapsed / 1500) * 0.006,
  };
}

/**
 * Advance the tour clock by one frame.
 *
 * @param elapsed_ms - Clock before this frame.
 * @param dt_ms - Frame length. A recorder can pass a fixed step.
 * @param duration_ms - Length of the full tour.
 * @returns The new clock, stopped at the end.
 */
export function step_guided_elapsed(elapsed_ms: number, dt_ms: number, duration_ms: number): number {
  if (dt_ms <= 0) {
    return Math.min(duration_ms, Math.max(0, elapsed_ms));
  }
  return Math.min(duration_ms, Math.max(0, elapsed_ms + dt_ms));
}

/**
 * The first pause stop reached while the clock moves from one time to another.
 *
 * @param timeline - Built timeline.
 * @param from_ms - Clock before the step.
 * @param to_ms - Clock after the step.
 * @returns The stop index and its arrival time, or null when no pause was crossed.
 */
export function pause_crossed(
  timeline: tour_timeline,
  from_ms: number,
  to_ms: number,
): { stop_index: number; ms: number } | null {
  for (let index = 0; index < timeline.stops.length; index += 1) {
    const stop = timeline.stops[index];
    const arrival = timeline.arrivals[index] ?? 0;
    if (stop?.pause && from_ms < arrival && to_ms >= arrival) {
      return { stop_index: index, ms: arrival };
    }
  }
  return null;
}

/**
 * Ease the clock toward a mark.
 *
 * @param current_ms - Clock before this frame.
 * @param target_ms - Time the visitor asked for.
 * @param dt - Frame delta in seconds.
 * @param reduced_motion - When true, the clock cuts to the target.
 * @returns The new clock.
 */
export function approach_elapsed(current_ms: number, target_ms: number, dt: number, reduced_motion: boolean): number {
  if (reduced_motion) {
    return target_ms;
  }
  return damp_number(current_ms, target_ms, 2.4, dt);
}

/**
 * The next mark after the current time.
 *
 * @param timeline - Built timeline.
 * @param elapsed_ms - Tour clock.
 * @returns The next mark time, or the end when none is left.
 */
export function next_mark_ms(timeline: tour_timeline, elapsed_ms: number): number {
  const next = timeline.marks.find((mark) => mark.ms > elapsed_ms + 400);
  return next ? next.ms : timeline.duration_ms;
}

/**
 * The previous mark before the current time. A small step past a mark returns to it.
 *
 * @param timeline - Built timeline.
 * @param elapsed_ms - Tour clock.
 * @returns The previous mark time, or 0 at the entrance.
 */
export function previous_mark_ms(timeline: tour_timeline, elapsed_ms: number): number {
  let found = 0;
  for (const mark of timeline.marks) {
    if (mark.ms < elapsed_ms - 700) {
      found = mark.ms;
    } else {
      break;
    }
  }
  return found;
}

/**
 * First mark in a room.
 *
 * @param timeline - Built timeline.
 * @param room_index - Room to jump to.
 * @returns The mark time, or null when the room has none.
 */
export function room_mark_ms(timeline: tour_timeline, room_index: number): number | null {
  const mark = timeline.marks.find((entry) => entry.room_index === room_index);
  return mark ? mark.ms : null;
}

/**
 * Which room the clock is in, by stop.
 *
 * @param timeline - Built timeline.
 * @param elapsed_ms - Tour clock.
 * @returns The room index of the nearest earlier stop.
 */
export function room_at_elapsed(timeline: tour_timeline, elapsed_ms: number): number {
  let room = timeline.stops[0]?.room_index ?? 0;
  for (let index = 0; index < timeline.stops.length; index += 1) {
    if ((timeline.arrivals[index] ?? 0) <= elapsed_ms) {
      room = timeline.stops[index]?.room_index ?? room;
    } else {
      break;
    }
  }
  return room;
}

/**
 * Cap the drawing resolution. High tier: up to 2 with a mouse, 1.5 on touch.
 * Low tier: 1.25 on touch (the 30 fps cap pays for it) and 1 on a weak computer.
 *
 * @param device_pixel_ratio - `window.devicePixelRatio`.
 * @param pointer_is_fine - True for a mouse or trackpad.
 * @param low_tier - True on devices that should render fewer pixels.
 * @returns The pixel ratio to pass to the canvas.
 */
export function gallery_pixel_ratio(device_pixel_ratio: number, pointer_is_fine: boolean, low_tier = false): number {
  if (!Number.isFinite(device_pixel_ratio) || device_pixel_ratio <= 0) {
    return 1;
  }
  const cap = low_tier ? (pointer_is_fine ? 1 : 1.25) : pointer_is_fine ? 2 : 1.5;
  return Math.min(device_pixel_ratio, cap);
}

/**
 * A point in front of the eye for `lookAt`.
 *
 * @param position - Eye position.
 * @param yaw - Horizontal facing. 0 looks toward -Z.
 * @param pitch - Vertical facing. Positive looks up.
 * @returns A point ahead of the camera.
 */
export function look_from_yaw_pitch(position: gallery_vec3, yaw: number, pitch: number): gallery_vec3 {
  const distance = 4;
  return {
    x: position.x + Math.sin(yaw) * Math.cos(pitch) * distance,
    y: position.y + Math.sin(pitch) * distance,
    z: position.z - Math.cos(yaw) * Math.cos(pitch) * distance,
  };
}

/**
 * Facing that looks from one point toward another, ignoring height.
 *
 * @param position - Eye position.
 * @param look_at - Point being faced.
 * @returns Yaw in radians. 0 looks toward -Z.
 */
export function yaw_from_look(position: gallery_vec3, look_at: gallery_vec3): number {
  return Math.atan2(look_at.x - position.x, position.z - look_at.z);
}

/**
 * Height angle that looks from one point toward another.
 *
 * @param position - Eye position.
 * @param look_at - Point being faced.
 * @returns Pitch in radians. Positive looks up.
 */
export function pitch_from_look(position: gallery_vec3, look_at: gallery_vec3): number {
  const flat = Math.hypot(look_at.x - position.x, look_at.z - position.z);
  return Math.atan2(look_at.y - position.y, flat);
}

/**
 * Head bob while the visitor is walking in explore mode.
 *
 * @param distance - Meters walked so far.
 * @param moving - Whether the body is currently moving.
 * @param reduced_motion - When true, the head stays level.
 * @returns Vertical and lateral offsets in meters.
 */
export function head_bob(distance: number, moving: boolean, reduced_motion: boolean): { bob: number; sway: number } {
  if (reduced_motion || !moving) {
    return { bob: 0, sway: 0 };
  }
  return {
    bob: Math.sin(distance * 8) * 0.024,
    sway: Math.sin(distance * 4) * 0.014,
  };
}
