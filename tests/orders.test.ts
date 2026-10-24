import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import sharp from "sharp";
import { share_description } from "../lib/brand";
import { default_expires_at } from "../lib/build_order";
import { order_contact_links, public_contact_links } from "../lib/contact";
import { order_status_label } from "../lib/order_inbox";
import { apple_embed_url, spotify_embed_url, youtube_video_id } from "../lib/music_links";
import { decide_access, load_sealed_order, museum_from_order, order_file_exists, order_file_path, orders_directory, seal_order } from "../lib/order_access";
import { cookie_grants, hash_password, sign_gate_cookie } from "../lib/order_gate";
import { format_order_issues, parse_draft_order, parse_published_order, type published_order } from "../lib/order_schema";
import { process_photo } from "../lib/process_photo";
import { get_sample_museum } from "../lib/sample_museums";
import { share_message } from "../lib/share";
import { create_order_slug, is_public_slug } from "../lib/slug";
import { ZodError } from "zod";

const letter = "LETTER_SHOULD_NOT_LEAK";
const dedication = "DEDICATION_SHOULD_NOT_LEAK";
const notes = "NOTES_SHOULD_NOT_LEAK";
const password = "secret-word";

function order_fixture(slug = "abcdefghijkl"): published_order {
  return {
    slug,
    theme_id: "romantic",
    title: "For Quinn",
    recipient_name: "Quinn",
    dedication,
    music: { type: "library", track_id: "soft_room" },
    plan: "paid",
    show_badge: false,
    created_at: "2026-01-01T00:00:00.000Z",
    expires_at: "2027-01-01T00:00:00.000Z",
    password,
    notes,
    rooms: [
      { id: `${slug}-room-0`, type: "lobby", name: "Door", position: 0, exhibits: [] },
      {
        id: `${slug}-room-1`,
        type: "gallery",
        name: "Room",
        position: 1,
        exhibits: [
          {
            id: `${slug}-x-1`,
            kind: "photo",
            image_src: `/o/${slug}/aaaaaaaaaaaa.webp`,
            caption: "CAPTION_SHOULD_NOT_LEAK",
            body: null,
            date: "2024-01-01",
            position: 0,
          },
        ],
      },
      {
        id: `${slug}-room-2`,
        type: "timeline",
        name: "Years",
        position: 2,
        exhibits: [
          {
            id: `${slug}-x-2`,
            kind: "milestone",
            image_src: null,
            caption: "Met",
            body: null,
            date: "2020-01-01",
            position: 0,
          },
        ],
      },
      {
        id: `${slug}-room-3`,
        type: "letter",
        name: "Letter",
        position: 3,
        exhibits: [
          {
            id: `${slug}-x-3`,
            kind: "letter",
            image_src: null,
            caption: null,
            body: letter,
            date: null,
            position: 0,
          },
        ],
      },
      {
        id: `${slug}-room-4`,
        type: "finale",
        name: "End",
        position: 4,
        exhibits: [
          {
            id: `${slug}-x-4`,
            kind: "note",
            image_src: null,
            caption: null,
            body: "Come back any time.",
            date: null,
            position: 0,
          },
        ],
      },
    ],
  };
}

test("order slugs are long and URL-safe", () => {
  const seen = new Set<string>();
  for (let index = 0; index < 30; index += 1) {
    const slug = create_order_slug();
    assert.equal(slug.length >= 12, true);
    assert.equal(is_public_slug(slug), true);
    assert.equal(seen.has(slug), false);
    seen.add(slug);
  }
  assert.equal(is_public_slug("short"), false);
  assert.equal(is_public_slug("../etc/passwd"), false);
  assert.equal(is_public_slug("sample-romantic"), true);
  assert.equal(order_file_path("../etc/passwd"), null);
});

test("order files fail with a field path and a readable reason", () => {
  const broken = order_fixture();
  broken.theme_id = "not-a-theme";
  broken.music = { type: "youtube", url: "https://example.com/not-youtube" };
  assert.throws(() => parse_published_order(broken), (error: unknown) => {
    assert.ok(error instanceof Error);
    assert.match(error.message, /theme_id: Unknown theme/);
    assert.match(error.message, /music\.url: Use an 11-character YouTube id/);
    return true;
  });
  assert.throws(() => parse_draft_order({ theme_id: "romantic" }), /title:/);
  const too_many = order_fixture();
  too_many.plan = "free";
  const gallery = too_many.rooms[1];
  if (!gallery) {
    assert.fail("missing gallery");
  }
  gallery.exhibits = Array.from({ length: 21 }, (_, index) => ({
    id: `photo-${index}-id`,
    kind: "photo" as const,
    image_src: `/o/${too_many.slug}/aaaaaaaaaaaa.webp`,
    caption: null,
    body: null,
    date: null,
    position: index,
  }));
  assert.throws(() => parse_published_order(too_many), /free plan allows 20 photos/);
});

test("music links accept official players and reject everything else", () => {
  assert.equal(youtube_video_id("abcdefghijk"), "abcdefghijk");
  assert.equal(youtube_video_id("https://youtu.be/abcdefghijk"), "abcdefghijk");
  assert.equal(youtube_video_id("https://www.youtube.com/watch?v=abcdefghijk"), "abcdefghijk");
  assert.equal(spotify_embed_url("https://open.spotify.com/track/1111111111111111111111"), "https://open.spotify.com/embed/track/1111111111111111111111");
  assert.equal(
    apple_embed_url("https://music.apple.com/us/album/song/123"),
    "https://embed.music.apple.com/us/album/song/123",
  );
  assert.equal(spotify_embed_url("https://evil.example/track/1"), null);
  assert.equal(youtube_video_id("/music/song.mp3"), null);
});

test("expired orders and a locked gate carry no exhibit content", () => {
  const parsed = parse_published_order(order_fixture());
  const sealed = seal_order(parsed);
  assert.equal("password" in sealed, false);
  assert.equal("notes" in sealed, false);
  assert.equal(sealed.password_hash, hash_password(password, parsed.slug));

  const now = new Date("2026-06-01T00:00:00.000Z");
  const locked = decide_access(sealed, now, undefined);
  assert.equal(locked.status, "locked");
  assert.equal(JSON.stringify(locked).includes(letter), false);
  assert.equal(JSON.stringify(locked).includes(dedication), false);
  assert.equal(JSON.stringify(locked).includes(notes), false);
  assert.equal(JSON.stringify(locked).includes(password), false);
  assert.equal(JSON.stringify(locked).includes("CAPTION_SHOULD_NOT_LEAK"), false);

  const cookie = sealed.password_hash ? sign_gate_cookie(sealed.slug, sealed.password_hash, now) : "";
  const open = decide_access(sealed, now, cookie);
  assert.equal(open.status, "open");
  if (open.status === "open") {
    assert.equal(JSON.stringify(open.museum).includes(letter), true);
    assert.equal(JSON.stringify(open.museum).includes(notes), false);
    assert.equal(JSON.stringify(open.museum).includes(password), false);
    assert.equal(open.museum.show_badge, false);
    assert.equal(share_message(open.museum), `For Quinn - ${share_description}`);
  }
  assert.equal(decide_access(sealed, now, "tampered").status, "locked");

  const paused = decide_access(sealed, new Date("2028-01-01T00:00:00.000Z"), cookie);
  assert.deepEqual(paused, { status: "paused", slug: parsed.slug });
  assert.equal(JSON.stringify(paused).includes(letter), false);
  assert.equal(JSON.stringify(museum_from_order(sealed)).includes(notes), false);
});

test("a saved order file is hashed on read and samples still open", () => {
  const slug = "zztestdiskord1";
  const directory = orders_directory();
  mkdirSync(directory, { recursive: true });
  const path = join(directory, `${slug}.json`);
  const fixture = order_fixture(slug);
  writeFileSync(path, JSON.stringify(fixture));
  try {
    const sealed = load_sealed_order(slug);
    assert.ok(sealed);
    assert.equal(sealed.password_hash, hash_password(password, slug));
    const paused = decide_access({ ...sealed, expires_at: "2020-01-02" }, new Date("2026-01-01T00:00:00.000Z"), undefined);
    assert.equal(paused.status, "paused");
    assert.equal(JSON.stringify(paused).includes(letter), false);
    assert.equal(cookie_grants(undefined, slug, sealed.password_hash ?? "", new Date()), false);
  } finally {
    rmSync(path, { force: true });
  }
  const sample = get_sample_museum("sample-romantic");
  assert.ok(sample);
  assert.ok(sample.rooms.length >= 5);
  assert.equal(order_file_exists("sample-romantic"), false);
  assert.equal(order_file_exists("not-a-real-museum-slug"), false);
});

test("default expiry is 7 days for free and one year for paid", () => {
  const created = new Date("2026-01-01T00:00:00.000Z");
  assert.equal(default_expires_at("free", created), "2026-01-08T00:00:00.000Z");
  assert.equal(default_expires_at("paid", created), "2027-01-01T00:00:00.000Z");
  assert.equal(public_contact_links().length, 0);
  const order_links = order_contact_links();
  assert.equal(order_links.length, 1);
  assert.equal(order_links[0]?.platform, "whatsapp");
  assert.match(order_links[0]?.href ?? "", /wa\.me\/2349033539305/);
  assert.equal(order_status_label(Date.parse("2020-01-01T00:00:00.000Z"), created), "expired");
  assert.equal(order_status_label(Date.parse("2026-01-03T00:00:00.000Z"), created), "expiring within 7 days");
  assert.equal(order_status_label(Date.parse("2026-02-01T00:00:00.000Z"), created), "active");
});

test("published photos are resized WebP files without EXIF", async () => {
  const directory = mkdtempSync(join(tmpdir(), "les-memora-"));
  const source = join(directory, "in.jpg");
  const destination = join(directory, "nested", "out.webp");
  try {
    await sharp({
      create: { width: 2000, height: 1000, channels: 3, background: { r: 40, g: 10, b: 20 } },
    })
      .jpeg()
      .withMetadata({ exif: { IFD0: { ImageDescription: "location-secret" } } })
      .toFile(source);
    const saved = await process_photo(source, destination);
    assert.equal(saved.width, 1600);
    assert.equal(saved.height, 800);
    const metadata = await sharp(readFileSync(destination)).metadata();
    assert.equal(metadata.format, "webp");
    assert.equal(metadata.exif, undefined);
    assert.equal(metadata.width, 1600);
  } finally {
    await remove_temp_dir(directory);
  }
});

async function remove_temp_dir(directory: string): Promise<void> {
  await rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }).catch(() => undefined);
}

test("format_order_issues names the field", () => {
  const error = new ZodError([
    { code: "custom", path: ["rooms", 0, "name"], message: "Name this room." },
  ]);
  assert.equal(format_order_issues(error), "rooms.0.name: Name this room.");
});
