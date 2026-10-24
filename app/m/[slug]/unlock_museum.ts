"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { gate_form_state } from "@/lib/gate_form";
import { load_sealed_order } from "@/lib/order_access";
import { expires_at_ms } from "@/lib/order_schema";
import { gate_cookie_name, gate_max_age_seconds, password_matches, sign_gate_cookie } from "@/lib/order_gate";
import { is_public_slug } from "@/lib/slug";

/**
 * Check a password on the server and set a short-lived cookie.
 * The return value is only a message. Exhibit text is not included.
 *
 * @param _state - Previous form state. Unused.
 * @param form_data - Slug and password from the gate.
 * @returns A message when the password is wrong. A match redirects.
 */
export async function unlock_museum(_state: gate_form_state, form_data: FormData): Promise<gate_form_state> {
  const slug = String(form_data.get("slug") ?? "");
  const password = String(form_data.get("password") ?? "");
  if (!is_public_slug(slug)) {
    return { message: "This link is not a museum." };
  }
  let order: ReturnType<typeof load_sealed_order>;
  try {
    order = load_sealed_order(slug);
  } catch (error) {
    console.error(error);
    return { message: "This museum file needs a fix before it can open." };
  }
  if (!order || !order.password_hash) {
    redirect(`/m/${slug}`);
  }
  if (expires_at_ms(order.expires_at) <= Date.now()) {
    redirect(`/m/${slug}`);
  }
  if (!password_matches(password, order.slug, order.password_hash)) {
    return { message: "That password does not open this museum." };
  }
  const cookie_store = await cookies();
  cookie_store.set(gate_cookie_name, sign_gate_cookie(order.slug, order.password_hash, new Date()), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: `/m/${slug}`,
    maxAge: gate_max_age_seconds,
  });
  redirect(`/m/${slug}`);
}
