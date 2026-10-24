"use client";

import { useEffect, useState } from "react";
import { order_contact_links, type contact_platform } from "@/lib/contact";

/**
 * Landing-page contact card. Buyers pick a platform, and the round button hides the card.
 * Museum pages do not render this.
 *
 * @returns The floating contact card.
 */
export function ContactDock() {
  const links = order_contact_links();
  const [open, set_open] = useState(true);

  useEffect(() => {
    if (!open) {
      return;
    }
    function on_key(event: KeyboardEvent) {
      if (event.key === "Escape") {
        set_open(false);
      }
    }
    window.addEventListener("keydown", on_key);
    return () => window.removeEventListener("keydown", on_key);
  }, [open]);

  if (links.length === 0) {
    return null;
  }

  return (
    <div className="fixed right-4 bottom-4 z-30 flex flex-col items-end gap-3">
      {open ? (
        <section
          aria-label="Reach us on"
          className="w-52 rounded-3xl border border-white/15 bg-[#241018] p-3 text-[#f6e8ee] shadow-xl"
        >
          <p className="px-2 pb-2 text-[0.68rem] tracking-[0.16em] text-[#e3c3d0] uppercase">Reach us on</p>
          <ul className="grid gap-1">
            {links.map((link) => (
              <li key={link.platform}>
                <a
                  className="flex items-center gap-3 rounded-2xl px-2 py-2 no-underline hover:bg-white/10"
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10">
                    <PlatformIcon platform={link.platform} />
                  </span>
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <button
        type="button"
        className="grid h-12 w-12 place-items-center rounded-full border border-white/25 bg-[#1a0e16] text-[#f6e8ee] shadow-lg"
        aria-expanded={open}
        aria-label={open ? "Close contact options" : "Open contact options"}
        onClick={() => set_open((current) => !current)}
      >
        {open ? <CloseIcon /> : <ChatIcon />}
      </button>
    </div>
  );
}

/**
 * Draw the mark for one contact platform.
 *
 * @param props - Platform key.
 * @returns A small icon.
 */
function PlatformIcon({ platform }: { platform: contact_platform }) {
  if (platform === "whatsapp") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12.04 2C6.58 2 2.15 6.4 2.15 11.83c0 1.74.46 3.44 1.34 4.94L2 22l5.39-1.4a10 10 0 0 0 4.65 1.18h.01c5.46 0 9.89-4.4 9.89-9.83C21.94 6.4 17.5 2 12.04 2Zm5.76 14.1c-.24.68-1.4 1.3-1.94 1.38-.5.08-1.12.11-1.81-.11-.42-.14-.95-.31-1.64-.6-2.88-1.24-4.76-4.14-4.9-4.33-.14-.19-1.16-1.54-1.16-2.94s.73-2.08 1-2.37c.24-.28.64-.41 1.02-.41h.73c.23 0 .54-.09.84.64.31.76 1.06 2.62 1.15 2.81.1.19.16.41.03.66-.12.24-.19.4-.37.61-.19.22-.39.49-.56.66-.19.19-.38.39-.16.75.22.36.97 1.6 2.08 2.59 1.43 1.27 2.64 1.67 3.01 1.86.37.19.59.16.8-.1.22-.25.92-1.07 1.17-1.44.24-.36.49-.3.82-.18.34.12 2.14 1.01 2.5 1.19.37.19.61.28.7.43.09.16.09.9-.15 1.58Z"
        />
      </svg>
    );
  }
  if (platform === "instagram") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4Zm10 2H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm-5 3.2A3.8 3.8 0 1 1 8.2 12 3.8 3.8 0 0 1 12 8.2Zm0 1.6A2.2 2.2 0 1 0 14.2 12 2.2 2.2 0 0 0 12 9.8ZM17.4 6.7a1 1 0 1 1-1 1 1 1 0 0 1 1-1Z"
        />
      </svg>
    );
  }
  if (platform === "facebook") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M14.2 21v-7.1h2.4l.4-2.8h-2.8V9.3c0-.8.2-1.4 1.4-1.4H17V5.4A19 19 0 0 0 14.9 5c-2.1 0-3.5 1.3-3.5 3.6v2h-2.3v2.8H11.4V21Z"
        />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M6.5 9H4V20h2.5ZM5.2 4A1.6 1.6 0 1 0 5.2 7.2 1.6 1.6 0 0 0 5.2 4ZM20 20h-2.5v-5.6c0-1.5-.5-2.5-1.8-2.5a2 2 0 0 0-1.8 1.3 2.5 2.5 0 0 0-.1.9V20H11V9h2.4v1.5a3.4 3.4 0 0 1 3.1-1.7c2.2 0 3.5 1.4 3.5 4.5Z"
      />
    </svg>
  );
}

/** Close mark for the contact card. */
function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

/** Mark shown when the contact card is closed. */
function ChatIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M5 4h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-4.2 3.2A.8.8 0 0 1 3.5 19.6V6a2 2 0 0 1 2-2Z"
      />
    </svg>
  );
}
