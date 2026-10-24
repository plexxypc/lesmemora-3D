/**
 * Viewer and theme types for Les Memora.
 *
 * Samples are in-memory. Paid orders are JSON files that use the same exhibit
 * shape and point `image_src` at a public file. Later phases store an R2 key
 * in `image_key` instead.
 */

export const frame_styles = ["ornate", "simple", "polaroid", "gilded", "wood", "modern"] as const;

/** Visual frame drawn around a photo or milestone card. */
export type frame_style = (typeof frame_styles)[number];

export const motifs = ["petals", "stars", "leaves", "paper", "confetti", "rings", "windows", "hearth"] as const;

/** Ambient background motif. Each value has a CSS treatment in museum.css. */
export type motif = (typeof motifs)[number];

export const display_fonts = ["cormorant", "fraunces", "libre", "fredoka"] as const;

/** Display font key. The loader for these faces lives in lib/fonts.ts. */
export type display_font = (typeof display_fonts)[number];

export const body_fonts = ["outfit"] as const;

/** Body font key shared by every theme. */
export type body_font = (typeof body_fonts)[number];

export const music_moods = [
  "romantic",
  "warm",
  "playful",
  "gentle",
  "nostalgic",
  "celebratory",
  "tender",
  "reflective",
] as const;

/** Mood used to suggest a library track. */
export type music_mood = (typeof music_moods)[number];

export const room_types = ["lobby", "gallery", "timeline", "letter", "finale"] as const;

/** Room kind in walk order. Gallery may repeat; the others appear once. */
export type room_type = (typeof room_types)[number];

export const exhibit_kinds = ["photo", "milestone", "letter", "note"] as const;

/** What an exhibit is. Photos use an image; letters and notes use body text. */
export type exhibit_kind = (typeof exhibit_kinds)[number];

export const image_modes = ["current", "next", "previous", "far"] as const;

/**
 * How eagerly a room should load images.
 * Only the current room and the next room preload pictures.
 */
export type image_mode = (typeof image_modes)[number];

/** Colors a theme paints onto the walk-through. */
export interface theme_palette {
  background: string;
  background_deep: string;
  surface: string;
  text: string;
  text_muted: string;
  accent: string;
  accent_soft: string;
  frame: string;
  frame_inner: string;
  door: string;
  ink: string;
}

/** CSS and SVG background description. No bitmap art. */
export interface theme_background {
  motif: motif;
  gradient: string;
}

/** Names and lines a new museum inherits from its theme. */
export interface theme_copy {
  dedication: string;
  enter_label: string;
  closing: string;
}

/** Short prompts the creator wizard will show later. */
export interface wizard_prompts {
  recipient: string;
  dedication: string;
  photo_caption: string;
  milestone: string;
  letter: string;
}

/**
 * One theme. Adding a theme means appending one of these objects
 * and reusing an existing font, frame style, and motif.
 */
export interface theme_config {
  id: string;
  name: string;
  tagline: string;
  palette: theme_palette;
  fonts: {
    display: display_font;
    body: body_font;
  };
  frame_style: frame_style;
  background: theme_background;
  default_room_names: Record<room_type, string>;
  default_copy: theme_copy;
  wizard_prompts: wizard_prompts;
  default_music_mood: music_mood;
}

/** A catalog track the creator can pick. Audio files are never user uploads. */
export interface library_track {
  id: string;
  title: string;
  mood: music_mood;
  file: string;
  license: string;
  credit: string;
  source_url: string;
}

/**
 * Music for a museum.
 * Library and YouTube play inside the mini-player.
 * Spotify and Apple Music use their official embeds. Audio files are not a source.
 */
export type music_config =
  | {
      source: "library";
      track_id: string;
    }
  | {
      source: "youtube";
      video_id: string;
      title: string;
    }
  | {
      source: "spotify";
      embed_url: string;
      title: string;
    }
  | {
      source: "apple";
      embed_url: string;
      title: string;
    };

/**
 * One framed item inside a room.
 * `image_src` is a resolved URL. Real uploads will keep the private object key in `image_key`.
 */
export interface exhibit {
  id: string;
  kind: exhibit_kind;
  image_key: string | null;
  image_src: string | null;
  caption: string | null;
  body: string | null;
  date: string | null;
  position: number;
}

/** A stop on the walk. */
export interface room {
  id: string;
  type: room_type;
  name: string;
  position: number;
  exhibits: exhibit[];
}

/** A museum the viewer can walk. Samples set `show_badge` the way the free plan will. */
export interface museum {
  id: string;
  slug: string;
  theme_id: string;
  title: string;
  recipient_name: string;
  dedication: string;
  music: music_config;
  rooms: room[];
  show_badge: boolean;
  cover_image: string;
}
