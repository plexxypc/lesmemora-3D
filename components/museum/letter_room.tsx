"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { format_exhibit_date } from "@/lib/format";
import type { room } from "@/lib/types";

export interface letter_room_props {
  room: room;
}

/**
 * Letters revealed by opening an envelope.
 *
 * @param props - The letter room.
 * @returns The envelope and, once opened, the letter.
 */
export function LetterRoom({ room }: letter_room_props) {
  const letters = [...room.exhibits]
    .filter((exhibit) => exhibit.kind === "letter")
    .sort((left, right) => left.position - right.position);
  const [open, set_open] = useState(false);
  const [index, set_index] = useState(0);
  const letter = letters[Math.min(index, Math.max(letters.length - 1, 0))];

  return (
    <>
      <h2 className="room_title" id={`${room.id}-title`}>
        {room.name}
      </h2>
      {letter ? (
        open ? (
          <motion.article
            className="letter_sheet"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            {letter.date ? <p className="letter_kicker">{format_exhibit_date(letter.date)}</p> : null}
            <h3>{letter.caption}</h3>
            <p className="letter_body">{letter.body}</p>
            <div className="letter_nav">
              {letters.length > 1 ? (
                <>
                  <button
                    type="button"
                    className="mm_button mm_button_quiet"
                    onClick={() => set_index((current) => Math.max(0, current - 1))}
                    disabled={index === 0}
                  >
                    Previous letter
                  </button>
                  <button
                    type="button"
                    className="mm_button mm_button_quiet"
                    onClick={() => set_index((current) => Math.min(letters.length - 1, current + 1))}
                    disabled={index >= letters.length - 1}
                  >
                    Next letter
                  </button>
                </>
              ) : null}
              <button type="button" className="mm_button mm_button_quiet" onClick={() => set_open(false)}>
                Fold it closed
              </button>
            </div>
          </motion.article>
        ) : (
          <button type="button" className="envelope_button" onClick={() => set_open(true)} aria-expanded={false}>
            <span className="envelope" />
            <span className="sr_only">Open the letter {letter.caption ?? ""}</span>
          </button>
        )
      ) : (
        <p className="empty_copy">This room is waiting for a letter.</p>
      )}
    </>
  );
}
