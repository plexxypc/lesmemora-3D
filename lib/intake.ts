/**
 * The order form a customer fills in on the website.
 *
 * The form turns its answers into a plain-text WhatsApp message. The owner saves that
 * message into the customer's inbox folder, and `npm run intake` turns it back into an
 * order draft. Formatting and parsing live together here so they cannot drift apart.
 * This file has no Node or browser APIs, so the page and the scripts can both use it.
 */

import { brand_name } from "./brand";
import type { draft_exhibit, draft_order, draft_room } from "./order_schema";
import { plans } from "./plans";
import { get_theme, list_themes } from "./themes";

export const intake_title_line = `${brand_name.toUpperCase()} ORDER FORM`;

export interface intake_milestone {
  /** YYYY-MM-DD. */
  date: string;
  title: string;
  detail: string;
}

export interface intake_form {
  customer_name: string;
  package_id: string;
  theme_id: string;
  occasion: string;
  recipient_name: string;
  from_name: string;
  title: string;
  dedication: string;
  need_by: string;
  music: string;
  password: string;
  photo_captions: string[];
  milestones: intake_milestone[];
  letter_title: string;
  letter: string;
  closing_note: string;
}

/** Longest letter the form accepts. Longer letters are sent in the chat. */
export const letter_limit = 2500;
export const max_milestones = 8;
export const max_photo_rows = 30;

/**
 * A blank form.
 *
 * @returns Form values with the romantic style and the first plan selected.
 */
export function empty_intake(): intake_form {
  return {
    customer_name: "",
    package_id: plans[0]?.id ?? "free",
    theme_id: "romantic",
    occasion: "",
    recipient_name: "",
    from_name: "",
    title: "",
    dedication: "",
    need_by: "",
    music: "",
    password: "",
    photo_captions: [""],
    milestones: [],
    letter_title: "",
    letter: "",
    closing_note: "",
  };
}

function one_line(value: string): string {
  return value.replace(/\s*\n+\s*/g, " ").trim();
}

function block(value: string): string {
  return value.replace(/\r\n/g, "\n").trim();
}

/**
 * Problems that stop the form from being sent.
 *
 * @param form - Current form values.
 * @returns Messages in plain words. Empty when the form is ready.
 */
export function intake_problems(form: intake_form): string[] {
  const problems: string[] = [];
  if (!form.customer_name.trim()) {
    problems.push("Add your name so we know who is ordering.");
  }
  if (!form.recipient_name.trim()) {
    problems.push("Add the name of the person the museum is for.");
  }
  if (form.title.length > 120) {
    problems.push("Shorten the museum title to 120 characters.");
  }
  if (form.dedication.length > 400) {
    problems.push("Shorten the dedication line to 400 characters.");
  }
  if (form.letter.length > letter_limit) {
    problems.push(`The letter is over ${letter_limit} characters. Shorten it here, or send the full letter in the chat afterwards.`);
  }
  for (const milestone of form.milestones) {
    if (!milestone.title.trim() || !milestone.date) {
      problems.push("Every milestone needs a date and a short name. Fill it in or remove it.");
      break;
    }
  }
  return problems;
}

/**
 * Build the WhatsApp message.
 *
 * @param form - Form values.
 * @returns Text that reads well in a chat and that `parse_intake_message` can read back.
 */
export function format_intake_message(form: intake_form): string {
  const theme = get_theme(form.theme_id);
  const plan = plans.find((entry) => entry.id === form.package_id);
  const lines: string[] = [intake_title_line, "", "[ABOUT]"];
  const about: [string, string][] = [
    ["Name", form.customer_name],
    ["Package", plan ? plan.name : form.package_id],
    ["Style", theme ? theme.name : form.theme_id],
    ["Occasion", form.occasion],
    ["For", form.recipient_name],
    ["From", form.from_name],
    ["Museum title", form.title],
    ["Dedication", form.dedication],
    ["Need it by", form.need_by],
    ["Music", form.music],
    ["Password", form.password],
  ];
  for (const [label, value] of about) {
    lines.push(`${label}: ${one_line(value)}`);
  }
  const captions = form.photo_captions.map(one_line);
  while (captions.length > 0 && captions[captions.length - 1] === "") {
    captions.pop();
  }
  lines.push("", "[PHOTO CAPTIONS]");
  lines.push(...(captions.length > 0 ? captions.map((caption, index) => `${index + 1}. ${caption}`.trimEnd()) : ["(none)"]));
  lines.push("", "[MILESTONES]");
  const milestones = form.milestones.filter((milestone) => milestone.title.trim() && milestone.date);
  lines.push(
    ...(milestones.length > 0
      ? milestones.map((milestone) => `${milestone.date} | ${one_line(milestone.title)} | ${one_line(milestone.detail)}`)
      : ["(none)"]),
  );
  lines.push("", "[LETTER]", `Title: ${one_line(form.letter_title)}`, block(form.letter) || "(none)");
  lines.push("", "[CLOSING NOTE]", block(form.closing_note) || "(none)");
  lines.push("", "[END]", "", "I will send the photos next, in the same order as the captions.");
  return lines.join("\n");
}

/**
 * Read a message made by `format_intake_message`.
 *
 * @param text - The saved WhatsApp message.
 * @returns Form values. Unknown or missing parts become empty.
 */
export function parse_intake_message(text: string): intake_form {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\u00a0/g, " ");
  if (!normalized.toUpperCase().includes(intake_title_line)) {
    throw new Error(`This does not look like an order form message. It should start with "${intake_title_line}".`);
  }
  const sections = new Map<string, string[]>();
  let current = "";
  for (const raw of normalized.split("\n")) {
    const heading = /^\s*\[([A-Z ]+)\]\s*$/.exec(raw);
    if (heading?.[1]) {
      current = heading[1].trim();
      sections.set(current, []);
      continue;
    }
    if (current) {
      sections.get(current)?.push(raw);
    }
  }
  const form = empty_intake();
  form.photo_captions = [];

  const about = new Map<string, string>();
  for (const line of sections.get("ABOUT") ?? []) {
    const separator = line.indexOf(":");
    if (separator > 0) {
      about.set(line.slice(0, separator).trim().toLowerCase(), line.slice(separator + 1).trim());
    }
  }
  const get = (key: string): string => about.get(key) ?? "";
  form.customer_name = get("name");
  const plan_text = get("package").toLowerCase();
  form.package_id = plans.find((plan) => plan.name.toLowerCase() === plan_text || plan.id === plan_text)?.id ?? form.package_id;
  const style_text = get("style").toLowerCase();
  form.theme_id =
    list_themes().find((theme) => theme.name.toLowerCase() === style_text || theme.id === style_text)?.id ?? "romantic";
  form.occasion = get("occasion");
  form.recipient_name = get("for");
  form.from_name = get("from");
  form.title = get("museum title");
  form.dedication = get("dedication");
  form.need_by = get("need it by");
  form.music = get("music");
  form.password = get("password");

  for (const line of sections.get("PHOTO CAPTIONS") ?? []) {
    const match = /^\s*(\d+)[.)]\s*(.*)$/.exec(line);
    if (match) {
      form.photo_captions.push((match[2] ?? "").trim());
    }
  }

  for (const line of sections.get("MILESTONES") ?? []) {
    const parts = line.split("|").map((part) => part.trim());
    if (parts.length >= 2 && /^\d{4}-\d{2}-\d{2}$/.test(parts[0] ?? "")) {
      form.milestones.push({ date: parts[0] ?? "", title: parts[1] ?? "", detail: parts.slice(2).join(" | ") });
    }
  }

  const letter_lines = [...(sections.get("LETTER") ?? [])];
  const title_index = letter_lines.findIndex((line) => /^\s*Title:/i.test(line));
  if (title_index >= 0) {
    form.letter_title = (letter_lines[title_index] ?? "").replace(/^\s*Title:/i, "").trim();
    letter_lines.splice(title_index, 1);
  }
  const letter = letter_lines.join("\n").trim();
  form.letter = letter === "(none)" ? "" : letter;

  const closing = (sections.get("CLOSING NOTE") ?? []).join("\n").trim();
  form.closing_note = closing === "(none)" ? "" : closing;
  return form;
}

const gallery_size = 8;

/**
 * Turn a parsed form and the photos on disk into an order draft.
 * Photos are matched to captions by position.
 *
 * @param form - Parsed form values.
 * @param photo_files - Photo file names in the order they were sent.
 * @returns A draft ready for `parse_draft_order`.
 */
export function intake_to_draft(form: intake_form, photo_files: string[]): draft_order {
  const theme = get_theme(form.theme_id) ?? get_theme("romantic");
  if (!theme) {
    throw new Error("The romantic theme is missing, so the draft cannot be created.");
  }
  const names = theme.default_room_names;
  const recipient = form.recipient_name.trim() || "Someone special";
  const rooms: draft_room[] = [{ type: "lobby", name: names.lobby, exhibits: [] }];

  const photo_exhibits: draft_exhibit[] = photo_files.map((file, index) => {
    const caption = form.photo_captions[index]?.trim();
    return caption ? { kind: "photo", file, caption } : { kind: "photo", file };
  });
  const galleries = Math.min(5, Math.max(1, Math.ceil(photo_exhibits.length / gallery_size)));
  const per_gallery = Math.max(1, Math.ceil(photo_exhibits.length / galleries));
  for (let index = 0; index < galleries; index += 1) {
    rooms.push({
      type: "gallery",
      name: index === 0 ? names.gallery : `${names.gallery} ${index + 1}`,
      exhibits: photo_exhibits.slice(index * per_gallery, (index + 1) * per_gallery),
    });
  }

  const milestones = form.milestones.filter((milestone) => milestone.title.trim() && milestone.date).slice(0, max_milestones);
  if (milestones.length > 0) {
    rooms.push({
      type: "timeline",
      name: names.timeline,
      exhibits: milestones.map((milestone) => ({
        kind: "milestone" as const,
        caption: milestone.title.trim(),
        date: milestone.date,
        ...(milestone.detail.trim() ? { body: milestone.detail.trim() } : {}),
      })),
    });
  }
  if (form.letter.trim()) {
    rooms.push({
      type: "letter",
      name: names.letter,
      exhibits: [
        {
          kind: "letter",
          caption: form.letter_title.trim() || "A letter for you",
          body: form.letter.trim(),
        },
      ],
    });
  }
  rooms.push({
    type: "finale",
    name: names.finale,
    exhibits: [{ kind: "note", body: form.closing_note.trim() || theme.default_copy.closing }],
  });

  const notes = [
    `Customer: ${form.customer_name.trim() || "unknown"}`,
    form.occasion.trim() ? `Occasion: ${form.occasion.trim()}` : "",
    form.from_name.trim() ? `From: ${form.from_name.trim()}` : "",
    form.need_by.trim() ? `Needed by: ${form.need_by.trim()}` : "",
    form.music.trim() ? `Music request: ${form.music.trim()}` : "",
    `Package asked for: ${form.package_id}`,
  ]
    .filter(Boolean)
    .join(". ")
    .slice(0, 2000);

  const draft: draft_order = {
    theme_id: theme.id,
    title: form.title.trim() || `For ${recipient}`,
    recipient_name: recipient,
    dedication: form.dedication.trim() || theme.default_copy.dedication,
    plan: form.package_id === "free" ? "free" : "paid",
    music: music_from_text(form.music, theme.default_music_mood),
    rooms,
    notes,
  };
  if (form.password.trim()) {
    draft.password = form.password.trim();
  }
  return draft;
}

/**
 * Pick the music block for a request. A YouTube, Spotify, or Apple Music link is used as given.
 * Anything else falls back to a library track, and the request stays in the notes.
 *
 * @param text - What the customer typed.
 * @param mood - Theme mood, used to pick a library track.
 * @returns The music block for the draft.
 */
export function music_from_text(text: string, mood: string): draft_order["music"] {
  const link = /https?:\/\/\S+/.exec(text)?.[0];
  if (link) {
    if (/youtu\.?be/i.test(link)) {
      return { type: "youtube", url: link };
    }
    if (/open\.spotify\.com/i.test(link)) {
      return { type: "spotify", embed_url: link };
    }
    if (/music\.apple\.com/i.test(link)) {
      return { type: "apple", embed_url: link };
    }
  }
  const by_mood: Record<string, string> = { romantic: "soft_room", nostalgic: "warm_room", celebratory: "bright_room" };
  return { type: "library", track_id: by_mood[mood] ?? "soft_room" };
}
