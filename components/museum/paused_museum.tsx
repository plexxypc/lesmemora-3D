import { brand_name } from "@/lib/brand";
import { reactivate_message, whatsapp_link } from "@/lib/contact";
import { get_theme, theme_css_vars } from "@/lib/themes";

export interface paused_museum_props {
  slug: string;
}

/**
 * Expired-order page. The slug is only used to prefill WhatsApp.
 *
 * @param props - Order slug.
 * @returns The paused screen.
 */
export function PausedMuseum({ slug }: paused_museum_props) {
  const theme = get_theme("romantic");
  if (!theme) {
    return null;
  }
  return (
    <div className="mm_viewer" style={theme_css_vars(theme)}>
      <main className="gate_screen">
        <div className="gate_card">
          <p className="kicker">{brand_name}</p>
          <h1>This museum has paused</h1>
          <p>The hallway is still saved. Message us and we can bring it back.</p>
          <a className="mm_button" href={whatsapp_link(reactivate_message(slug))} target="_blank" rel="noopener noreferrer">
            Message us to reactivate
          </a>
        </div>
      </main>
    </div>
  );
}
