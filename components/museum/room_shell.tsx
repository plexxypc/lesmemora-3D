import type { ReactNode } from "react";
import { RoomBackdrop } from "@/components/museum/room_backdrop";
import type { theme_config } from "@/lib/types";

export interface room_shell_props {
  theme: theme_config;
  active: boolean;
  show_door: boolean;
  labelled_by: string;
  children: ReactNode;
}

/**
 * One viewport in the corridor: sky, motif, optional doors, and the room.
 *
 * @param props - Theme, active state, door flag, label id, and room content.
 * @returns The room section.
 */
export function RoomShell({ theme, active, show_door, labelled_by, children }: room_shell_props) {
  return (
    <section className="room_shell" data-open={!show_door || active ? "true" : "false"} aria-labelledby={labelled_by}>
      <RoomBackdrop theme={theme} active={active} />
      <div className="room_content">{children}</div>
      {show_door ? (
        <div className="door_layer" aria-hidden="true">
          <div className="door_leaf door_leaf_left">
            <span className="door_handle" />
          </div>
          <div className="door_leaf door_leaf_right">
            <span className="door_handle" />
          </div>
        </div>
      ) : null}
    </section>
  );
}
