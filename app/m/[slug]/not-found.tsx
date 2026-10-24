import Link from "next/link";

export default function MuseumNotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-6 text-center">
      <div>
        <h1 className="font_display text-4xl">This museum is not on the hall.</h1>
        <p className="mt-3 text-[#eadbe3]">The link may be mistyped. Sample museums are listed on the home page.</p>
        <Link className="mm_button mt-6 inline-flex no-underline" href="/">
          Back home
        </Link>
      </div>
    </main>
  );
}
