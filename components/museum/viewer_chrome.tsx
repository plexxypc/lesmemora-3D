import Link from "next/link";
import type { room } from "@/lib/types";

export interface viewer_chrome_props {
  title: string;
  rooms: room[];
  active_index: number;
  on_jump: (index: number) => void;
}

/**
 * Top bar: exit, title, and room dots.
 *
 * @param props - Title, rooms, the active index, and a jump handler.
 * @returns The chrome. It does not repeat the room heading for assistive tech.
 */
export function ViewerChrome({ title, rooms, active_index, on_jump }: viewer_chrome_props) {
  return (
    <div className="viewer_chrome">
      <Link className="chrome_exit" href="/">
        Exit
      </Link>
      <p className="chrome_title" aria-hidden="true">
        {title}
      </p>
      <div className="room_dots" role="group" aria-label="Rooms">
        {rooms.map((room, index) => (
          <button
            key={room.id}
            type="button"
            aria-label={`Go to ${room.name}`}
            aria-current={index === active_index}
            onClick={() => on_jump(index)}
          />
        ))}
      </div>
    </div>
  );
}
