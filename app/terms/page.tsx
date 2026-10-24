import { LegalPage } from "@/components/legal_page";
import { brand_name } from "@/lib/brand";

export default function TermsPage() {
  return (
    <LegalPage title="Terms">
      <p>Last updated October 24, 2026. This is a plain-language draft for the {brand_name} preview, not a substitute for legal advice.</p>
      <h2>The gift</h2>
      <p>
        {brand_name} lets someone build a private walk-through of photos, dates, and letters for a person they love, then share it with a link.
        This preview contains fictional sample museums. Ordered museums are published as private links.
      </p>
      <h2>Your content</h2>
      <p>
        You must have the right to share the photos and words in a museum. Do not share someone else&apos;s private life without permission.
        Audio files cannot be uploaded. Music is limited to the built-in library, a YouTube link, or an official Spotify or Apple Music embed.
      </p>
      <h2>How long a museum stays up</h2>
      <p>
        Free museums stay live for 7 days. A paid order stays live for one year unless a different date is set. When a museum pauses, the page offers a way to ask for it back.
        Keep your own copies. {brand_name} is a gift, not a backup.
      </p>
      <h2>Removal</h2>
      <p>
        We may remove a museum that is illegal, abusive, or shared without the rights to its contents. Use the report link on public pages.
      </p>
    </LegalPage>
  );
}
