import Link from "next/link";
import { SiteFooter } from "@/components/site_footer";
import { SiteHeader } from "@/components/site_header";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="legal_main">
        <h1>That page is not here.</h1>
        <p>The link may be old. The sample museums are on the home page.</p>
        <Link href="/">Back home</Link>
      </main>
      <SiteFooter />
    </>
  );
}
