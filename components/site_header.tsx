import Link from "next/link";
import { brand_name } from "@/lib/brand";

/**
 * Site name and the short public nav.
 *
 * @returns The header.
 */
export function SiteHeader() {
  return (
    <header className="flex items-center justify-between gap-4 px-5 py-4">
      <Link href="/" className="font_display text-xl no-underline">
        {brand_name}
      </Link>
      <nav className="flex gap-4 text-sm" aria-label="Site">
        <Link href="/#themes">Themes</Link>
        <Link href="/#plans">Plans</Link>
        <Link href="/credits">Credits</Link>
      </nav>
    </header>
  );
}
