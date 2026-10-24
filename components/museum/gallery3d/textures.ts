import {
  CanvasTexture,
  ClampToEdgeWrapping,
  LinearFilter,
  LinearMipmapLinearFilter,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture,
} from "three";
import type { frame_style, motif, theme_palette } from "@/lib/types";

/** Draw target for generated textures. */
function make_canvas(width: number, height: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D is not available.");
  }
  return { canvas, ctx };
}

function to_texture(canvas: HTMLCanvasElement, srgb = true): CanvasTexture {
  const texture = new CanvasTexture(canvas);
  if (srgb) {
    texture.colorSpace = SRGBColorSpace;
  }
  texture.wrapS = ClampToEdgeWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.minFilter = LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

const shared = new Map<string, CanvasTexture>();

function cached(key: string, build: () => CanvasTexture): CanvasTexture {
  const hit = shared.get(key);
  if (hit) {
    return hit;
  }
  const made = build();
  shared.set(key, made);
  return made;
}

/** Free every shared texture. Call when the 3D viewer unmounts. */
export function dispose_shared_textures(): void {
  shared.forEach((texture) => texture.dispose());
  shared.clear();
}

/**
 * Soft round glow: white in the middle, clear at the edge.
 *
 * @returns A shared texture. Tint it with the material color.
 */
export function glow_texture(): CanvasTexture {
  return cached("glow", () => {
    const { canvas, ctx } = make_canvas(128, 128);
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.25, "rgba(255,255,255,0.5)");
    gradient.addColorStop(0.6, "rgba(255,255,255,0.12)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
    return to_texture(canvas);
  });
}

/**
 * Vertical fade used as an alpha map. Bright at the top of the plane, clear at the bottom.
 *
 * @returns A shared grayscale texture.
 */
export function beam_texture(): CanvasTexture {
  return cached("beam", () => {
    const { canvas, ctx } = make_canvas(8, 128);
    const gradient = ctx.createLinearGradient(0, 0, 0, 128);
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(0.55, "#4a4a4a");
    gradient.addColorStop(1, "#000000");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 8, 128);
    return to_texture(canvas, false);
  });
}

/**
 * Fade for floor reflections. Bright at the floor line, gone farther down.
 * Bottom of the plane is v=0, which is the bottom of the canvas.
 *
 * @returns A shared grayscale texture.
 */
export function reflection_fade_texture(): CanvasTexture {
  return cached("reflection", () => {
    const { canvas, ctx } = make_canvas(8, 64);
    const gradient = ctx.createLinearGradient(0, 0, 0, 64);
    gradient.addColorStop(0, "#000000");
    gradient.addColorStop(0.7, "#2a2a2a");
    gradient.addColorStop(1, "#ffffff");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 8, 64);
    return to_texture(canvas, false);
  });
}

/**
 * Sprite for a falling or drifting particle. White shapes, tinted per instance.
 *
 * @param kind - Theme motif.
 * @returns A shared texture.
 */
export function particle_texture(kind: motif): CanvasTexture {
  return cached(`particle-${kind}`, () => {
    const size = 64;
    const { canvas, ctx } = make_canvas(size, size);
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#ffffff";
    ctx.translate(size / 2, size / 2);
    if (kind === "petals") {
      ctx.beginPath();
      ctx.moveTo(0, -26);
      ctx.bezierCurveTo(22, -14, 20, 16, 0, 26);
      ctx.bezierCurveTo(-20, 16, -22, -14, 0, -26);
      ctx.fill();
    } else if (kind === "leaves") {
      ctx.beginPath();
      ctx.moveTo(0, -27);
      ctx.bezierCurveTo(24, -8, 16, 18, 0, 27);
      ctx.bezierCurveTo(-16, 18, -24, -8, 0, -27);
      ctx.fill();
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -22);
      ctx.lineTo(0, 26);
      ctx.stroke();
    } else if (kind === "paper") {
      ctx.fillRect(-16, -22, 32, 44);
      ctx.globalCompositeOperation = "destination-out";
      for (const line_y of [-10, 0, 10]) {
        ctx.fillRect(-10, line_y, 20, 2);
      }
    } else if (kind === "confetti") {
      ctx.fillRect(-9, -20, 18, 40);
    } else if (kind === "stars") {
      ctx.beginPath();
      for (let index = 0; index < 10; index += 1) {
        const radius = index % 2 === 0 ? 26 : 9;
        const angle = (index / 10) * Math.PI * 2 - Math.PI / 2;
        ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
      }
      ctx.closePath();
      ctx.fill();
    } else if (kind === "rings") {
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0, 0, 20, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 26);
      gradient.addColorStop(0, "rgba(255,255,255,1)");
      gradient.addColorStop(0.35, "rgba(255,255,255,0.55)");
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(-32, -32, 64, 64);
    }
    return to_texture(canvas);
  });
}

/**
 * Read a theme font family from the CSS variable next/font defined.
 *
 * @param key - Font key, such as "cormorant".
 * @returns A family list safe to put in a canvas font string.
 */
export function read_font_family(key: string): string {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(`--font-${key}`).trim();
  return raw ? `${raw}, Georgia, serif` : "Georgia, 'Times New Roman', serif";
}

/**
 * Wait for a font to be ready so canvas text uses it rather than a fallback.
 *
 * @param family - CSS font family list.
 * @returns A promise that settles when the font loaded or the wait gave up.
 */
export async function ensure_font(family: string): Promise<void> {
  if (!document.fonts?.load) {
    return;
  }
  try {
    await Promise.race([
      document.fonts.load(`600 48px ${family}`),
      new Promise<void>((resolve) => setTimeout(resolve, 1500)),
    ]);
  } catch {
    // Fall back to whatever the browser has.
  }
}

/**
 * Break text into lines that fit a width.
 *
 * @param ctx - Canvas context with the font already set.
 * @param text - Text to wrap.
 * @param max_width - Width in pixels.
 * @returns The lines.
 */
export function wrap_text(ctx: CanvasRenderingContext2D, text: string, max_width: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split(/\n+/)) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const trial = line ? `${line} ${word}` : word;
      if (ctx.measureText(trial).width > max_width && line) {
        lines.push(line);
        line = word;
      } else {
        line = trial;
      }
    }
    if (line) {
      lines.push(line);
    }
  }
  return lines;
}

export interface glow_text_options {
  lines: { text: string; size: number; weight?: number; color?: string; italic?: boolean }[];
  family: string;
  width: number;
  height: number;
  glow: string;
  color: string;
  line_gap?: number;
}

/**
 * Light-up lettering on a clear background.
 * Lines shrink until they fit the width.
 *
 * @param options - Lines, font, and colors.
 * @returns A new texture. The caller disposes it.
 */
export function glow_text_texture(options: glow_text_options): CanvasTexture {
  const { canvas, ctx } = make_canvas(options.width, options.height);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const fitted = options.lines.map((line) => {
    let size = line.size;
    const style = `${line.italic ? "italic " : ""}${line.weight ?? 600}`;
    ctx.font = `${style} ${size}px ${options.family}`;
    while (size > 18 && ctx.measureText(line.text).width > options.width * 0.9) {
      size -= 4;
      ctx.font = `${style} ${size}px ${options.family}`;
    }
    return { ...line, size, style };
  });
  const gap = options.line_gap ?? 1.25;
  const total = fitted.reduce((sum, line) => sum + line.size * gap, 0);
  let y = (options.height - total) / 2;
  for (const line of fitted) {
    y += (line.size * gap) / 2;
    ctx.font = `${line.style} ${line.size}px ${options.family}`;
    ctx.shadowColor = options.glow;
    ctx.shadowBlur = line.size * 0.55;
    ctx.fillStyle = line.color ?? options.color;
    ctx.fillText(line.text, options.width / 2, y);
    ctx.shadowBlur = line.size * 0.18;
    ctx.fillText(line.text, options.width / 2, y);
    y += (line.size * gap) / 2;
  }
  return to_texture(canvas);
}

export interface plaque_options {
  date: string | null;
  title: string | null;
  body: string | null;
  family: string;
  palette: theme_palette;
  width: number;
  height: number;
}

/**
 * A printed card for a timeline milestone or a dedication.
 *
 * @param options - Text, font, and palette.
 * @returns A new texture. The caller disposes it.
 */
export function plaque_texture(options: plaque_options): CanvasTexture {
  const { canvas, ctx } = make_canvas(options.width, options.height);
  const { palette } = options;
  const pad = options.width * 0.07;
  ctx.fillStyle = palette.surface;
  ctx.fillRect(0, 0, options.width, options.height);
  ctx.strokeStyle = palette.accent;
  ctx.globalAlpha = 0.65;
  ctx.lineWidth = 4;
  ctx.strokeRect(pad * 0.45, pad * 0.45, options.width - pad * 0.9, options.height - pad * 0.9);
  ctx.globalAlpha = 1;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  let y = pad;
  if (options.date) {
    ctx.fillStyle = palette.accent;
    ctx.font = `700 ${Math.round(options.height * 0.17)}px ${options.family}`;
    ctx.fillText(options.date, pad, y);
    y += options.height * 0.2;
  }
  if (options.title) {
    ctx.fillStyle = palette.ink;
    ctx.font = `700 ${Math.round(options.height * 0.105)}px ${options.family}`;
    for (const line of wrap_text(ctx, options.title, options.width - pad * 2).slice(0, 2)) {
      ctx.fillText(line, pad, y);
      y += options.height * 0.125;
    }
    y += options.height * 0.02;
  }
  if (options.body) {
    ctx.fillStyle = palette.ink;
    ctx.globalAlpha = 0.82;
    const size = Math.round(options.height * 0.074);
    ctx.font = `500 ${size}px ${options.family}`;
    const room_left = options.height - y - pad * 0.7;
    const max_lines = Math.max(1, Math.floor(room_left / (size * 1.28)));
    const lines = wrap_text(ctx, options.body, options.width - pad * 2);
    lines.slice(0, max_lines).forEach((line, index, shown) => {
      const last = index === shown.length - 1 && lines.length > shown.length;
      ctx.fillText(last ? `${line.replace(/[ ,.;:]+$/, "")}…` : line, pad, y + index * size * 1.28);
    });
  }
  return to_texture(canvas);
}

/**
 * Floor surface for a theme. Frame style picks the pattern.
 *
 * @param style - Theme frame style.
 * @param palette - Theme colors.
 * @returns A shared repeating texture, one tile per two meters.
 */
export function floor_texture(style: frame_style, palette: theme_palette): CanvasTexture {
  return cached(`floor-${style}-${palette.background}-${palette.accent_soft}`, () => {
    const size = 256;
    const { canvas, ctx } = make_canvas(size, size);
    const base = palette.background;
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, size, size);
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = palette.accent_soft;
    if (style === "ornate" || style === "gilded") {
      ctx.fillRect(0, 0, size / 2, size / 2);
      ctx.fillRect(size / 2, size / 2, size / 2, size / 2);
    } else if (style === "wood" || style === "simple") {
      for (let plank = 0; plank < 4; plank += 1) {
        ctx.globalAlpha = 0.06 + (plank % 2) * 0.07;
        ctx.fillRect(0, plank * (size / 4), size, size / 4);
      }
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = "#000000";
      for (let plank = 0; plank < 4; plank += 1) {
        ctx.fillRect(0, plank * (size / 4), size, 2);
        ctx.fillRect(((plank * 97) % size) | 0, plank * (size / 4), 2, size / 4);
      }
    } else {
      ctx.globalAlpha = 0.05;
      ctx.fillRect(0, 0, size, size);
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, size, 2);
      ctx.fillRect(0, 0, 2, size);
    }
    ctx.globalAlpha = 1;
    const texture = to_texture(canvas);
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    texture.generateMipmaps = true;
    texture.minFilter = LinearMipmapLinearFilter;
    texture.anisotropy = 4;
    return texture;
  });
}

/**
 * Stand-in for a picture that is missing or still loading.
 *
 * @param palette - Theme colors.
 * @returns A shared texture.
 */
export function placeholder_texture(palette: theme_palette): CanvasTexture {
  return cached(`placeholder-${palette.accent}-${palette.background}`, () => {
    const { canvas, ctx } = make_canvas(96, 64);
    const gradient = ctx.createLinearGradient(0, 0, 96, 64);
    gradient.addColorStop(0, palette.background);
    gradient.addColorStop(1, palette.door);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 96, 64);
    ctx.strokeStyle = palette.accent_soft;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 2;
    ctx.strokeRect(34, 20, 28, 22);
    ctx.beginPath();
    ctx.arc(42, 28, 3, 0, Math.PI * 2);
    ctx.stroke();
    return to_texture(canvas);
  });
}

interface photo_entry {
  texture: CanvasTexture | null;
  aspect: number;
  refs: number;
  failed: boolean;
  waiting: Set<() => void>;
  loading: boolean;
}

const photos = new Map<string, photo_entry>();

/** What a photo hook returns. */
export interface photo_state {
  texture: Texture | null;
  aspect: number;
  failed: boolean;
}

/**
 * Start loading a photo, shrunk to a size a phone can hold.
 * Counts users so the texture is freed when the last room using it unmounts.
 *
 * @param url - Image address.
 * @param max_px - Longest side after shrinking.
 * @param on_change - Called when the texture or failure state changes.
 * @returns A release function, and the entry for reading the current state.
 */
export function acquire_photo(url: string, max_px: number, on_change: () => void): { release: () => void; read: () => photo_state } {
  const key = `${max_px}:${url}`;
  let entry = photos.get(key);
  if (!entry) {
    entry = { texture: null, aspect: 1.5, refs: 0, failed: false, waiting: new Set(), loading: false };
    photos.set(key, entry);
  }
  const current = entry;
  current.refs += 1;
  current.waiting.add(on_change);
  if (current.texture || current.failed) {
    queueMicrotask(on_change);
  }
  if (!current.texture && !current.failed && !current.loading) {
    current.loading = true;
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.decoding = "async";
    image.onload = () => {
      const scale = Math.min(1, max_px / Math.max(image.naturalWidth, image.naturalHeight));
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));
      try {
        const { canvas, ctx } = make_canvas(width, height);
        ctx.drawImage(image, 0, 0, width, height);
        const texture = new CanvasTexture(canvas);
        texture.colorSpace = SRGBColorSpace;
        texture.anisotropy = 4;
        texture.minFilter = LinearMipmapLinearFilter;
        texture.generateMipmaps = true;
        texture.needsUpdate = true;
        current.texture = texture;
        current.aspect = image.naturalWidth / image.naturalHeight;
      } catch {
        current.failed = true;
      }
      current.loading = false;
      current.waiting.forEach((notify) => notify());
    };
    image.onerror = () => {
      current.failed = true;
      current.loading = false;
      current.waiting.forEach((notify) => notify());
    };
    image.src = url;
  }
  return {
    read: () => ({ texture: current.texture, aspect: current.aspect, failed: current.failed }),
    release: () => {
      current.waiting.delete(on_change);
      current.refs -= 1;
      if (current.refs <= 0) {
        current.texture?.dispose();
        photos.delete(key);
      }
    },
  };
}
