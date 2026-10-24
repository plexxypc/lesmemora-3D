import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { build_layout, build_tour, clamp_walk, hall, inspect_pose, room_index_at } from "../lib/gallery_layout";
import { build_timeline, pause_crossed, pose_at, next_mark_ms, previous_mark_ms } from "../lib/gallery_tour";
import { list_sample_museums } from "../lib/sample_museums";

const sample_museums = list_sample_museums();

const landscape = { vfov_deg: 62, aspect: 2.1 };
const portrait = { vfov_deg: 72, aspect: 0.46 };

describe("gallery layout", () => {
  for (const museum of sample_museums) {
    it(`${museum.slug}: rooms follow each other without gaps`, () => {
      const layout = build_layout(museum);
      assert.equal(layout.rooms.length, museum.rooms.length);
      layout.rooms.forEach((entry, index) => {
        const next = layout.rooms[index + 1];
        if (next) {
          assert.equal(entry.z_far, next.z_near);
        }
        assert.ok(entry.depth >= 9);
      });
    });

    it(`${museum.slug}: every photo and milestone gets a frame inside its room`, () => {
      const layout = build_layout(museum);
      for (const entry of layout.rooms) {
        const wanted = entry.room.exhibits.filter((item) => item.kind === "photo" || item.kind === "milestone").length;
        assert.equal(entry.frames.length, wanted);
        for (const frame of entry.frames) {
          assert.ok(frame.position.z < entry.z_near - 1.5, "frame is clear of the entrance");
          assert.ok(frame.position.z > entry.z_far + 1.5, "frame is clear of the door");
        }
      }
    });

    it(`${museum.slug}: the tour ends on a pause and only the last room has no door`, () => {
      const layout = build_layout(museum);
      const doorless = layout.rooms.filter((entry) => !entry.has_door);
      assert.equal(doorless.length, 1);
      for (const view of [landscape, portrait]) {
        const stops = build_tour(layout, view);
        assert.equal(stops[stops.length - 1]?.pause, true);
        assert.ok(stops.every((stop) => Math.abs(stop.position.x) <= hall.width / 2));
      }
    });
  }
});

describe("tour timeline", () => {
  const museum = sample_museums[0];
  assert.ok(museum);
  const layout = build_layout(museum);
  const timeline = build_timeline(build_tour(layout, landscape));

  it("is deterministic", () => {
    assert.deepEqual(pose_at(timeline, 12345, false), pose_at(timeline, 12345, false));
  });

  it("starts at the entrance and ends at the last stop", () => {
    const start = pose_at(timeline, 0, false);
    const end = pose_at(timeline, timeline.duration_ms + 5000, false);
    const last = timeline.stops[timeline.stops.length - 1];
    assert.ok(last);
    assert.equal(start.position.z, timeline.stops[0]?.position.z);
    assert.equal(end.position.z, last.position.z);
  });

  it("marks move forward and previous/next step between them", () => {
    const marks = timeline.marks.map((mark) => mark.ms);
    assert.deepEqual([...marks].sort((a, b) => a - b), marks);
    const second = marks[1];
    assert.ok(second !== undefined);
    assert.equal(next_mark_ms(timeline, 0), second);
    assert.equal(previous_mark_ms(timeline, second + 3000), second);
    assert.equal(previous_mark_ms(timeline, 100), 0);
  });

  it("detects the pause stops only when crossing them forward", () => {
    const pause_index = timeline.stops.findIndex((stop) => stop.pause);
    assert.ok(pause_index > 0);
    const arrival = timeline.arrivals[pause_index] ?? 0;
    assert.equal(pause_crossed(timeline, arrival - 50, arrival + 50)?.stop_index, pause_index);
    assert.equal(pause_crossed(timeline, arrival, arrival + 50), null);
  });

  it("camera stays inside the hall for the whole tour", () => {
    for (let ms = 0; ms <= timeline.duration_ms; ms += 250) {
      const pose = pose_at(timeline, ms, false);
      assert.ok(Math.abs(pose.position.x) < hall.width / 2 - 0.3, `x at ${ms}`);
      assert.ok(pose.position.z > layout.z_end);
    }
  });
});

describe("walking", () => {
  const museum = sample_museums[0];
  assert.ok(museum);
  const layout = build_layout(museum);

  it("clamps to the hall and funnels through doorways", () => {
    const outside = clamp_walk(layout, { x: 99, y: 0, z: 99 });
    assert.ok(outside.x < hall.width / 2);
    const first = layout.rooms[0];
    assert.ok(first);
    const at_door = clamp_walk(layout, { x: 3, y: 0, z: first.z_far });
    assert.ok(Math.abs(at_door.x) < hall.door_width / 2);
  });

  it("finds the room for a position", () => {
    const second = layout.rooms[1];
    assert.ok(second);
    assert.equal(room_index_at(layout, second.z_near - 1), 1);
    assert.equal(room_index_at(layout, 10), 0);
    assert.equal(room_index_at(layout, -9999), layout.rooms.length - 1);
  });

  it("inspect pose sits in front of the wall", () => {
    const frame = layout.rooms.flatMap((entry) => entry.frames)[0];
    assert.ok(frame);
    const pose = inspect_pose(frame, landscape);
    assert.ok(Math.abs(pose.position.x - frame.position.x) >= 1.5);
    assert.equal(pose.position.z, frame.position.z);
  });
});
