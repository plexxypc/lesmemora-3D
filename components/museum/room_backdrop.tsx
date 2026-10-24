import type { theme_config } from "@/lib/types";

const bit_count = 8;

export interface room_backdrop_props {
  theme: theme_config;
  active: boolean;
}

/**
 * CSS motif for the active room. Particles pause in rooms that are off screen.
 *
 * @param props - Theme motif and whether this room is the one in view.
 * @returns Decorative background layers.
 */
export function RoomBackdrop({ theme, active }: room_backdrop_props) {
  return (
    <>
      <div className="room_sky" />
      <div className="motif" data-motif={theme.background.motif} data-active={active ? "true" : "false"} aria-hidden="true">
        {Array.from({ length: bit_count }, (_, index) => (
          <span
            key={index}
            className="bit"
            style={{
              left: `${8 + index * 11}%`,
              top: `${12 + (index % 4) * 16}%`,
              animationDelay: `${index * -1.4}s`,
            }}
          />
        ))}
      </div>
      <div className="room_floor" />
    </>
  );
}
