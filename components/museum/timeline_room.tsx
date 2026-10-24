import { format_exhibit_date } from "@/lib/format";
import type { room } from "@/lib/types";

export interface timeline_room_props {
  room: room;
}

/**
 * Dated milestones standing along the hall.
 *
 * @param props - The timeline room.
 * @returns The hall.
 */
export function TimelineRoom({ room }: timeline_room_props) {
  const milestones = [...room.exhibits]
    .filter((exhibit) => exhibit.kind === "milestone")
    .sort((left, right) => left.position - right.position);

  return (
    <>
      <h2 className="room_title" id={`${room.id}-title`}>
        {room.name}
      </h2>
      {milestones.length === 0 ? (
        <p className="empty_copy">This hall is waiting for its first date.</p>
      ) : (
        <div className="timeline_hall">
          <ol className="timeline_row">
            {milestones.map((milestone) => (
              <li key={milestone.id} className="milestone_card">
                {milestone.date ? <time dateTime={milestone.date}>{format_exhibit_date(milestone.date)}</time> : null}
                <h3>{milestone.caption}</h3>
                {milestone.body ? <p>{milestone.body}</p> : null}
              </li>
            ))}
          </ol>
        </div>
      )}
    </>
  );
}
