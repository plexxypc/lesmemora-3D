import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  empty_intake,
  format_intake_message,
  intake_problems,
  intake_to_draft,
  letter_limit,
  music_from_text,
  parse_intake_message,
  type intake_form,
} from "../lib/intake";
import { find_order_problems, natural_sort, placeholder_pattern } from "../lib/order_checks";
import { parse_draft_order } from "../lib/order_schema";

function sample_form(): intake_form {
  return {
    ...empty_intake(),
    customer_name: "Paul",
    package_id: "keep_1_year",
    theme_id: "friendship",
    occasion: "Birthday",
    recipient_name: "Maya",
    from_name: "Paul",
    title: "Maya, Every Day",
    dedication: "For the Tuesday that became the day I wanted to keep.",
    need_by: "2026-11-10",
    music: "https://youtu.be/dQw4w9WgXcQ",
    password: "tulip",
    photo_captions: ["Our first coffee", "", "The long drive"],
    milestones: [
      { date: "2016-04-02", title: "First coffee", detail: "It went cold." },
      { date: "2020-06-01", title: "The move", detail: "" },
    ],
    letter_title: "Read this aloud",
    letter: "Maya,\n\nI keep trying to write something grand.\nThen I remember the way you laugh.",
    closing_note: "Stay as long as you like.",
  };
}

describe("order form message", () => {
  it("reads back exactly what it wrote", () => {
    const form = sample_form();
    const parsed = parse_intake_message(format_intake_message(form));
    assert.deepEqual(parsed, form);
  });

  it("keeps blank captions in their place", () => {
    const parsed = parse_intake_message(format_intake_message(sample_form()));
    assert.deepEqual(parsed.photo_captions, ["Our first coffee", "", "The long drive"]);
  });

  it("copes with a form that has no photos, milestones, letter, or note", () => {
    const form = { ...empty_intake(), customer_name: "Ada", recipient_name: "Tolu" };
    const parsed = parse_intake_message(format_intake_message(form));
    assert.equal(parsed.recipient_name, "Tolu");
    assert.deepEqual(parsed.milestones, []);
    assert.equal(parsed.letter, "");
    assert.equal(parsed.closing_note, "");
  });

  it("rejects text that is not an order form", () => {
    assert.throws(() => parse_intake_message("hello, I want a museum"), /order form/i);
  });

  it("asks for the missing names and an over-long letter", () => {
    assert.equal(intake_problems(sample_form()).length, 0);
    const bad = { ...sample_form(), customer_name: "", recipient_name: "", letter: "x".repeat(letter_limit + 1) };
    assert.equal(intake_problems(bad).length, 3);
  });
});

describe("form to draft", () => {
  it("makes a draft that passes the order schema, with captions matched by position", () => {
    const draft = parse_draft_order(intake_to_draft(sample_form(), ["IMG-1.jpg", "IMG-2.jpg", "IMG-3.jpg"]));
    const gallery = draft.rooms.find((room) => room.type === "gallery");
    assert.equal(gallery?.exhibits.length, 3);
    assert.equal(gallery?.exhibits[0]?.caption, "Our first coffee");
    assert.equal(gallery?.exhibits[1]?.caption, undefined);
    assert.equal(draft.plan, "paid");
    assert.equal(draft.password, "tulip");
    assert.equal(draft.music.type, "youtube");
    assert.deepEqual(
      draft.rooms.map((room) => room.type),
      ["lobby", "gallery", "timeline", "letter", "finale"],
    );
  });

  it("spreads many photos over several galleries and never exceeds five", () => {
    const photos = Array.from({ length: 30 }, (_, index) => `p${index + 1}.jpg`);
    const draft = parse_draft_order(intake_to_draft({ ...sample_form(), package_id: "keep_1_year" }, photos));
    const galleries = draft.rooms.filter((room) => room.type === "gallery");
    assert.ok(galleries.length >= 2 && galleries.length <= 5);
    assert.equal(galleries.reduce((sum, room) => sum + room.exhibits.length, 0), 30);
  });

  it("leaves out the timeline and letter rooms when the customer wrote none", () => {
    const form = { ...sample_form(), milestones: [], letter: "" };
    const draft = parse_draft_order(intake_to_draft(form, ["a.jpg"]));
    assert.deepEqual(
      draft.rooms.map((room) => room.type),
      ["lobby", "gallery", "finale"],
    );
  });

  it("falls back to a library track when the music is not a link", () => {
    assert.equal(music_from_text("something by Burna Boy", "romantic").type, "library");
    assert.equal(music_from_text("https://open.spotify.com/track/abc", "romantic").type, "spotify");
  });
});

describe("order checks", () => {
  const draft = parse_draft_order(intake_to_draft(sample_form(), ["a.jpg", "b.jpg"]));

  it("passes a finished order", () => {
    const errors = find_order_problems(draft, ["a.jpg", "b.jpg", "order.json"]).filter((problem) => problem.level === "error");
    assert.equal(errors.length, 0);
  });

  it("blocks template text that was never replaced", () => {
    const unfinished = parse_draft_order({
      ...draft,
      rooms: draft.rooms.map((room) =>
        room.type === "letter" ? { ...room, exhibits: [{ kind: "letter", body: "Replace this letter." }] } : room,
      ),
    });
    const errors = find_order_problems(unfinished, ["a.jpg", "b.jpg"]).filter((problem) => problem.level === "error");
    assert.ok(errors.some((problem) => /template text/.test(problem.message)));
  });

  it("blocks photos that sit in the folder but not in the order", () => {
    const errors = find_order_problems(draft, ["a.jpg", "b.jpg", "extra.png"]).filter((problem) => problem.level === "error");
    assert.ok(errors.some((problem) => /extra\.png/.test(problem.message)));
  });

  it("recognises the template wording and sorts photo names the way people read them", () => {
    assert.ok(placeholder_pattern.test("Replace this caption."));
    assert.ok(!placeholder_pattern.test("We replaced the old sofa"));
    assert.deepEqual(natural_sort(["IMG_10.jpg", "IMG_2.jpg", "IMG_1.jpg"]), ["IMG_1.jpg", "IMG_2.jpg", "IMG_10.jpg"]);
  });
});
