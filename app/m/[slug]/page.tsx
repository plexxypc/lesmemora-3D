import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { connection } from "next/server";
import { MuseumRoute } from "@/components/museum/museum_route";
import { share_description } from "@/lib/brand";
import { decide_access, load_sealed_order, order_file_exists } from "@/lib/order_access";
import { gate_cookie_name } from "@/lib/order_gate";
import { get_sample_museum, list_sample_museums } from "@/lib/sample_museums";
import { public_museum_metadata } from "@/lib/share";
import { is_public_slug } from "@/lib/slug";
import LoadingMuseum from "./loading";

/**
 * Prebuild the sample museums. Orders are rendered when someone opens the link.
 *
 * @returns Slug params for `/m/[slug]`.
 */
export function generateStaticParams(): Array<{ slug: string }> {
  return list_sample_museums().map((museum) => ({ slug: museum.slug }));
}

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await props.params;
  if (!is_public_slug(slug)) {
    return private_text("Museum not found");
  }
  if (!order_file_exists(slug)) {
    const sample = get_sample_museum(slug);
    if (!sample) {
      return private_text("Museum not found");
    }
    return museum_meta(public_museum_metadata(sample));
  }
  await connection();
  const cookie_store = await cookies();
  try {
    const order = load_sealed_order(slug);
    if (!order) {
      return private_text("Museum not found");
    }
    const access = decide_access(order, new Date(), cookie_store.get(gate_cookie_name)?.value);
    if (access.status === "open") {
      return museum_meta(public_museum_metadata(access.museum));
    }
    if (access.status === "locked") {
      return private_text(access.title);
    }
  } catch (error) {
    console.error(error);
    return private_text("Museum file needs a fix");
  }
  return private_text("This museum has paused");
}

export default async function Page(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  if (!is_public_slug(slug) || (!order_file_exists(slug) && !get_sample_museum(slug))) {
    notFound();
  }
  return (
    <>
      <Suspense fallback={null}>
        <RequestClock />
      </Suspense>
      <Suspense fallback={<LoadingMuseum />}>
        <MuseumRoute params={Promise.resolve({ slug })} />
      </Suspense>
    </>
  );
}

/** Lets order metadata read the clock and the password cookie at request time. */
async function RequestClock(): Promise<null> {
  await connection();
  return null;
}

function museum_meta(meta: { title: string; description: string; image: string }): Metadata {
  return {
    title: meta.title,
    description: meta.description,
    robots: { index: false, follow: false },
    openGraph: {
      title: meta.title,
      description: meta.description,
      images: [{ url: meta.image, width: 840, height: 560, alt: meta.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: meta.title,
      description: meta.description,
      images: [meta.image],
    },
  };
}

function private_text(title: string): Metadata {
  return {
    title,
    description: share_description,
    robots: { index: false, follow: false },
    openGraph: { title, description: share_description },
    twitter: { card: "summary", title, description: share_description },
  };
}
