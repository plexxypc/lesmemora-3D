"use client";

import Image from "next/image";
import { useState } from "react";
import { class_names } from "@/lib/class_names";

export interface exhibit_image_props {
  src: string;
  alt: string;
  preload_image: boolean;
  eager: boolean;
}

/**
 * One exhibit picture. Far rooms should not mount this component.
 *
 * @param props - Source, alt text from the caption, and loading hints.
 * @returns The optimized image, or a short error if it fails.
 */
export function ExhibitImage({ src, alt, preload_image, eager }: exhibit_image_props) {
  const [loaded, set_loaded] = useState(false);
  const [failed, set_failed] = useState(false);

  if (failed) {
    return <p className="image_error">This picture could not load.</p>;
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes="(max-width: 900px) 70vw, 480px"
      preload={preload_image}
      loading={preload_image || eager ? "eager" : "lazy"}
      className={class_names("exhibit_img", loaded && "is_loaded")}
      onLoad={() => set_loaded(true)}
      onError={() => set_failed(true)}
    />
  );
}
