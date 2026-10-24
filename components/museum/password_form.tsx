"use client";

import { useActionState } from "react";
import { unlock_museum } from "@/app/m/[slug]/unlock_museum";
import type { gate_form_state } from "@/lib/gate_form";

const initial_state: gate_form_state = { message: "" };

export interface password_form_props {
  slug: string;
}

/**
 * Password form. The action checks the order on the server and returns only a short message.
 *
 * @param props - Museum slug.
 * @returns The form.
 */
export function PasswordForm({ slug }: password_form_props) {
  const [state, action, pending] = useActionState(unlock_museum, initial_state);

  return (
    <form action={action} className="gate_form">
      <input type="hidden" name="slug" value={slug} />
      <label className="grid gap-2 text-left text-sm" htmlFor="museum_password">
        Password
        <input id="museum_password" name="password" type="password" autoComplete="current-password" required autoFocus />
      </label>
      <button className="mm_button" type="submit" disabled={pending}>
        {pending ? "Checking…" : "Open"}
      </button>
      {state.message ? (
        <p role="alert" className="hint">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
