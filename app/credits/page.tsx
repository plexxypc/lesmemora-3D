import { LegalPage } from "@/components/legal_page";
import { brand_name } from "@/lib/brand";
import { load_library_tracks } from "@/lib/music";

export default function CreditsPage() {
  const tracks = load_library_tracks();
  return (
    <LegalPage title="Music credits">
      <p>
        {brand_name} plays a built-in library, a YouTube link, or an official Spotify or Apple Music embed. Visitors cannot upload audio.
        The files in this preview are original placeholder tones. Replace them, and the lines below, before launch.
      </p>
      <ul>
        {tracks.map((track) => (
          <li key={track.id}>
            <strong>{track.title}</strong> · {track.mood}
            <br />
            {track.license}
            <br />
            {track.credit}
            {track.source_url ? (
              <>
                <br />
                <a href={track.source_url}>{track.source_url}</a>
              </>
            ) : null}
          </li>
        ))}
      </ul>
    </LegalPage>
  );
}
