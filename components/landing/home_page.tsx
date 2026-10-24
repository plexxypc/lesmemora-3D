import Image from "next/image";
import Link from "next/link";
import { ContactDock } from "@/components/contact/contact_dock";
import { SiteFooter } from "@/components/site_footer";
import { SiteHeader } from "@/components/site_header";
import { ThemePreview } from "@/components/theme/theme_preview";
import { order_message, whatsapp_link } from "@/lib/contact";
import { plans } from "@/lib/plans";
import { list_sample_museums } from "@/lib/sample_museums";
import { get_theme, list_themes, theme_css_vars } from "@/lib/themes";

const hero_scenes = ["kitchen", "window", "path"] as const;

/**
 * Landing page: a sample corridor, every theme, and the planned prices.
 *
 * @returns The home page.
 */
export function HomePage() {
  const romantic = get_theme("romantic");
  const samples = list_sample_museums();
  if (!romantic) {
    return null;
  }

  return (
    <div style={theme_css_vars(romantic)}>
      <SiteHeader />
      <main>
        <section className="grid items-center gap-10 px-5 pb-14 md:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-xs tracking-[0.2em] text-[#f3c5d4] uppercase">A private gift</p>
            <h1 className="font_display mt-3 max-w-xl text-5xl leading-[0.92] md:text-7xl">
              A museum they can walk through.
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-[#eadbe3]">
              Photos, milestones, and letters in a quiet hallway, shared with one private link. Made for a phone turned sideways.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a className="mm_button" href={whatsapp_link(order_message)} target="_blank" rel="noopener noreferrer">
                Create yours
              </a>
              <Link className="mm_button mm_button_quiet no-underline" href="/m/sample-romantic">
                Walk the sample
              </Link>
            </div>
          </div>
          <Link
            href="/m/sample-romantic"
            aria-label="Walk through the romantic sample museum"
            className="grid grid-cols-3 items-end gap-3 no-underline"
          >
            {hero_scenes.map((scene, index) => (
              <div key={scene} className="frame frame_ornate" style={{ transform: `rotate(${(index - 1) * 2}deg)` }}>
                <div className="frame_mat h-40! w-full!">
                  <Image
                    src={`/samples/romantic/${scene}.png`}
                    alt=""
                    fill
                    sizes="180px"
                    preload={index === 0}
                    className="object-cover"
                  />
                </div>
              </div>
            ))}
          </Link>
        </section>

        <section id="themes" className="px-5 pb-16">
          <h2 className="font_display text-4xl">Choose a feeling</h2>
          <p className="mt-2 max-w-2xl text-[#eadbe3]">
            Each card is the theme preview the wizard will use. Open one to walk a fictional sample. The creator tools come next. These pictures are original art, not anyone&apos;s photos.
          </p>
          <ul className="mt-6 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 xl:grid-cols-4">
            {list_themes().map((theme) => {
              const sample = samples.find((museum) => museum.theme_id === theme.id);
              if (!sample) {
                return null;
              }
              return (
                <li key={theme.id}>
                  <ThemePreview theme={theme} href={`/m/${sample.slug}`} />
                </li>
              );
            })}
          </ul>
        </section>

        <section id="plans" className="px-5 pb-8">
          <h2 className="font_display text-4xl">Plans</h2>
          <p className="mt-2 max-w-2xl text-[#eadbe3]">
            Message us on WhatsApp to order. Checkout comes later. These are the prices, kept in one config file.
          </p>
          <ul className="mt-6 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 xl:grid-cols-4">
            {plans.map((plan) => (
              <li key={plan.id} className="rounded-3xl border border-white/10 bg-black/20 p-4">
                <h3 className="font_display text-2xl">{plan.name}</h3>
                <p className="mt-1 text-2xl">
                  {plan.price_label} <span className="text-sm text-[#eadbe3]">{plan.cadence}</span>
                </p>
                <p className="mt-3 text-sm text-[#eadbe3]">{plan.photo_limit} photos</p>
                <p className="text-sm text-[#eadbe3]">{plan.show_badge ? "Small made-with badge" : "No badge"}</p>
                <p className="text-sm text-[#eadbe3]">{plan.video_export ? "Video export" : "No video export"}</p>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <SiteFooter />
      <ContactDock />
    </div>
  );
}
