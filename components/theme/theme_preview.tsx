import Link from "next/link";
import { theme_css_vars } from "@/lib/themes";
import { room_types, type theme_config } from "@/lib/types";

export interface theme_preview_props {
  theme: theme_config;
  href: string;
}

/**
 * Live theme preview for the landing page and, later, the creator wizard.
 * Adding a theme does not require a new preview component.
 *
 * @param props - Theme config and where the card should open.
 * @returns A card painted entirely from the theme object.
 */
export function ThemePreview({ theme, href }: theme_preview_props) {
  return (
    <Link href={href} className="theme_card" style={theme_css_vars(theme)}>
      <div className={`frame frame_${theme.frame_style}`} aria-hidden="true">
        <div className="frame_mat" />
      </div>
      <h3>{theme.name}</h3>
      <p>{theme.tagline}</p>
      <p>{theme.wizard_prompts.dedication}</p>
      <p>{room_types.map((type) => theme.default_room_names[type]).join(" · ")}</p>
    </Link>
  );
}
