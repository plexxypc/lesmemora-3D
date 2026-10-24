import type { image_mode, museum, room } from "./types";

/**
 * Count photo exhibits. Milestone art is not counted toward the photo plan limit.
 *
 * @param museum - Museum to measure.
 * @returns How many photo exhibits have an image.
 */
export function count_photos(museum: museum): number {
  return museum.rooms.reduce((total, room) => {
    const photos = room.exhibits.filter((exhibit) => exhibit.kind === "photo" && exhibit.image_src);
    return total + photos.length;
  }, 0);
}

/**
 * Rooms in walk order.
 *
 * @param museum - Museum whose rooms should be ordered.
 * @returns Rooms sorted by position.
 */
export function ordered_rooms(museum: museum): room[] {
  return [...museum.rooms].sort((left, right) => left.position - right.position);
}

/**
 * Decide which images a panel may load.
 * Current and next preload. The previous room stays mounted for the swipe back.
 * Farther rooms render frames without fetching pictures.
 *
 * @param panel_index - Index of the room in walk order.
 * @param active_index - Index of the room in view.
 * @returns The loading mode for that room.
 */
export function image_mode_for(panel_index: number, active_index: number): image_mode {
  const delta = panel_index - active_index;
  if (delta === 0) {
    return "current";
  }
  if (delta === 1) {
    return "next";
  }
  if (delta === -1) {
    return "previous";
  }
  return "far";
}
