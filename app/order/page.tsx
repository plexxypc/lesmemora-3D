import type { Metadata } from "next";
import { OrderForm } from "@/components/order/order_form";
import { SiteFooter } from "@/components/site_footer";
import { SiteHeader } from "@/components/site_header";
import { get_theme, theme_css_vars } from "@/lib/themes";

export const metadata: Metadata = {
  title: "Order your museum",
  description: "Tell us about the person, the photos, and the words. We build the museum and send you a private link.",
};

/**
 * Order form. The answers are sent to WhatsApp as one message.
 *
 * @returns The order page.
 */
export default function OrderPage() {
  const romantic = get_theme("romantic");
  return (
    <div style={romantic ? theme_css_vars(romantic) : undefined}>
      <SiteHeader />
      <main className="order_page">
        <OrderForm />
      </main>
      <SiteFooter />
    </div>
  );
}
