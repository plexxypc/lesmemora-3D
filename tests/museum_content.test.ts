import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { share_description } from "../lib/brand";
import { count_photos, image_mode_for, ordered_rooms } from "../lib/panels";
import { plans } from "../lib/plans";
import { list_sample_museums } from "../lib/sample_museums";
import { public_museum_metadata, share_message } from "../lib/share";
import { list_themes } from "../lib/themes";
import { parse_tracks, resolve_track, track_for_mood } from "../lib/tracks";
import { display_fonts, exhibit_kinds, frame_styles, motifs, music_moods, room_types } from "../lib/types";

const css = readFileSync("app/museum.css", "utf8");
const tracks = parse_tracks(JSON.parse(readFileSync("public/music/tracks.json", "utf8")));

test("every theme is a single config object with a working preview", () => {
  const ids = new Set<string>();
  assert.equal(list_themes().length, 8);
  for (const theme of list_themes()) {
    assert.equal(ids.has(theme.id), false);
    ids.add(theme.id);
    assert.ok(frame_styles.includes(theme.frame_style));
    assert.ok(motifs.includes(theme.background.motif));
    assert.ok(display_fonts.includes(theme.fonts.display));
    assert.equal(theme.fonts.body, "outfit");
    assert.ok(music_moods.includes(theme.default_music_mood));
    assert.match(css, new RegExp(`frame_${theme.frame_style}`));
    assert.match(css, new RegExp(`data-motif="${theme.background.motif}"`));
    for (const room_type of room_types) {
      assert.ok(theme.default_room_names[room_type].length > 0);
    }
    for (const prompt of Object.values(theme.wizard_prompts)) {
      assert.ok(prompt.length > 0);
    }
  }
});

test("each theme has one fictional sample museum", () => {
  const museums = list_sample_museums();
  assert.equal(museums.length, list_themes().length);
  const slugs = new Set<string>();
  for (const museum of museums) {
    assert.equal(slugs.has(museum.slug), false);
    slugs.add(museum.slug);
    assert.ok(museum.slug.length >= 12);
    assert.ok(list_themes().some((theme) => theme.id === museum.theme_id));
    assert.ok(count_photos(museum) > 0);
    assert.ok(count_photos(museum) <= 20);
    const rooms = ordered_rooms(museum);
    const types = new Set(rooms.map((room) => room.type));
    for (const room_type of room_types) {
      assert.equal(types.has(room_type), true, `${museum.slug} missing ${room_type}`);
    }
    const galleries = rooms.filter((room) => room.type === "gallery");
    assert.ok(galleries.length >= 1 && galleries.length <= 5);
    const ids = new Set<string>();
    for (const room of rooms) {
      assert.equal(ids.has(room.id), false);
      ids.add(room.id);
      room.exhibits.forEach((exhibit, index) => {
        assert.equal(ids.has(exhibit.id), false);
        ids.add(exhibit.id);
        assert.equal(exhibit.position, index);
        assert.ok(exhibit_kinds.includes(exhibit.kind));
        if (exhibit.image_src) {
          const file_path = join("public", exhibit.image_src.replace(/^\//, ""));
          assert.equal(existsSync(file_path), true, file_path);
        }
      });
    }
    assert.equal(existsSync(join("public", museum.cover_image.replace(/^\//, ""))), true);
    const letters = rooms.find((room) => room.type === "letter");
    assert.ok(letters?.exhibits.some((exhibit) => exhibit.body && exhibit.body.length > 40));
  }
});

test("share metadata hides captions, letters, and dedications", () => {
  for (const museum of list_sample_museums()) {
    const meta = public_museum_metadata(museum);
    const message = share_message(museum);
    assert.equal(meta.title, museum.title);
    assert.equal(meta.description, share_description);
    assert.equal(message, `${museum.title} - ${share_description}`);
    assert.equal(meta.description.includes(museum.dedication), false);
    assert.equal(message.includes(museum.dedication), false);
    for (const room of museum.rooms) {
      for (const exhibit of room.exhibits) {
        if (exhibit.caption) {
          assert.equal(meta.description.includes(exhibit.caption), false);
          assert.equal(message.includes(exhibit.caption), false);
        }
        if (exhibit.body) {
          assert.equal(meta.description.includes(exhibit.body), false);
          assert.equal(message.includes(exhibit.body), false);
        }
      }
    }
  }
});

test("library tracks resolve and the files exist", () => {
  assert.ok(tracks.length >= 3);
  for (const track of tracks) {
    assert.equal(existsSync(join("public", track.file.replace(/^\//, ""))), true);
    assert.ok(music_moods.includes(track.mood));
  }
  for (const museum of list_sample_museums()) {
    if (museum.music.source === "library") {
      assert.ok(resolve_track(tracks, museum.music));
    }
  }
  for (const theme of list_themes()) {
    assert.ok(track_for_mood(tracks, theme.default_music_mood));
  }
});

test("only the current and next rooms preload", () => {
  assert.equal(image_mode_for(2, 2), "current");
  assert.equal(image_mode_for(3, 2), "next");
  assert.equal(image_mode_for(1, 2), "previous");
  assert.equal(image_mode_for(0, 2), "far");
  assert.equal(image_mode_for(4, 2), "far");
});

test("plan prices and limits live in one config", () => {
  const free = plans.find((plan) => plan.id === "free");
  const year = plans.find((plan) => plan.id === "keep_1_year");
  const monthly = plans.find((plan) => plan.id === "monthly");
  const yearly = plans.find((plan) => plan.id === "yearly");
  assert.equal(free?.photo_limit, 20);
  assert.equal(free?.show_badge, true);
  assert.equal(free?.video_export, false);
  assert.equal(free?.price_label, "$2");
  assert.equal(year?.price_label, "$12");
  assert.equal(year?.photo_limit, 100);
  assert.equal(monthly?.price_label, "$5");
  assert.equal(yearly?.price_label, "$40");
  for (const plan of plans) {
    if (plan.id !== "free") {
      assert.equal(plan.show_badge, false);
      assert.equal(plan.video_export, true);
      assert.equal(plan.photo_limit, 100);
    }
  }
});
