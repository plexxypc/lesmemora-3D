import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site_footer";
import { SiteHeader } from "@/components/site_header";

export interface legal_page_props {
  title: string;
  children: ReactNode;
}

/**
 * Shared frame for terms, privacy, credits, and the report page.
 *
 * @param props - Title and page body.
 * @returns The document page.
 */
export function LegalPage({ title, children }: legal_page_props) {
  return (
    <>
      <SiteHeader />
      <main className="legal_main">
        <h1>{title}</h1>
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
