"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { format_exhibit_date } from "@/lib/format";
import type { placed_frame } from "@/lib/gallery_layout";
import type { exhibit, museum, theme_config } from "@/lib/types";
import { ordered_rooms } from "@/lib/panels";

export interface inspect_card_props {
  frame: placed_frame;
  on_zoom: () => void;
  on_close: () => void;
}

/**
 * Caption card shown while the camera is up close to a frame.
 *
 * @param props - The frame and handlers.
 * @returns The card.
 */
export function InspectCard({ frame, on_zoom, on_close }: inspect_card_props) {
  const item = frame.exhibit;
  useEffect(() => {
    function on_key(event: KeyboardEvent) {
      if (event.key === "Escape") {
        on_close();
      }
    }
    window.addEventListener("keydown", on_key);
    return () => window.removeEventListener("keydown", on_key);
  }, [on_close]);

  return (
    <div className="gallery3d_inspect" role="dialog" aria-label="Exhibit details">
      <div className="gallery3d_inspect_text">
        {item.date ? <p className="gallery3d_inspect_date">{format_exhibit_date(item.date)}</p> : null}
        {item.caption ? <p className="gallery3d_inspect_caption font_display">{item.caption}</p> : null}
        {item.body ? <p className="gallery3d_inspect_body">{item.body}</p> : null}
      </div>
      <div className="gallery3d_inspect_actions">
        {frame.kind === "photo" && item.image_src ? (
          <button type="button" className="mm_button mm_button_quiet" onClick={on_zoom}>
            Zoom photo
          </button>
        ) : null}
        <button type="button" className="mm_button" onClick={on_close} autoFocus>
          Back to the hall
        </button>
      </div>
    </div>
  );
}

interface zoom_view {
  scale: number;
  x: number;
  y: number;
}

export interface lightbox_props {
  src: string;
  alt: string;
  on_close: () => void;
}

/**
 * Full-screen photo with pinch, wheel, double-tap, and drag.
 *
 * @param props - Image address, alt text, and close handler.
 * @returns The lightbox.
 */
export function Lightbox({ src, alt, on_close }: lightbox_props) {
  const [view, set_view] = useState<zoom_view>({ scale: 1, x: 0, y: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef({ distance: 0, scale: 1 });
  const last_tap = useRef(0);

  useEffect(() => {
    function on_key(event: KeyboardEvent) {
      if (event.key === "Escape") {
        on_close();
      }
    }
    window.addEventListener("keydown", on_key);
    return () => window.removeEventListener("keydown", on_key);
  }, [on_close]);

  function clamp_scale(value: number): number {
    return Math.min(5, Math.max(1, value));
  }

  function on_down(event: ReactPointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      if (a && b) {
        gesture.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), scale: view.scale };
      }
    }
    const now = Date.now();
    if (pointers.current.size === 1 && now - last_tap.current < 280) {
      set_view((current) => (current.scale > 1 ? { scale: 1, x: 0, y: 0 } : { scale: 2.5, x: 0, y: 0 }));
    }
    last_tap.current = now;
  }

  function on_move(event: ReactPointerEvent<HTMLDivElement>) {
    const previous = pointers.current.get(event.pointerId);
    if (!previous) {
      return;
    }
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      if (a && b && gesture.current.distance > 0) {
        const next = clamp_scale((gesture.current.scale * Math.hypot(a.x - b.x, a.y - b.y)) / gesture.current.distance);
        set_view((current) => ({ ...current, scale: next, ...(next === 1 ? { x: 0, y: 0 } : null) }));
      }
      return;
    }
    if (view.scale > 1) {
      const dx = event.clientX - previous.x;
      const dy = event.clientY - previous.y;
      set_view((current) => ({ ...current, x: current.x + dx, y: current.y + dy }));
    }
  }

  function on_up(event: ReactPointerEvent<HTMLDivElement>) {
    pointers.current.delete(event.pointerId);
  }

  return (
    <div className="gallery3d_lightbox" role="dialog" aria-modal="true" aria-label="Photo, zoomable">
      <div
        className="gallery3d_lightbox_stage"
        onPointerDown={on_down}
        onPointerMove={on_move}
        onPointerUp={on_up}
        onPointerCancel={on_up}
        onWheel={(event) => {
          const next = clamp_scale(view.scale * (event.deltaY < 0 ? 1.15 : 0.87));
          set_view((current) => ({ ...current, scale: next, ...(next === 1 ? { x: 0, y: 0 } : null) }));
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          draggable={false}
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
        />
      </div>
      <div className="gallery3d_lightbox_bar">
        <p>Pinch or double-tap to zoom.</p>
        <button type="button" className="mm_button" onClick={on_close} autoFocus>
          Close
        </button>
      </div>
    </div>
  );
}

export interface letter_overlay_props {
  letters: exhibit[];
  theme: theme_config;
  reduce_motion: boolean;
  on_close: () => void;
}

/**
 * Paper with a typewriter reveal. A tap skips to the end of the page.
 *
 * @param props - Letters, theme, motion preference, and close handler.
 * @returns The reading view.
 */
export function LetterOverlay({ letters, theme, reduce_motion, on_close }: letter_overlay_props) {
  const [index, set_index] = useState(0);
  const letter = letters[index];
  const text = letter?.body ?? "";
  const [shown, set_shown] = useState(0);
  const complete = reduce_motion || shown >= text.length;

  useEffect(() => {
    if (reduce_motion) {
      return;
    }
    let frame = 0;
    let started = 0;
    const tick = (now: number) => {
      if (!started) {
        started = now;
      }
      const count = Math.min(text.length, Math.floor((now - started) / 22));
      set_shown(count);
      if (count < text.length) {
        frame = requestAnimationFrame(tick);
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [text, reduce_motion]);

  useEffect(() => {
    function on_key(event: KeyboardEvent) {
      if (event.key === "Escape") {
        on_close();
      }
    }
    window.addEventListener("keydown", on_key);
    return () => window.removeEventListener("keydown", on_key);
  }, [on_close]);

  if (!letter) {
    return null;
  }
  const visible_text = complete ? text : text.slice(0, shown);

  return (
    <div className="gallery3d_letter" role="dialog" aria-modal="true" aria-label="Letter">
      <div
        className="gallery3d_paper"
        onClick={() => set_shown(text.length)}
        style={{ background: theme.palette.surface, color: theme.palette.ink }}
      >
        {letter.date ? <p className="gallery3d_paper_date">{format_exhibit_date(letter.date)}</p> : null}
        {letter.caption ? <h2 className="gallery3d_paper_title font_display">{letter.caption}</h2> : null}
        <p className="gallery3d_paper_body" aria-label={text}>
          <span aria-hidden="true">{visible_text}</span>
          {complete ? null : <span className="gallery3d_caret" aria-hidden="true" />}
        </p>
      </div>
      <div className="gallery3d_letter_bar">
        {letters.length > 1 ? (
          <div className="gallery3d_letter_pager">
            <button type="button" className="gallery3d_chip" disabled={index === 0} onClick={() => { set_index(index - 1); set_shown(0); }}>
              Earlier letter
            </button>
            <span>
              {index + 1} of {letters.length}
            </span>
            <button type="button" className="gallery3d_chip" disabled={index === letters.length - 1} onClick={() => { set_index(index + 1); set_shown(0); }}>
              Next letter
            </button>
          </div>
        ) : null}
        <button type="button" className="mm_button" onClick={on_close} autoFocus>
          Fold the letter
        </button>
      </div>
    </div>
  );
}

export interface exhibit_list_props {
  museum: museum;
  on_close: () => void;
}

/**
 * Every exhibit as plain text and images. This is the view for screen readers
 * and for anyone who prefers reading to walking.
 *
 * @param props - The museum and a close handler.
 * @returns The list dialog.
 */
export function ExhibitList({ museum, on_close }: exhibit_list_props) {
  const rooms = useMemo(() => ordered_rooms(museum), [museum]);
  useEffect(() => {
    function on_key(event: KeyboardEvent) {
      if (event.key === "Escape") {
        on_close();
      }
    }
    window.addEventListener("keydown", on_key);
    return () => window.removeEventListener("keydown", on_key);
  }, [on_close]);

  return (
    <div className="gallery3d_list" role="dialog" aria-modal="true" aria-label="All exhibits">
      <div className="gallery3d_list_head">
        <h2 className="font_display">{museum.title}</h2>
        <button type="button" className="mm_button" onClick={on_close} autoFocus>
          Back to the hall
        </button>
      </div>
      <p className="gallery3d_list_dedication">{museum.dedication}</p>
      {rooms.map((room) => (
        <section key={room.id} aria-labelledby={`${room.id}-list`}>
          <h3 id={`${room.id}-list`} className="font_display">
            {room.name}
          </h3>
          <ul>
            {room.exhibits.map((item) => (
              <li key={item.id}>
                {item.image_src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image_src} alt={item.caption ?? "Photo"} loading="lazy" />
                ) : null}
                {item.date ? <p className="gallery3d_inspect_date">{format_exhibit_date(item.date)}</p> : null}
                {item.caption ? <p className="gallery3d_inspect_caption font_display">{item.caption}</p> : null}
                {item.body ? <p>{item.body}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
