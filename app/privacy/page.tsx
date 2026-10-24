import { LegalPage } from "@/components/legal_page";

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy">
      <p>Last updated October 24, 2026. This draft describes the preview and the product it is growing into.</p>
      <h2>This preview</h2>
      <p>
        The sample museums are fictional and ship with the app. Walking through them does not create an account, and this preview does not upload your photos.
        A report you write is copied on your device. It is not sent to a server.
      </p>
      <h2>When museums can be created</h2>
      <p>
        We will store the account email, the museum you write, and the plan attached to it. Photos will sit in a private bucket and be shown with short-lived links.
        Letters and captions are private. They are not used in marketing, and they are not put in link previews.
      </p>
      <h2>Payments</h2>
      <p>Paid plans will be handled by Whop. We will keep the plan and the date access ends. We will not store card numbers.</p>
      <h2>Music</h2>
      <p>
        Library tracks play from this site. A YouTube, Spotify, or Apple Music embed is loaded from that service and follows its own policy.
      </p>
      <h2>Who can see a museum</h2>
      <p>
        A museum link is unlisted. People with the link can walk through it. Guestbook notes, when they exist, will be visible to those same people.
        You can report a museum from any public page.
      </p>
    </LegalPage>
  );
}
