import type { CSSProperties } from "react";
import type { display_font, theme_config } from "./types";

/**
 * Theme catalog.
 *
 * Add a theme by appending one object to `themes`. Reuse a display font,
 * frame style, and motif that already exist. No other file needs a change
 * for the walk-through, the preview card, or the sample builder.
 */
export const themes: readonly theme_config[] = [
  {
    id: "romantic",
    name: "Romantic",
    tagline: "A soft room for the person you choose twice.",
    palette: {
      background: "#2a1422",
      background_deep: "#160910",
      surface: "#f8e7ee",
      text: "#f6e8ee",
      text_muted: "#e3c3d0",
      accent: "#e28aa6",
      accent_soft: "#f3c5d4",
      frame: "#f4eadf",
      frame_inner: "#fffaf6",
      door: "#6d3148",
      ink: "#2a1422",
    },
    fonts: { display: "cormorant", body: "outfit" },
    frame_style: "ornate",
    background: {
      motif: "petals",
      gradient:
        "radial-gradient(900px 420px at 18% 8%, #5a2842 0%, transparent 58%), linear-gradient(180deg, #3a1828 0%, #1a0c14 100%)",
    },
    default_room_names: {
      lobby: "The Entrance",
      gallery: "The Gallery",
      timeline: "Our Hours",
      letter: "A Letter",
      finale: "Before You Go",
    },
    default_copy: {
      dedication: "For the ordinary days that became the story.",
      enter_label: "Enter",
      closing: "Stay as long as you like.",
    },
    wizard_prompts: {
      recipient: "Who is this museum for?",
      dedication: "A line they will read before they step inside.",
      photo_caption: "What should they remember when they see this?",
      milestone: "A date that still feels like a room you can walk into.",
      letter: "Write what you would say if the room were quiet.",
    },
    default_music_mood: "romantic",
  },
  {
    id: "friendship",
    name: "Friendship",
    tagline: "Inside jokes, long walks, and the seat you saved.",
    palette: {
      background: "#10262b",
      background_deep: "#081618",
      surface: "#e7f4f2",
      text: "#e8f6f4",
      text_muted: "#b7d4cf",
      accent: "#ff8b6a",
      accent_soft: "#ffd0c2",
      frame: "#f7f1e6",
      frame_inner: "#fffdf8",
      door: "#1e4d52",
      ink: "#10262b",
    },
    fonts: { display: "fraunces", body: "outfit" },
    frame_style: "polaroid",
    background: {
      motif: "stars",
      gradient:
        "radial-gradient(700px 380px at 80% 0%, #1d4e55 0%, transparent 60%), linear-gradient(180deg, #16383e 0%, #0b1c1f 100%)",
    },
    default_room_names: {
      lobby: "Come In",
      gallery: "Proof",
      timeline: "The Years",
      letter: "Unsent",
      finale: "Your Turn",
    },
    default_copy: {
      dedication: "For the friend who made the city feel smaller.",
      enter_label: "Come in",
      closing: "The door stays unlocked.",
    },
    wizard_prompts: {
      recipient: "Which friend are you building this for?",
      dedication: "The line you would write on a mixtape sleeve.",
      photo_caption: "What were you laughing about?",
      milestone: "A day you still retell the same way.",
      letter: "Say the thing the group chat was too loud for.",
    },
    default_music_mood: "playful",
  },
  {
    id: "siblings",
    name: "Siblings",
    tagline: "Shared rooms, old jokes, and the long way home.",
    palette: {
      background: "#14241c",
      background_deep: "#0b1510",
      surface: "#e7f0e4",
      text: "#e8f3e6",
      text_muted: "#c3d6be",
      accent: "#e2b15a",
      accent_soft: "#f0d7a4",
      frame: "#f3ecdf",
      frame_inner: "#fffaf3",
      door: "#3d5a32",
      ink: "#14241c",
    },
    fonts: { display: "fraunces", body: "outfit" },
    frame_style: "wood",
    background: {
      motif: "leaves",
      gradient:
        "radial-gradient(800px 400px at 10% 90%, #2c4a30 0%, transparent 55%), linear-gradient(180deg, #1c3326 0%, #0d1812 100%)",
    },
    default_room_names: {
      lobby: "The Landing",
      gallery: "Our House",
      timeline: "Growing Up",
      letter: "Between Us",
      finale: "See You At Home",
    },
    default_copy: {
      dedication: "For the person who knew the house before I did.",
      enter_label: "Open the door",
      closing: "Save me a seat.",
    },
    wizard_prompts: {
      recipient: "Which sibling is this for?",
      dedication: "A line only the two of you would fully get.",
      photo_caption: "What was happening just outside the frame?",
      milestone: "A birthday, a move, a summer you both remember.",
      letter: "Write the note you would leave on their door.",
    },
    default_music_mood: "warm",
  },
  {
    id: "parents",
    name: "Parents",
    tagline: "The kitchen light, still on.",
    palette: {
      background: "#1c1a2e",
      background_deep: "#100e1c",
      surface: "#f3eadf",
      text: "#f6efe6",
      text_muted: "#d9cbb8",
      accent: "#e3a36a",
      accent_soft: "#f3d2b0",
      frame: "#f7f0e6",
      frame_inner: "#fffaf4",
      door: "#4a3b2a",
      ink: "#1c1a2e",
    },
    fonts: { display: "libre", body: "outfit" },
    frame_style: "simple",
    background: {
      motif: "windows",
      gradient:
        "radial-gradient(640px 360px at 50% 0%, #3a3458 0%, transparent 62%), linear-gradient(180deg, #26243c 0%, #12101c 100%)",
    },
    default_room_names: {
      lobby: "Welcome Home",
      gallery: "The House",
      timeline: "The Years You Gave",
      letter: "Thank You",
      finale: "Come Back Anytime",
    },
    default_copy: {
      dedication: "For the one who kept the light on.",
      enter_label: "Come in",
      closing: "There is always a plate for you.",
    },
    wizard_prompts: {
      recipient: "Who are you thanking?",
      dedication: "The sentence you wish you said at the door.",
      photo_caption: "What did this room sound like?",
      milestone: "A first day, a move, a quiet anniversary.",
      letter: "Write the thank-you that got too big for a card.",
    },
    default_music_mood: "gentle",
  },
  {
    id: "grandparents",
    name: "Grandparents",
    tagline: "Recipes, nicknames, and the good chair.",
    palette: {
      background: "#2c1814",
      background_deep: "#180e0c",
      surface: "#f3e6d4",
      text: "#f6ecdf",
      text_muted: "#e0cbb6",
      accent: "#c9896a",
      accent_soft: "#efd3c2",
      frame: "#f4e7d4",
      frame_inner: "#fff8ef",
      door: "#5c3a2e",
      ink: "#2c1814",
    },
    fonts: { display: "cormorant", body: "outfit" },
    frame_style: "ornate",
    background: {
      motif: "paper",
      gradient:
        "radial-gradient(760px 380px at 70% 20%, #5a3a2c 0%, transparent 58%), linear-gradient(180deg, #3a221c 0%, #1a0e0c 100%)",
    },
    default_room_names: {
      lobby: "The Porch",
      gallery: "Kept Things",
      timeline: "A Long Life",
      letter: "In Your Hand",
      finale: "Come Sit",
    },
    default_copy: {
      dedication: "For the stories that were told more than once, on purpose.",
      enter_label: "Step inside",
      closing: "The chair by the window is yours.",
    },
    wizard_prompts: {
      recipient: "Who are you remembering or surprising?",
      dedication: "A line in the voice you use with them.",
      photo_caption: "What would they point at first?",
      milestone: "A year, a journey, a recipe that became a holiday.",
      letter: "Write as if you were reading it at their table.",
    },
    default_music_mood: "nostalgic",
  },
  {
    id: "birthday",
    name: "Birthday",
    tagline: "One year, held up to the light.",
    palette: {
      background: "#1b1440",
      background_deep: "#100c28",
      surface: "#f7e9ff",
      text: "#f6f0ff",
      text_muted: "#d4c6ef",
      accent: "#ff6b9a",
      accent_soft: "#ffd166",
      frame: "#fff6ea",
      frame_inner: "#ffffff",
      door: "#3a2d78",
      ink: "#1b1440",
    },
    fonts: { display: "fredoka", body: "outfit" },
    frame_style: "polaroid",
    background: {
      motif: "confetti",
      gradient:
        "radial-gradient(680px 320px at 20% 0%, #4c3d8a 0%, transparent 60%), linear-gradient(180deg, #261c52 0%, #120d2c 100%)",
    },
    default_room_names: {
      lobby: "The Party",
      gallery: "This Year",
      timeline: "Another Trip Around",
      letter: "Make a Wish",
      finale: "Blow Out the Candle",
    },
    default_copy: {
      dedication: "For the person the room gets brighter for.",
      enter_label: "Come celebrate",
      closing: "Same time next year.",
    },
    wizard_prompts: {
      recipient: "Whose birthday is it?",
      dedication: "The toast you want them to read first.",
      photo_caption: "What should the caption shout, quietly?",
      milestone: "A year that changed the map.",
      letter: "Write the wish you are not putting on the cake.",
    },
    default_music_mood: "celebratory",
  },
  {
    id: "anniversary",
    name: "Anniversary",
    tagline: "The years, set in a row like rooms.",
    palette: {
      background: "#1a1014",
      background_deep: "#0e090b",
      surface: "#f8f1e4",
      text: "#f8f1e4",
      text_muted: "#e4d3bc",
      accent: "#e4c78a",
      accent_soft: "#f3e2bf",
      frame: "#f7f1e6",
      frame_inner: "#fffdf8",
      door: "#4a3424",
      ink: "#1a1014",
    },
    fonts: { display: "libre", body: "outfit" },
    frame_style: "gilded",
    background: {
      motif: "rings",
      gradient:
        "radial-gradient(720px 360px at 50% 100%, #4a3420 0%, transparent 55%), linear-gradient(180deg, #2a1a1e 0%, #100a0c 100%)",
    },
    default_room_names: {
      lobby: "The Anniversary",
      gallery: "Still Life",
      timeline: "The Count of Years",
      letter: "To My Person",
      finale: "Again",
    },
    default_copy: {
      dedication: "For the life we kept choosing.",
      enter_label: "Enter",
      closing: "Here is to the next room.",
    },
    wizard_prompts: {
      recipient: "Who is walking this with you?",
      dedication: "The line you would have engraved.",
      photo_caption: "What lasted in this picture?",
      milestone: "A vow, a move, a year you still measure from.",
      letter: "Write the anniversary note you want reread.",
    },
    default_music_mood: "tender",
  },
  {
    id: "reliving",
    name: "Reliving Memories",
    tagline: "A corridor back to a place you can still smell.",
    palette: {
      background: "#141c2b",
      background_deep: "#0c121c",
      surface: "#e7eef6",
      text: "#e7eef8",
      text_muted: "#c5d0df",
      accent: "#e7b57a",
      accent_soft: "#f0d7b4",
      frame: "#efe6d8",
      frame_inner: "#fbf7f1",
      door: "#3d4c63",
      ink: "#141c2b",
    },
    fonts: { display: "fraunces", body: "outfit" },
    frame_style: "modern",
    background: {
      motif: "hearth",
      gradient:
        "radial-gradient(800px 420px at 80% 80%, #3a4a62 0%, transparent 55%), linear-gradient(180deg, #1c2738 0%, #0c121c 100%)",
    },
    default_room_names: {
      lobby: "The Way Back",
      gallery: "What Remains",
      timeline: "The Seasons",
      letter: "I Went Back",
      finale: "Leave the Light",
    },
    default_copy: {
      dedication: "For a place, and the person who made it one.",
      enter_label: "Walk in",
      closing: "You can visit whenever you need to.",
    },
    wizard_prompts: {
      recipient: "Who, or where, are you going back to?",
      dedication: "The sentence that opens the door.",
      photo_caption: "What do you still remember that the photo forgot?",
      milestone: "A summer, a goodbye, a return.",
      letter: "Write from the year you are standing in now.",
    },
    default_music_mood: "reflective",
  },
];

const display_stacks: Record<display_font, string> = {
  cormorant: "var(--font-cormorant), Georgia, serif",
  fraunces: "var(--font-fraunces), Georgia, serif",
  libre: "var(--font-libre), Georgia, serif",
  fredoka: "var(--font-fredoka), 'Trebuchet MS', sans-serif",
};

/**
 * CSS variables for a theme. Apply them on the viewer or a preview card.
 *
 * @param theme - Theme config to paint.
 * @returns A style object of `--mm-*` custom properties.
 */
export function theme_css_vars(theme: theme_config): CSSProperties {
  const style = {
    "--mm-bg": theme.palette.background,
    "--mm-bg-deep": theme.palette.background_deep,
    "--mm-surface": theme.palette.surface,
    "--mm-text": theme.palette.text,
    "--mm-text-muted": theme.palette.text_muted,
    "--mm-accent": theme.palette.accent,
    "--mm-accent-soft": theme.palette.accent_soft,
    "--mm-frame": theme.palette.frame,
    "--mm-frame-inner": theme.palette.frame_inner,
    "--mm-door": theme.palette.door,
    "--mm-ink": theme.palette.ink,
    "--mm-display": display_stacks[theme.fonts.display],
    "--mm-gradient": theme.background.gradient,
  };
  return style as CSSProperties;
}

/**
 * All themes in catalog order.
 *
 * @returns The theme list.
 */
export function list_themes(): readonly theme_config[] {
  return themes;
}

/**
 * Find a theme by id.
 *
 * @param theme_id - Theme id from a museum or a preview card.
 * @returns The theme, or null when the id is unknown.
 */
export function get_theme(theme_id: string): theme_config | null {
  return themes.find((theme) => theme.id === theme_id) ?? null;
}
