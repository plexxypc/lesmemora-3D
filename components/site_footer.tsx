import Link from "next/link";
import { order_message, public_contact_links, whatsapp_link } from "@/lib/contact";

/**
 * Legal and credit links shown on public pages.
 *
 * @returns The footer.
 */
export function SiteFooter() {
  const socials = public_contact_links();
  return (
    <footer className="flex flex-wrap gap-x-5 gap-y-2 px-5 py-8 text-sm text-[#e3c3d0]">
      <Link href="/order">Order a museum</Link>
      <a href={whatsapp_link(order_message)} target="_blank" rel="noopener noreferrer">
        Message us on WhatsApp
      </a>
      {socials.map((link) => (
        <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer">
          {link.label}
        </a>
      ))}
      <Link href="/terms">Terms</Link>
      <Link href="/privacy">Privacy</Link>
      <Link href="/credits">Music credits</Link>
      <Link href="/report">Report a museum</Link>
    </footer>
  );
}
