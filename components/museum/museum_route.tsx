import { connection } from "next/server";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { MuseumExperience } from "@/components/museum/museum_experience";
import { PasswordGate } from "@/components/museum/password_gate";
import { PausedMuseum } from "@/components/museum/paused_museum";
import { load_library_tracks } from "@/lib/music";
import { decide_access, load_sealed_order } from "@/lib/order_access";
import { gate_cookie_name } from "@/lib/order_gate";
import { get_sample_museum } from "@/lib/sample_museums";
import { is_public_slug } from "@/lib/slug";
import { get_theme } from "@/lib/themes";
import { resolve_track } from "@/lib/tracks";

export interface museum_route_props {
  params: Promise<{ slug: string }>;
}

/**
 * Open an order when one exists, otherwise a sample museum.
 * Expired and locked orders are rendered without exhibit props.
 *
 * @param props - Route params.
 * @returns The viewer, the gate, the paused page, or a 404.
 */
export async function MuseumRoute({ params }: museum_route_props) {
  const { slug } = await params;
  if (!is_public_slug(slug)) {
    notFound();
  }
  let order: ReturnType<typeof load_sealed_order> = null;
  try {
    order = load_sealed_order(slug);
  } catch (error) {
    console.error(error);
    throw new Error("This museum file needs a fix before it can open.");
  }
  if (order) {
    await connection();
    const cookie_store = await cookies();
    const access = decide_access(order, new Date(), cookie_store.get(gate_cookie_name)?.value);
    if (access.status === "paused") {
      return <PausedMuseum slug={access.slug} />;
    }
    if (access.status === "locked") {
      return <PasswordGate slug={access.slug} title={access.title} theme_id={access.theme_id} />;
    }
    if (access.status !== "open") {
      notFound();
    }
    const theme = get_theme(access.museum.theme_id);
    if (!theme) {
      notFound();
    }
    return (
      <MuseumExperience
        museum={access.museum}
        theme={theme}
        track={resolve_track(load_library_tracks(), access.museum.music)}
      />
    );
  }
  const sample = get_sample_museum(slug);
  if (!sample) {
    notFound();
  }
  const theme = get_theme(sample.theme_id);
  if (!theme) {
    notFound();
  }
  return (
    <MuseumExperience museum={sample} theme={theme} track={resolve_track(load_library_tracks(), sample.music)} />
  );
}
