"use client";

import { useEffect, useState } from "react";
import { acquire_photo, type photo_state } from "@/components/museum/gallery3d/textures";

const empty: photo_state = { texture: null, aspect: 1.5, failed: false };

/**
 * Load one photo as a texture. The texture is released when the room unmounts.
 *
 * @param url - Image address, or null for a missing photo.
 * @param max_px - Longest side to keep on the GPU.
 * @returns The texture once ready, its shape, and whether loading failed.
 */
export function usePhoto(url: string | null, max_px: number): photo_state {
  const [state, set_state] = useState<photo_state>(empty);

  useEffect(() => {
    if (!url) {
      return;
    }
    const handle = acquire_photo(url, max_px, () => set_state(handle.read()));
    return () => handle.release();
  }, [url, max_px]);

  return url ? state : { ...empty, failed: true };
}
