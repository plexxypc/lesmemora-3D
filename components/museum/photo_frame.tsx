import type { ReactNode } from "react";
import { class_names } from "@/lib/class_names";
import { format_exhibit_date } from "@/lib/format";
import type { frame_style } from "@/lib/types";

export interface photo_frame_props {
  frame_style: frame_style;
  caption: string | null;
  date_iso: string | null;
  children: ReactNode;
}

/**
 * A themed frame around one exhibit image.
 *
 * @param props - Frame style, caption, date, and the image.
 * @returns The framed figure.
 */
export function PhotoFrame({ frame_style, caption, date_iso, children }: photo_frame_props) {
  const caption_block =
    caption || date_iso ? (
      <figcaption className="frame_caption">
        {date_iso ? <time dateTime={date_iso}>{format_exhibit_date(date_iso)}</time> : null}
        {caption ? <p aria-hidden="true">{caption}</p> : null}
      </figcaption>
    ) : null;
  const polaroid = frame_style === "polaroid";

  return (
    <figure className="exhibit">
      <div className={class_names("frame", `frame_${frame_style}`)}>
        <div className="frame_mat">{children}</div>
        {polaroid ? caption_block : null}
      </div>
      {polaroid ? null : caption_block}
    </figure>
  );
}
