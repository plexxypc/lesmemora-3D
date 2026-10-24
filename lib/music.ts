import tracks_json from "../public/music/tracks.json";
import { parse_tracks } from "./tracks";
import type { library_track } from "./types";

/**
 * Read the built-in music catalog.
 * Edit `public/music/tracks.json` and drop audio files in `public/music`.
 * Do not accept visitor audio uploads.
 *
 * @returns Validated tracks.
 */
export function load_library_tracks(): library_track[] {
  return parse_tracks(tracks_json);
}
