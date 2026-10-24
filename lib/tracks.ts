import { music_moods, type library_track, type music_config, type music_mood } from "./types";

/**
 * Moods that share one placeholder recording until a licensed file is added.
 * The map lets every theme mood resolve to a real catalog track.
 */
const mood_family: Record<music_mood, "romantic" | "nostalgic" | "celebratory"> = {
  romantic: "romantic",
  tender: "romantic",
  gentle: "romantic",
  nostalgic: "nostalgic",
  reflective: "nostalgic",
  warm: "nostalgic",
  celebratory: "celebratory",
  playful: "celebratory",
};

function is_record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function is_music_mood(value: string): value is music_mood {
  return (music_moods as readonly string[]).includes(value);
}

function required_string(item: Record<string, unknown>, key: string, id_hint: string, allow_empty = false): string {
  const value = item[key];
  if (typeof value !== "string" || (!allow_empty && value.trim() === "")) {
    throw new Error(`Track "${id_hint}" is missing a ${key}.`);
  }
  return value.trim();
}

/**
 * Validate the public music catalog.
 * Called when the server reads `public/music/tracks.json`.
 *
 * @param input - Parsed JSON.
 * @returns Catalog tracks.
 */
export function parse_tracks(input: unknown): library_track[] {
  if (!Array.isArray(input)) {
    throw new Error("tracks.json must be a JSON array.");
  }
  const seen = new Set<string>();
  return input.map((item, index) => {
    if (!is_record(item)) {
      throw new Error(`Track at index ${index} must be an object.`);
    }
    const id = typeof item.id === "string" && item.id.trim() !== "" ? item.id.trim() : `index ${index}`;
    const track_id = required_string(item, "id", id);
    if (seen.has(track_id)) {
      throw new Error(`Duplicate track id "${track_id}".`);
    }
    seen.add(track_id);
    const mood_value = required_string(item, "mood", track_id);
    if (!is_music_mood(mood_value)) {
      throw new Error(`Track "${track_id}" has an unknown mood "${mood_value}".`);
    }
    const file = required_string(item, "file", track_id);
    if (!file.startsWith("/music/")) {
      throw new Error(`Track "${track_id}" must use a file under /music/.`);
    }
    return {
      id: track_id,
      title: required_string(item, "title", track_id),
      mood: mood_value,
      file,
      license: required_string(item, "license", track_id),
      credit: required_string(item, "credit", track_id),
      source_url: required_string(item, "source_url", track_id, true),
    };
  });
}

/**
 * Resolve a library selection to a catalog row.
 *
 * @param tracks - Valid catalog.
 * @param music - Museum music config.
 * @returns The track, or null for YouTube and unknown ids.
 */
export function resolve_track(
  tracks: readonly library_track[],
  music: music_config,
): library_track | null {
  if (music.source !== "library") {
    return null;
  }
  return tracks.find((track) => track.id === music.track_id) ?? null;
}

/**
 * Suggest a catalog track for a theme mood.
 *
 * @param tracks - Valid catalog.
 * @param mood - Theme mood.
 * @returns The first matching track, or null when the catalog is empty.
 */
export function track_for_mood(tracks: readonly library_track[], mood: music_mood): library_track | null {
  const family = mood_family[mood];
  return tracks.find((track) => track.mood === family) ?? tracks[0] ?? null;
}
