import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const width = 840;
const height = 560;
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "samples");

const themes = {
  romantic: { sky_top: "#4a2036", sky_bottom: "#f0b7c4", ground: "#6a3344", light: "#ffe6c4", accent: "#e28aa6", deep: "#241018", leaf: "#6d8a55", cream: "#f8efe6" },
  friendship: { sky_top: "#14383f", sky_bottom: "#8fd0c8", ground: "#1d4a46", light: "#fff1d6", accent: "#ff8b6a", deep: "#0c1c20", leaf: "#d06b45", cream: "#f7f1e6" },
  siblings: { sky_top: "#1d3a28", sky_bottom: "#d7e2b8", ground: "#3e5a32", light: "#fff4d2", accent: "#e2b15a", deep: "#101c14", leaf: "#2f6b3a", cream: "#f3ecdf" },
  parents: { sky_top: "#2a2744", sky_bottom: "#e7c9a4", ground: "#4a3b2a", light: "#ffe7c2", accent: "#e3a36a", deep: "#161424", leaf: "#6d7a4e", cream: "#f7f0e6" },
  grandparents: { sky_top: "#4a2c24", sky_bottom: "#e7cbb0", ground: "#5c3a2e", light: "#fff0d8", accent: "#c9896a", deep: "#241410", leaf: "#6e7a48", cream: "#f4e7d4" },
  birthday: { sky_top: "#2a2160", sky_bottom: "#ffb7d5", ground: "#3a2d78", light: "#fff3c4", accent: "#ff6b9a", deep: "#161036", leaf: "#ffd166", cream: "#fff6ea" },
  anniversary: { sky_top: "#3a241c", sky_bottom: "#f0d7a8", ground: "#4a3424", light: "#fff6df", accent: "#e4c78a", deep: "#1a1014", leaf: "#8a6a3a", cream: "#f7f1e6" },
  reliving: { sky_top: "#1c3148", sky_bottom: "#f0c48a", ground: "#2a3a4e", light: "#ffe1b0", accent: "#e7b57a", deep: "#121820", leaf: "#4e6a52", cream: "#efe6d8" },
};

const scenes = ["cover", "kitchen", "window", "path", "lake", "garden", "cake", "desk", "stars", "porch"];

function hex_to_rgb(hex) {
  const value = hex.replace("#", "");
  return [parseInt(value.slice(0, 2), 16), parseInt(value.slice(2, 4), 16), parseInt(value.slice(4, 6), 16)];
}

function mix(left, right, amount) {
  return [
    Math.round(left[0] + (right[0] - left[0]) * amount),
    Math.round(left[1] + (right[1] - left[1]) * amount),
    Math.round(left[2] + (right[2] - left[2]) * amount),
  ];
}

function create_canvas(palette) {
  const pixels = new Uint8ClampedArray(width * height * 4);
  const top = hex_to_rgb(palette.sky_top);
  const bottom = hex_to_rgb(palette.sky_bottom);
  for (let y = 0; y < height; y += 1) {
    const color = mix(top, bottom, y / height);
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      pixels[index] = color[0];
      pixels[index + 1] = color[1];
      pixels[index + 2] = color[2];
      pixels[index + 3] = 255;
    }
  }
  return pixels;
}

function paint(pixels) {
  function set_pixel(x, y, rgb) {
    const px = x | 0;
    const py = y | 0;
    if (px < 0 || py < 0 || px >= width || py >= height) {
      return;
    }
    const index = (py * width + px) * 4;
    pixels[index] = rgb[0];
    pixels[index + 1] = rgb[1];
    pixels[index + 2] = rgb[2];
    pixels[index + 3] = 255;
  }

  function fill_rect(x, y, rect_width, rect_height, rgb) {
    const x0 = Math.max(0, Math.floor(x));
    const y0 = Math.max(0, Math.floor(y));
    const x1 = Math.min(width, Math.ceil(x + rect_width));
    const y1 = Math.min(height, Math.ceil(y + rect_height));
    for (let py = y0; py < y1; py += 1) {
      for (let px = x0; px < x1; px += 1) {
        set_pixel(px, py, rgb);
      }
    }
  }

  function fill_circle(cx, cy, radius, rgb) {
    const radius_sq = radius * radius;
    const y0 = Math.max(0, Math.floor(cy - radius));
    const y1 = Math.min(height - 1, Math.ceil(cy + radius));
    const x0 = Math.max(0, Math.floor(cx - radius));
    const x1 = Math.min(width - 1, Math.ceil(cx + radius));
    for (let py = y0; py <= y1; py += 1) {
      const dy = py - cy;
      for (let px = x0; px <= x1; px += 1) {
        const dx = px - cx;
        if (dx * dx + dy * dy <= radius_sq) {
          set_pixel(px, py, rgb);
        }
      }
    }
  }

  function fill_triangle(x1, y1, x2, y2, x3, y3, rgb) {
    const points = [
      [x1, y1],
      [x2, y2],
      [x3, y3],
    ].sort((left, right) => left[1] - right[1]);
    const [ax, ay] = points[0];
    const [bx, by] = points[1];
    const [cx, cy] = points[2];
    const y_start = Math.max(0, Math.floor(ay));
    const y_end = Math.min(height - 1, Math.ceil(cy));
    function edge(y, x_start, y_start_edge, x_end, y_end_edge) {
      if (y_end_edge === y_start_edge) {
        return x_start;
      }
      const t = (y - y_start_edge) / (y_end_edge - y_start_edge);
      return x_start + (x_end - x_start) * t;
    }
    for (let py = y_start; py <= y_end; py += 1) {
      const long_x = edge(py, ax, ay, cx, cy);
      const short_x = py < by ? edge(py, ax, ay, bx, by) : edge(py, bx, by, cx, cy);
      const from = Math.max(0, Math.floor(Math.min(long_x, short_x)));
      const to = Math.min(width - 1, Math.ceil(Math.max(long_x, short_x)));
      for (let px = from; px <= to; px += 1) {
        set_pixel(px, py, rgb);
      }
    }
  }

  function vignette() {
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const dx = x / width - 0.5;
        const dy = y / height - 0.5;
        const amount = Math.min(0.55, (dx * dx + dy * dy) * 1.15);
        const index = (y * width + x) * 4;
        pixels[index] = pixels[index] * (1 - amount);
        pixels[index + 1] = pixels[index + 1] * (1 - amount);
        pixels[index + 2] = pixels[index + 2] * (1 - amount);
        if ((x * 13 + y * 7) % 19 === 0) {
          pixels[index] = Math.min(255, pixels[index] + 10);
        }
      }
    }
  }

  return { set_pixel, fill_rect, fill_circle, fill_triangle, vignette };
}

function nx(value) {
  return value * width;
}

function ny(value) {
  return value * height;
}

function draw_scene(pixels, scene, palette) {
  const tools = paint(pixels);
  const ground = hex_to_rgb(palette.ground);
  const light = hex_to_rgb(palette.light);
  const accent = hex_to_rgb(palette.accent);
  const deep = hex_to_rgb(palette.deep);
  const leaf = hex_to_rgb(palette.leaf);
  const cream = hex_to_rgb(palette.cream);
  const sky_top = hex_to_rgb(palette.sky_top);

  if (scene === "cover") {
    tools.fill_rect(0, ny(0.62), width, ny(0.38), ground);
    for (const [left, top, frame_width] of [
      [0.12, 0.16, 0.2],
      [0.4, 0.12, 0.22],
      [0.68, 0.18, 0.18],
    ]) {
      tools.fill_rect(nx(left), ny(top), nx(frame_width), ny(frame_width * 1.15), cream);
      tools.fill_rect(nx(left + 0.03), ny(top + 0.04), nx(frame_width - 0.06), ny(frame_width * 0.78), accent);
    }
    tools.fill_circle(nx(0.78), ny(0.2), nx(0.06), light);
  }

  if (scene === "kitchen") {
    tools.fill_rect(0, ny(0.58), width, ny(0.42), ground);
    tools.fill_rect(nx(0.58), ny(0.12), nx(0.24), ny(0.32), light);
    tools.fill_rect(nx(0.69), ny(0.12), nx(0.015), ny(0.32), deep);
    tools.fill_rect(nx(0.58), ny(0.26), nx(0.24), ny(0.015), deep);
    tools.fill_rect(nx(0.18), ny(0.58), nx(0.42), ny(0.08), cream);
    tools.fill_circle(nx(0.28), ny(0.56), nx(0.035), accent);
    tools.fill_circle(nx(0.4), ny(0.56), nx(0.035), deep);
  }

  if (scene === "window") {
    tools.fill_rect(0, 0, width, height, deep);
    tools.fill_rect(nx(0.22), ny(0.12), nx(0.56), ny(0.62), light);
    tools.fill_rect(nx(0.48), ny(0.12), nx(0.02), ny(0.62), deep);
    tools.fill_rect(nx(0.22), ny(0.4), nx(0.56), ny(0.02), deep);
    for (let streak = 0; streak < 9; streak += 1) {
      tools.fill_rect(nx(0.28 + streak * 0.05), ny(0.18 + (streak % 3) * 0.04), nx(0.008), ny(0.16), cream);
    }
    tools.fill_rect(nx(0.12), ny(0.62), nx(0.08), ny(0.22), leaf);
    tools.fill_circle(nx(0.16), ny(0.58), nx(0.07), leaf);
  }

  if (scene === "path") {
    tools.fill_rect(0, ny(0.55), width, ny(0.45), ground);
    tools.fill_triangle(nx(0.5), ny(0.95), nx(0.38), ny(0.55), nx(0.62), ny(0.55), cream);
    tools.fill_rect(nx(0.12), ny(0.34), nx(0.04), ny(0.24), deep);
    tools.fill_circle(nx(0.14), ny(0.3), nx(0.1), leaf);
    tools.fill_rect(nx(0.78), ny(0.38), nx(0.035), ny(0.2), deep);
    tools.fill_circle(nx(0.8), ny(0.34), nx(0.09), leaf);
    tools.fill_circle(nx(0.82), ny(0.16), nx(0.06), light);
  }

  if (scene === "lake") {
    tools.fill_rect(0, ny(0.48), width, ny(0.52), mix(ground, hex_to_rgb(palette.sky_bottom), 0.35));
    tools.fill_circle(nx(0.72), ny(0.24), nx(0.08), light);
    tools.fill_rect(0, ny(0.46), width, ny(0.04), deep);
    tools.fill_circle(nx(0.72), ny(0.7), nx(0.05), light);
    tools.fill_triangle(nx(0.08), ny(0.5), nx(0.2), ny(0.34), nx(0.34), ny(0.5), deep);
  }

  if (scene === "garden") {
    tools.fill_rect(0, ny(0.62), width, ny(0.38), ground);
    for (let flower = 0; flower < 5; flower += 1) {
      const left = 0.16 + flower * 0.15;
      tools.fill_rect(nx(left), ny(0.42), nx(0.012), ny(0.24), leaf);
      tools.fill_circle(nx(left + 0.006), ny(0.4), nx(0.045), flower % 2 === 0 ? accent : light);
      tools.fill_circle(nx(left + 0.006), ny(0.4), nx(0.016), cream);
    }
  }

  if (scene === "cake") {
    tools.fill_rect(0, ny(0.62), width, ny(0.38), ground);
    tools.fill_rect(nx(0.28), ny(0.58), nx(0.44), ny(0.06), cream);
    tools.fill_rect(nx(0.36), ny(0.4), nx(0.28), ny(0.18), accent);
    tools.fill_rect(nx(0.42), ny(0.28), nx(0.16), ny(0.12), light);
    tools.fill_rect(nx(0.495), ny(0.16), nx(0.012), ny(0.12), cream);
    tools.fill_circle(nx(0.5), ny(0.15), nx(0.025), hex_to_rgb("#ffd166"));
  }

  if (scene === "desk") {
    tools.fill_rect(0, ny(0.58), width, ny(0.42), ground);
    tools.fill_rect(nx(0.22), ny(0.42), nx(0.36), ny(0.22), cream);
    tools.fill_triangle(nx(0.22), ny(0.42), nx(0.4), ny(0.3), nx(0.58), ny(0.42), accent);
    tools.fill_rect(nx(0.68), ny(0.28), nx(0.03), ny(0.32), deep);
    tools.fill_circle(nx(0.695), ny(0.24), nx(0.06), light);
  }

  if (scene === "stars") {
    tools.fill_rect(0, 0, width, height, sky_top);
    tools.fill_circle(nx(0.74), ny(0.24), nx(0.09), light);
    tools.fill_circle(nx(0.78), ny(0.22), nx(0.07), sky_top);
    for (let star = 0; star < 18; star += 1) {
      const sx = ((star * 97) % 80) / 100;
      const sy = ((star * 53) % 42) / 100;
      tools.fill_circle(nx(0.08 + sx), ny(0.08 + sy), nx(0.008), cream);
    }
    tools.fill_triangle(0, ny(0.78), nx(0.3), ny(0.62), nx(0.55), height, deep);
    tools.fill_triangle(nx(0.4), height, nx(0.7), ny(0.66), width, ny(0.9), ground);
  }

  if (scene === "porch") {
    tools.fill_rect(0, ny(0.7), width, ny(0.3), ground);
    tools.fill_rect(nx(0.22), ny(0.32), nx(0.5), ny(0.4), deep);
    tools.fill_triangle(nx(0.16), ny(0.34), nx(0.47), ny(0.14), nx(0.78), ny(0.34), accent);
    tools.fill_rect(nx(0.42), ny(0.48), nx(0.12), ny(0.24), light);
    tools.fill_rect(nx(0.18), ny(0.7), nx(0.64), ny(0.04), cream);
  }

  tools.vignette();
}

function crc32(buffer) {
  let crc = ~0;
  for (let index = 0; index < buffer.length; index += 1) {
    crc ^= buffer[index];
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return ~crc >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const type_buffer = Buffer.from(type);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([type_buffer, data])), 0);
  return Buffer.concat([length, type_buffer, data, crc]);
}

function encode_png(pixels) {
  const row_bytes = width * 4;
  const raw = Buffer.alloc((row_bytes + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const dest = y * (row_bytes + 1);
    raw[dest] = 0;
    Buffer.from(pixels.buffer, pixels.byteOffset + y * row_bytes, row_bytes).copy(raw, dest + 1);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    signature,
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 6 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

for (const [theme_id, palette] of Object.entries(themes)) {
  const directory = join(root, theme_id);
  mkdirSync(directory, { recursive: true });
  for (const scene of scenes) {
    const pixels = create_canvas(palette);
    draw_scene(pixels, scene, palette);
    const file_path = join(directory, `${scene}.png`);
    writeFileSync(file_path, encode_png(pixels));
    console.log(`wrote ${theme_id}/${scene}.png`);
  }
}
