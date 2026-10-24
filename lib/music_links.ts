/**
 * Turn a pasted music link into the id or embed URL the player can use.
 * Audio files are never accepted.
 */

/**
 * Read a YouTube id from a bare id or a youtube.com / youtu.be URL.
 *
 * @param input - Id or URL from the order file.
 * @returns The 11-character id, or null when the link is not YouTube.
 */
export function youtube_video_id(input: string): string | null {
  const trimmed = input.trim();
  if (/^[\w-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return null;
  }
  const host = url.hostname.replace(/^www\./, "");
  if (host === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0] ?? "";
    return /^[\w-]{11}$/.test(id) ? id : null;
  }
  if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
    const from_query = url.searchParams.get("v") ?? "";
    if (/^[\w-]{11}$/.test(from_query)) {
      return from_query;
    }
    const parts = url.pathname.split("/").filter(Boolean);
    const marker = parts[0];
    if ((marker === "embed" || marker === "shorts" || marker === "live") && parts[1] && /^[\w-]{11}$/.test(parts[1])) {
      return parts[1];
    }
  }
  return null;
}

/**
 * Accept a Spotify embed URL, or convert an open.spotify.com track, album, playlist, or episode link.
 *
 * @param input - URL from the order file.
 * @returns A canonical embed URL, or null when the host is not Spotify.
 */
export function spotify_embed_url(input: string): string | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.hostname !== "open.spotify.com") {
    return null;
  }
  const parts = url.pathname.split("/").filter(Boolean);
  const kinds = ["track", "album", "playlist", "episode"];
  if (parts[0] === "embed" && parts[1] && parts[2] && kinds.includes(parts[1])) {
    return `https://open.spotify.com/embed/${parts[1]}/${parts[2]}`;
  }
  if (parts[0] && parts[1] && kinds.includes(parts[0])) {
    return `https://open.spotify.com/embed/${parts[0]}/${parts[1]}`;
  }
  return null;
}

/**
 * Accept an Apple Music embed URL, or convert a music.apple.com link into one.
 *
 * @param input - URL from the order file.
 * @returns An embed URL, or null when the host is not Apple Music.
 */
export function apple_embed_url(input: string): string | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:") {
    return null;
  }
  if (url.hostname === "embed.music.apple.com") {
    return url.toString();
  }
  if (url.hostname === "music.apple.com") {
    return `https://embed.music.apple.com${url.pathname}${url.search}`;
  }
  return null;
}
