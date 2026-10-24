/**
 * Turns a museum's rooms into a hall the camera can walk.
 *
 * The hall runs toward -Z. Each room is a box with a doorway in its far wall.
 * Everything here is plain data, so it can be tested without a browser.
 */

import {
  build_timeline,
  clamp_unit,
  type gallery_vec3,
  type tour_stop,
  type tour_timeline,
  travel_time_ms,
} from "./gallery_tour";
import { ordered_rooms } from "./panels";
import type { exhibit, museum, room, room_type } from "./types";

export const hall = {
  width: 7,
  height: 3.8,
  wall: 0.26,
  door_width: 1.7,
  door_height: 2.7,
  eye: 1.55,
  frame_center_y: 1.72,
} as const;

/** Largest size a photo frame may take. The photo fits inside, keeping its shape. */
export const photo_box = { width: 2.05, height: 1.5 } as const;

/** Size of a timeline plaque. */
export const plaque_box = { width: 2.3, height: 1.4 } as const;

const row_spacing = 3.1;
const plaque_spacing = 3.05;
const entry_pad = 3.0;
const exit_pad = 3.3;
const min_depth = 9;

export type frame_wall = "left" | "right";

/** One framed photo or plaque on a wall. */
export interface placed_frame {
  id: string;
  kind: "photo" | "plaque";
  exhibit: exhibit;
  wall: frame_wall;
  room_index: number;
  /** Center of the frame on the wall. */
  position: gallery_vec3;
  /** Rotation about Y so the front faces into the hall. */
  rotation_y: number;
  /** Unit vector pointing out of the wall into the hall. */
  normal_x: number;
  width: number;
  height: number;
}

/** One room of the hall. */
export interface room_layout {
  index: number;
  room: room;
  type: room_type;
  /** Z of the near wall. */
  z_near: number;
  /** Z of the far wall. The doorway sits here unless this is the last room. */
  z_far: number;
  depth: number;
  has_door: boolean;
  frames: placed_frame[];
  /** Letter desk position, present in a letter room that has letters. */
  desk: gallery_vec3 | null;
}

/** The whole hall. */
export interface gallery_layout {
  rooms: room_layout[];
  z_end: number;
  letters: exhibit[];
}

/** How the visitor sees the hall, so stops can be placed to fit the screen. */
export interface tour_view {
  vfov_deg: number;
  aspect: number;
}

/**
 * Field of view for a screen shape.
 *
 * @param aspect - Width divided by height.
 * @returns The vertical field of view in degrees.
 */
export function vfov_for_aspect(aspect: number): number {
  return aspect < 1 ? 72 : 62;
}

function rad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function frames_per_side(count: number): number {
  return Math.ceil(count / 2);
}

function room_depth(type: room_type, photo_count: number, plaque_count: number): number {
  let needed = 0;
  if (photo_count > 0) {
    needed = Math.max(
      needed,
      entry_pad + (frames_per_side(photo_count) - 1) * row_spacing + (photo_count > 1 ? row_spacing / 2 : 0) + exit_pad,
    );
  }
  if (plaque_count > 0) {
    needed = Math.max(needed, entry_pad + (plaque_count - 1) * plaque_spacing + plaque_spacing / 2 + exit_pad);
  }
  const base = type === "lobby" ? 9.5 : min_depth;
  return Math.max(base, needed);
}

function wall_x(wall: frame_wall): number {
  return wall === "left" ? -hall.width / 2 + 0.03 : hall.width / 2 - 0.03;
}

function frame_for(
  item: exhibit,
  kind: "photo" | "plaque",
  wall: frame_wall,
  z: number,
  room_index: number,
): placed_frame {
  const box = kind === "photo" ? photo_box : plaque_box;
  return {
    id: item.id,
    kind,
    exhibit: item,
    wall,
    room_index,
    position: { x: wall_x(wall), y: hall.frame_center_y, z },
    rotation_y: wall === "left" ? Math.PI / 2 : -Math.PI / 2,
    normal_x: wall === "left" ? 1 : -1,
    width: box.width,
    height: box.height,
  };
}

/**
 * Lay out every room along the hall.
 *
 * @param museum - Museum to lay out.
 * @returns Rooms, frames, and the letters the desk holds.
 */
export function build_layout(museum: museum): gallery_layout {
  const rooms = ordered_rooms(museum);
  const letters = rooms.flatMap((entry) => entry.exhibits.filter((item) => item.kind === "letter"));
  const laid: room_layout[] = [];
  let z = 0;
  rooms.forEach((entry, index) => {
    const photos = entry.exhibits.filter((item) => item.kind === "photo");
    const milestones = entry.exhibits.filter((item) => item.kind === "milestone");
    const depth = room_depth(entry.type, photos.length, milestones.length);
    const z_near = z;
    const z_far = z - depth;
    const frames: placed_frame[] = [];
    photos.forEach((item, photo_index) => {
      const wall: frame_wall = photo_index % 2 === 0 ? "left" : "right";
      const row = Math.floor(photo_index / 2);
      const stagger = wall === "right" ? row_spacing / 2 : 0;
      frames.push(frame_for(item, "photo", wall, z_near - entry_pad - row * row_spacing - stagger, index));
    });
    milestones.forEach((item, milestone_index) => {
      const wall: frame_wall = milestone_index % 2 === 0 ? "left" : "right";
      frames.push(frame_for(item, "plaque", wall, z_near - entry_pad - milestone_index * plaque_spacing, index));
    });
    frames.sort((left, right) => right.position.z - left.position.z);
    const has_letters = entry.type === "letter" && entry.exhibits.some((item) => item.kind === "letter");
    laid.push({
      index,
      room: entry,
      type: entry.type,
      z_near,
      z_far,
      depth,
      has_door: index < rooms.length - 1,
      frames,
      desk: has_letters ? { x: -1.55, y: 0, z: z_near - depth * 0.5 } : null,
    });
    z = z_far;
  });
  return { rooms: laid, z_end: z, letters };
}

/**
 * Which room a Z position falls in.
 *
 * @param layout - Built layout.
 * @param z - World Z.
 * @returns The room index, clamped to the hall.
 */
export function room_index_at(layout: gallery_layout, z: number): number {
  for (const entry of layout.rooms) {
    if (z > entry.z_far) {
      return entry.index;
    }
  }
  return Math.max(0, layout.rooms.length - 1);
}

/**
 * Keep a walker inside the hall and funnel them through doorways.
 *
 * @param layout - Built layout.
 * @param position - Proposed eye position.
 * @returns The corrected position, at eye height.
 */
export function clamp_walk(layout: gallery_layout, position: gallery_vec3): gallery_vec3 {
  const first = layout.rooms[0];
  const margin = 0.6;
  let x = Math.min(hall.width / 2 - margin, Math.max(-(hall.width / 2 - margin), position.x));
  const z_min = layout.z_end + margin;
  const z_max = (first ? first.z_near : 0) - 0.5;
  const z = Math.min(z_max, Math.max(z_min, position.z));
  for (const entry of layout.rooms) {
    if (!entry.has_door) {
      continue;
    }
    if (Math.abs(z - entry.z_far) < hall.wall / 2 + 0.5) {
      const half = hall.door_width / 2 - 0.3;
      x = Math.min(half, Math.max(-half, x));
    }
  }
  return { x, y: hall.eye, z };
}

/**
 * Walk along the facing direction.
 *
 * @param layout - Built layout.
 * @param position - Eye position before the step.
 * @param yaw - Facing. 0 looks toward -Z.
 * @param move - -1 back through 1 forward.
 * @param dt - Frame delta in seconds.
 * @returns The clamped position.
 */
export function step_explore(
  layout: gallery_layout,
  position: gallery_vec3,
  yaw: number,
  move: number,
  dt: number,
): gallery_vec3 {
  const speed = 1.7;
  return clamp_walk(layout, {
    x: position.x + Math.sin(yaw) * move * speed * dt,
    y: hall.eye,
    z: position.z - Math.cos(yaw) * move * speed * dt,
  });
}

/**
 * Where the camera stands to look at a frame in the guided tour.
 * Narrow screens stand farther back so the frame fits across the width.
 *
 * @param frame - Frame to look at.
 * @param view - Screen shape.
 * @returns Distance from the wall in meters.
 */
export function standoff_for(frame: placed_frame, view: tour_view): number {
  const vfov = rad(view.vfov_deg);
  const hfov = 2 * Math.atan(Math.tan(vfov / 2) * view.aspect);
  const by_width = (frame.width * 1.22) / (2 * Math.tan(hfov / 2));
  const by_height = (frame.height * 1.5) / (2 * Math.tan(vfov / 2));
  return Math.min(hall.width - 0.9, Math.max(3.1, by_width, by_height));
}

/**
 * Camera pose that fills the view with one frame.
 *
 * @param frame - Frame to inspect.
 * @param view - Screen shape.
 * @returns Position and look-at point.
 */
export function inspect_pose(frame: placed_frame, view: tour_view): { position: gallery_vec3; look_at: gallery_vec3 } {
  const vfov = rad(view.vfov_deg);
  const hfov = 2 * Math.atan(Math.tan(vfov / 2) * view.aspect);
  const by_width = (frame.width * 1.08) / (2 * Math.tan(hfov / 2));
  const by_height = (frame.height * 1.7) / (2 * Math.tan(vfov / 2));
  const distance = Math.min(hall.width - 1, Math.max(1.5, by_width, by_height));
  return {
    position: {
      x: frame.position.x + frame.normal_x * distance,
      y: hall.frame_center_y,
      z: frame.position.z,
    },
    // Look a little below the middle so the picture sits high and the caption card has room.
    look_at: { x: frame.position.x, y: hall.frame_center_y - 0.42, z: frame.position.z },
  };
}

function hold_for_frame(frame: placed_frame): number {
  if (frame.kind === "photo") {
    return 2600 + Math.min(1400, (frame.exhibit.caption?.length ?? 0) * 14);
  }
  const chars = (frame.exhibit.caption?.length ?? 0) + (frame.exhibit.body?.length ?? 0);
  return Math.round(clamp_unit((chars - 40) / 260) * 3200 + 3200);
}

/**
 * Build the guided stops.
 *
 * @param layout - Built layout.
 * @param view - Screen shape, so stops fit the frame to the screen.
 * @returns Stops in walk order.
 */
export function build_tour(layout: gallery_layout, view: tour_view): tour_stop[] {
  const stops: tour_stop[] = [];
  const eye = hall.eye;

  function push(stop: Omit<tour_stop, "travel_ms"> & { travel_ms?: number; min_ms?: number }): void {
    const previous = stops[stops.length - 1];
    const { min_ms, travel_ms, ...rest } = stop;
    const travel = previous ? (travel_ms ?? travel_time_ms(previous.position, stop.position, min_ms ?? 1800)) : 0;
    stops.push({ ...rest, travel_ms: travel });
  }

  layout.rooms.forEach((entry) => {

    if (entry.index === 0) {
      push({
        position: { x: 0, y: eye, z: entry.z_near - 1.4 },
        look_at: { x: 0, y: 2.3, z: entry.z_far },
        hold_ms: 0,
        pause: false,
        room_index: 0,
        kind: "walk",
        item_id: null,
      });
    }

    if (entry.type === "lobby") {
      push({
        position: { x: 0, y: eye, z: entry.z_near - entry.depth * 0.48 },
        look_at: { x: 0, y: 2.55, z: entry.z_far },
        hold_ms: 3200,
        pause: false,
        room_index: entry.index,
        kind: "view",
        item_id: `${entry.room.id}-title`,
        min_ms: 3000,
      });
    }

    entry.frames.forEach((frame) => {
      const stand = standoff_for(frame, view);
      const x = frame.wall === "left" ? frame.position.x + stand : frame.position.x - stand;
      push({
        position: { x, y: eye, z: Math.min(entry.z_near - 1, frame.position.z + 0.6) },
        look_at: { x: frame.position.x, y: hall.frame_center_y - 0.05, z: frame.position.z },
        hold_ms: hold_for_frame(frame),
        pause: false,
        room_index: entry.index,
        kind: "view",
        item_id: frame.id,
      });
    });

    if (entry.desk) {
      push({
        position: { x: entry.desk.x + 1.05, y: eye, z: entry.desk.z + 2.25 },
        look_at: { x: entry.desk.x, y: 0.9, z: entry.desk.z },
        hold_ms: 900,
        pause: true,
        room_index: entry.index,
        kind: "view",
        item_id: `${entry.room.id}-desk`,
        min_ms: 3000,
      });
    }

    if (entry.type === "finale" || !entry.has_door) {
      push({
        position: { x: 0, y: eye, z: entry.z_near - Math.min(3.8, entry.depth * 0.42) },
        look_at: { x: 0, y: 1.9, z: entry.z_far },
        hold_ms: 4200,
        pause: true,
        room_index: entry.index,
        kind: "view",
        item_id: `${entry.room.id}-closing`,
        min_ms: 3200,
      });
    }

    if (entry.has_door) {
      push({
        position: { x: 0, y: eye, z: entry.z_far + 1.3 },
        look_at: { x: 0, y: 1.6, z: entry.z_far - 4 },
        hold_ms: 0,
        pause: false,
        room_index: entry.index,
        kind: "door",
        item_id: null,
      });
      push({
        position: { x: 0, y: eye, z: entry.z_far - 1.4 },
        look_at: { x: 0, y: 1.6, z: entry.z_far - 5 },
        hold_ms: 0,
        pause: false,
        room_index: entry.index + 1,
        kind: "door",
        item_id: null,
      });
    }
  });

  return stops;
}

/**
 * Build the layout, stops, and clock times in one call.
 *
 * @param museum - Museum to walk.
 * @param view - Screen shape.
 * @returns Layout and timeline.
 */
export function plan_hall(museum: museum, view: tour_view): { layout: gallery_layout; timeline: tour_timeline } {
  const layout = build_layout(museum);
  return { layout, timeline: build_timeline(build_tour(layout, view)) };
}
