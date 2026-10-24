import { PasswordForm } from "@/components/museum/password_form";
import { brand_name } from "@/lib/brand";
import { get_theme, theme_css_vars } from "@/lib/themes";

export interface password_gate_props {
  slug: string;
  title: string;
  theme_id: string;
}

/**
 * Password screen. It receives the title and theme only, not rooms or letters.
 *
 * @param props - Public gate fields.
 * @returns The locked museum page.
 */
export function PasswordGate({ slug, title, theme_id }: password_gate_props) {
  const theme = get_theme(theme_id) ?? get_theme("romantic");
  if (!theme) {
    return null;
  }
  return (
    <div className="mm_viewer" style={theme_css_vars(theme)}>
      <main className="gate_screen">
        <div className="gate_card">
          <p className="kicker">{brand_name}</p>
          <h1>{title}</h1>
          <p>Enter the password to open this museum.</p>
          <PasswordForm slug={slug} />
        </div>
      </main>
    </div>
  );
}
