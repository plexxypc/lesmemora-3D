"use client";

import Link from "next/link";

export default function MuseumError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="grid min-h-dvh place-items-center px-6 text-center">
      <div>
        <h1 className="font_display text-4xl">This room did not open.</h1>
        <p className="mt-3 text-[#eadbe3]">Try the door again, or go back to the entrance.</p>
        <div className="mt-6 flex justify-center gap-3">
          <button type="button" className="mm_button" onClick={reset}>
            Try again
          </button>
          <Link className="mm_button mm_button_quiet no-underline" href="/">
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
