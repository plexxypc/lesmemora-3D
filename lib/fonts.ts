import { Caveat, Cormorant_Garamond, Fraunces, Fredoka, Libre_Baskerville, Outfit } from "next/font/google";

const font_cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-cormorant",
  display: "swap",
});

const font_fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-fraunces",
  display: "swap",
});

const font_libre = Libre_Baskerville({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-libre",
  display: "swap",
});

const font_fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-fredoka",
  display: "swap",
});

const font_outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-outfit",
  display: "swap",
});

const font_caveat = Caveat({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-caveat",
  display: "swap",
});

/**
 * Class string that defines every theme font variable on one element.
 *
 * @returns A space-separated list of next/font variable class names.
 */
export function font_variable_class(): string {
  return [
    font_cormorant.variable,
    font_fraunces.variable,
    font_libre.variable,
    font_fredoka.variable,
    font_outfit.variable,
    font_caveat.variable,
  ].join(" ");
}
