"use client";

import { useState } from "react";
import { copy_text } from "@/lib/copy_text";
import { share_message } from "@/lib/share";
import type { museum } from "@/lib/types";

export interface share_panel_props {
  museum: Pick<museum, "title">;
}

function current_url(): string {
  return window.location.href;
}

/**
 * Web Share, with links for WhatsApp, X, Facebook, Telegram, and copy.
 *
 * @param props - Public title. Captions, letters, and the dedication are not included.
 * @returns The share controls.
 */
export function SharePanel({ museum }: share_panel_props) {
  const [notice, set_notice] = useState<string | null>(null);
  const [fallback_url, set_fallback_url] = useState<string | null>(null);
  const message = share_message(museum);

  async function share_native() {
    const url = current_url();
    if (!navigator.share) {
      set_notice("Sharing from this browser is not available. Use one of the buttons below.");
      return;
    }
    try {
      await navigator.share({ title: museum.title, text: message, url });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      set_notice("The share sheet did not open. You can still copy the link.");
    }
  }

  async function copy_link() {
    const url = current_url();
    const copied = await copy_text(url);
    if (copied) {
      set_fallback_url(null);
      set_notice("Link copied");
      return;
    }
    set_fallback_url(url);
    set_notice("Copy failed");
  }

  function open_share(kind: "whatsapp" | "x" | "facebook" | "telegram") {
    const url = current_url();
    const encoded_url = encodeURIComponent(url);
    const encoded_message = encodeURIComponent(message);
    const targets = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(`${message} ${url}`)}`,
      x: `https://twitter.com/intent/tweet?text=${encoded_message}&url=${encoded_url}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encoded_url}`,
      telegram: `https://t.me/share/url?url=${encoded_url}&text=${encoded_message}`,
    };
    window.open(targets[kind], "_blank", "noopener,noreferrer");
  }

  return (
    <div>
      <div className="share_row">
        <button type="button" onClick={() => void share_native()}>
          Share
        </button>
        <button type="button" onClick={() => open_share("whatsapp")}>
          WhatsApp
        </button>
        <button type="button" onClick={() => open_share("x")}>
          X
        </button>
        <button type="button" onClick={() => open_share("facebook")}>
          Facebook
        </button>
        <button type="button" onClick={() => open_share("telegram")}>
          Telegram
        </button>
        <button type="button" onClick={() => void copy_link()}>
          Copy link
        </button>
      </div>
      {notice ? (
        <p className="hint" role="status">
          {notice}
        </p>
      ) : null}
      {fallback_url ? (
        <label className="copy_fallback">
          Press and hold to copy
          <input className="copy_fallback_field" readOnly type="text" value={fallback_url} />
        </label>
      ) : null}
    </div>
  );
}
