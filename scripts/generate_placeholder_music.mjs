import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const sample_rate = 22050;
const duration_seconds = 8;
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "music");

/**
 * A quiet original tone so the player has something to loop.
 * Replace the wav files before launch and update tracks.json credits.
 *
 * @param {number} time_seconds
 * @param {"soft" | "warm" | "bright"} kind
 * @returns {number}
 */
function tone_at(time_seconds, kind) {
  const tremolo = 0.86 + 0.14 * Math.sin(2 * Math.PI * 0.12 * time_seconds);
  const chords = {
    soft: [220, 261.63, 329.63, 440],
    warm: [146.83, 220, 293.66, 369.99],
    bright: [261.63, 329.63, 392, 523.25],
  };
  const frequencies = chords[kind];
  let sample = 0;
  for (const frequency of frequencies) {
    sample += Math.sin(2 * Math.PI * frequency * time_seconds);
    sample += 0.18 * Math.sin(2 * Math.PI * frequency * 2 * time_seconds);
  }
  return (sample / frequencies.length) * 0.16 * tremolo;
}

/**
 * @param {"soft" | "warm" | "bright"} kind
 * @returns {Buffer}
 */
function render_wav(kind) {
  const total = sample_rate * duration_seconds;
  const pcm = Buffer.alloc(total * 2);
  const edge = Math.floor(sample_rate * 0.35);
  for (let index = 0; index < total; index += 1) {
    const time_seconds = index / sample_rate;
    let envelope = 1;
    if (index < edge) {
      envelope = index / edge;
    } else if (index > total - edge) {
      envelope = (total - index) / edge;
    }
    const value = Math.max(-1, Math.min(1, tone_at(time_seconds, kind) * envelope));
    pcm.writeInt16LE(Math.round(value * 32767), index * 2);
  }

  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sample_rate, 24);
  header.writeUInt32LE(sample_rate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

for (const kind of ["soft", "warm", "bright"]) {
  const file_path = join(root, `placeholder_${kind}.wav`);
  writeFileSync(file_path, render_wav(kind));
  console.log(`wrote ${file_path}`);
}
