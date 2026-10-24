"use client";

import { useState } from "react";
import { ArrowIcon } from "@/components/museum/icons";
import { ExhibitImage } from "@/components/museum/exhibit_image";
import { PhotoFrame } from "@/components/museum/photo_frame";
import type { exhibit, image_mode, room, theme_config } from "@/lib/types";

export interface gallery_room_props {
  room: room;
  theme: theme_config;
  image_mode: image_mode;
}

function should_mount(index: number, selected: number, image_mode: image_mode): boolean {
  if (image_mode === "far") {
    return false;
  }
  if (image_mode === "next" || image_mode === "previous") {
    return index === 0;
  }
  return index === selected || index === selected + 1;
}

/**
 * Framed photos for one gallery. Only the current and next room fetch images.
 *
 * @param props - Room, theme frame, and how close the room is to the viewport.
 * @returns The gallery.
 */
export function GalleryRoom({ room, theme, image_mode }: gallery_room_props) {
  const photos = room.exhibits.filter((exhibit) => exhibit.kind === "photo");
  const [selected, set_selected] = useState(0);
  const safe_index = Math.min(selected, Math.max(photos.length - 1, 0));
  const photo: exhibit | undefined = photos[safe_index];

  return (
    <>
      <h2 className="room_title" id={`${room.id}-title`}>
        {room.name}
      </h2>
      {photo ? (
        <>
          <div className="room_stage">
            <button
              type="button"
              className="nav_arrow"
              onClick={() => set_selected((index) => Math.max(0, index - 1))}
              disabled={safe_index === 0}
              aria-label="Previous picture"
            >
              <ArrowIcon direction="left" />
            </button>
            <PhotoFrame
              frame_style={theme.frame_style}
              caption={photo.caption}
              date_iso={photo.date}
            >
              {photo.image_src && should_mount(safe_index, safe_index, image_mode) ? (
                <ExhibitImage
                  src={photo.image_src}
                  alt={photo.caption ?? "Memory"}
                  preload_image={
                    (image_mode === "current" && true) || (image_mode === "next" && safe_index === 0)
                  }
                  eager={image_mode === "current" || image_mode === "next"}
                />
              ) : (
                <div className="image_error">The picture will appear as you arrive.</div>
              )}
            </PhotoFrame>
            <button
              type="button"
              className="nav_arrow"
              onClick={() => set_selected((index) => Math.min(photos.length - 1, index + 1))}
              disabled={safe_index >= photos.length - 1}
              aria-label="Next picture"
            >
              <ArrowIcon direction="right" />
            </button>
          </div>
          {photos.length > 1 ? (
            <div className="dot_row">
              {photos.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  aria-label={`Show picture ${index + 1}${item.caption ? `: ${item.caption}` : ""}`}
                  aria-current={index === safe_index}
                  onClick={() => set_selected(index)}
                />
              ))}
            </div>
          ) : null}
        </>
      ) : (
        <p className="empty_copy">This room is waiting for its first picture.</p>
      )}
    </>
  );
}
