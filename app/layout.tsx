import type { Metadata, Viewport } from "next";
import { brand_name, brand_tagline } from "@/lib/brand";
import { font_variable_class } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: brand_name,
    template: `%s · ${brand_name}`,
  },
  description: `${brand_tagline} Walk through photos, milestones, and letters.`,
  openGraph: {
    title: brand_name,
    description: brand_tagline,
    images: [
      {
        url: "/samples/romantic/cover.png",
        width: 840,
        height: 560,
        alt: "Illustrated entrance of a sample museum",
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#1a0e16",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${font_variable_class()} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
