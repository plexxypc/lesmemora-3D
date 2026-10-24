"use client";

import { motion } from "framer-motion";
import type { museum, room, theme_config } from "@/lib/types";

export interface lobby_room_props {
  museum: museum;
  room: room;
  theme: theme_config;
  on_enter: () => void;
}

/**
 * The first room. Enter starts the music and walks into the museum.
 *
 * @param props - Museum copy, theme, and the enter handler.
 * @returns The lobby.
 */
export function LobbyRoom({ museum, room, theme, on_enter }: lobby_room_props) {
  return (
    <div className="lobby_copy">
      <p className="kicker" id={`${room.id}-title`}>
        {room.name}
      </p>
      <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
        {museum.title}
      </motion.h1>
      {museum.title.toLowerCase().includes(museum.recipient_name.toLowerCase()) ? null : (
        <p className="recipient_name font_display">{museum.recipient_name}</p>
      )}
      <p className="dedication">{museum.dedication}</p>
      <button type="button" className="mm_button" onClick={on_enter} autoFocus>
        {theme.default_copy.enter_label}
      </button>
      <p className="hint">Swipe to walk the hallway, or use the arrow keys.</p>
    </div>
  );
}
