"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { copy_text } from "@/lib/copy_text";
import { whatsapp_link } from "@/lib/contact";
import {
  empty_intake,
  format_intake_message,
  intake_problems,
  letter_limit,
  max_milestones,
  max_photo_rows,
  type intake_form,
} from "@/lib/intake";
import { plans } from "@/lib/plans";
import { get_theme, list_themes } from "@/lib/themes";

const storage_key = "lesmemora_order_form_v1";
const occasions = ["Birthday", "Anniversary", "Valentine's Day", "Just because", "Reliving memories", "Other"];
const step_names = ["The people", "The words", "Photos and dates", "Letter and music", "Send"] as const;
const long_message = 3400;

function read_saved(): intake_form | null {
  try {
    const raw = window.localStorage.getItem(storage_key);
    if (!raw) {
      return null;
    }
    return { ...empty_intake(), ...(JSON.parse(raw) as Partial<intake_form>) };
  } catch {
    return null;
  }
}

/**
 * Step-by-step order form. It builds one WhatsApp message from the answers.
 * Photos cannot be attached to a link, so the form tells the customer to send them next.
 *
 * @returns The form.
 */
export function OrderForm() {
  const [form, set_form] = useState<intake_form>(() => empty_intake());
  const [step, set_step] = useState(0);
  const [errors, set_errors] = useState<string[]>([]);
  const [copied, set_copied] = useState<"idle" | "yes" | "no">("idle");
  const [restored, set_restored] = useState(false);
  const top = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = read_saved();
    if (saved && JSON.stringify(saved) !== JSON.stringify(empty_intake())) {
      queueMicrotask(() => {
        set_form(saved);
        set_restored(true);
      });
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(storage_key, JSON.stringify(form));
    } catch {
      // Private browsing can block storage. The form still works.
    }
  }, [form]);

  const theme = get_theme(form.theme_id) ?? get_theme("romantic");
  const plan = plans.find((entry) => entry.id === form.package_id) ?? plans[0];
  const message = useMemo(() => format_intake_message(form), [form]);
  const problems = useMemo(() => intake_problems(form), [form]);
  const photo_rows = form.photo_captions.length;
  const over_limit = plan ? photo_rows > plan.photo_limit : false;

  function update<K extends keyof intake_form>(key: K, value: intake_form[K]) {
    set_form((current) => ({ ...current, [key]: value }));
    set_copied("idle");
    if (errors.length > 0) {
      set_errors([]);
    }
  }

  function go(next: number) {
    set_step(next);
    set_errors([]);
    top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function next_step() {
    if (step === 0) {
      const needed: string[] = [];
      if (!form.customer_name.trim()) {
        needed.push("Add your name so we know who is ordering.");
      }
      if (!form.recipient_name.trim()) {
        needed.push("Add the name of the person the museum is for.");
      }
      if (needed.length > 0) {
        set_errors(needed);
        return;
      }
    }
    go(Math.min(step + 1, step_names.length - 1));
  }

  async function copy_message() {
    set_copied((await copy_text(message)) ? "yes" : "no");
  }

  function start_over() {
    set_form(empty_intake());
    set_step(0);
    set_restored(false);
    try {
      window.localStorage.removeItem(storage_key);
    } catch {
      // Nothing to clear.
    }
  }

  function set_caption(index: number, value: string) {
    update(
      "photo_captions",
      form.photo_captions.map((caption, at) => (at === index ? value : caption)),
    );
  }

  function set_milestone(index: number, patch: Partial<intake_form["milestones"][number]>) {
    update(
      "milestones",
      form.milestones.map((milestone, at) => (at === index ? { ...milestone, ...patch } : milestone)),
    );
  }

  const prompts = theme?.wizard_prompts;
  const send_blocked = problems.length > 0;

  return (
    <div className="order_form" ref={top}>
      <header className="order_head">
        <p className="order_kicker">Order a museum</p>
        <h1 className="font_display">Tell us about them.</h1>
        <p>
          Five short steps. At the end, your answers open in WhatsApp as one message. Then you send the photos in the same chat and we build
          the museum.
        </p>
        {restored ? (
          <p className="order_restored" role="status">
            We kept your earlier answers.{" "}
            <button type="button" className="order_link" onClick={start_over}>
              Start again
            </button>
          </p>
        ) : null}
      </header>

      <ol className="order_steps" aria-label="Progress">
        {step_names.map((name, index) => (
          <li key={name} aria-current={index === step ? "step" : undefined} data-done={index < step}>
            <button type="button" onClick={() => (index <= step ? go(index) : undefined)} disabled={index > step}>
              <span>{index + 1}</span> {name}
            </button>
          </li>
        ))}
      </ol>

      {errors.length > 0 ? (
        <div className="order_errors" role="alert">
          {errors.map((error) => (
            <p key={error}>{error}</p>
          ))}
        </div>
      ) : null}

      {step === 0 ? (
        <section className="order_card" aria-labelledby="step_people">
          <h2 id="step_people" className="font_display">
            The people
          </h2>
          <label className="order_field">
            <span>Your name</span>
            <input value={form.customer_name} onChange={(event) => update("customer_name", event.target.value)} autoComplete="name" />
          </label>
          <label className="order_field">
            <span>Who is the museum for?</span>
            <input value={form.recipient_name} onChange={(event) => update("recipient_name", event.target.value)} placeholder="Their first name" />
            {prompts ? <small>{prompts.recipient}</small> : null}
          </label>
          <label className="order_field">
            <span>Signed from (optional)</span>
            <input value={form.from_name} onChange={(event) => update("from_name", event.target.value)} />
          </label>
          <fieldset className="order_field">
            <legend>What is the occasion?</legend>
            <div className="order_chips">
              {occasions.map((occasion) => (
                <button
                  key={occasion}
                  type="button"
                  aria-pressed={form.occasion === occasion}
                  onClick={() => update("occasion", form.occasion === occasion ? "" : occasion)}
                >
                  {occasion}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className="order_field">
            <legend>Pick a style</legend>
            <div className="order_themes">
              {list_themes().map((entry) => (
                <label key={entry.id} className="order_theme" data-selected={entry.id === form.theme_id}>
                  <input
                    type="radio"
                    name="theme"
                    value={entry.id}
                    checked={entry.id === form.theme_id}
                    onChange={() => update("theme_id", entry.id)}
                  />
                  <span className="order_swatch" style={{ background: `linear-gradient(135deg, ${entry.palette.background}, ${entry.palette.accent})` }} />
                  <strong>{entry.name}</strong>
                  <small>{entry.tagline}</small>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="order_field">
            <legend>How long should it stay online?</legend>
            <div className="order_plans">
              {plans.map((entry) => (
                <label key={entry.id} className="order_plan" data-selected={entry.id === form.package_id}>
                  <input
                    type="radio"
                    name="package"
                    value={entry.id}
                    checked={entry.id === form.package_id}
                    onChange={() => update("package_id", entry.id)}
                  />
                  <strong>{entry.name}</strong>
                  <span>
                    {entry.price_label} · {entry.cadence}
                  </span>
                  <small>Up to {entry.photo_limit} photos{entry.show_badge ? ", small Les Memora badge" : ""}</small>
                </label>
              ))}
            </div>
            <small>We confirm the price and how to pay in the chat before we start.</small>
          </fieldset>
          <label className="order_field">
            <span>Need it by (optional)</span>
            <input type="date" value={form.need_by} onChange={(event) => update("need_by", event.target.value)} />
          </label>
        </section>
      ) : null}

      {step === 1 ? (
        <section className="order_card" aria-labelledby="step_words">
          <h2 id="step_words" className="font_display">
            The words on the wall
          </h2>
          <label className="order_field">
            <span>Museum title</span>
            <input
              value={form.title}
              maxLength={120}
              onChange={(event) => update("title", event.target.value)}
              placeholder={`For ${form.recipient_name.trim() || "them"}`}
            />
            <small>It shows in big glowing letters at the entrance. Leave it empty and we will use the one above.</small>
          </label>
          <label className="order_field">
            <span>Dedication line</span>
            <textarea
              rows={3}
              value={form.dedication}
              maxLength={400}
              onChange={(event) => update("dedication", event.target.value)}
              placeholder={theme?.default_copy.dedication}
            />
            {prompts ? <small>{prompts.dedication}</small> : null}
          </label>
          <label className="order_field">
            <span>Closing note</span>
            <textarea
              rows={3}
              value={form.closing_note}
              maxLength={400}
              onChange={(event) => update("closing_note", event.target.value)}
              placeholder={theme?.default_copy.closing}
            />
            <small>The last thing they read before they leave.</small>
          </label>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="order_card" aria-labelledby="step_photos">
          <h2 id="step_photos" className="font_display">
            Photos and dates
          </h2>
          <p className="order_note">
            You cannot attach photos to this form. Write one caption for each photo here, in the order you want them. After you tap send on
            WhatsApp, send the photos in the same order. A photo without words is fine too, leave its line empty.
          </p>
          <div className="order_list">
            {form.photo_captions.map((caption, index) => (
              <div key={index} className="order_row">
                <span className="order_index">{index + 1}</span>
                <input
                  aria-label={`Caption for photo ${index + 1}`}
                  value={caption}
                  maxLength={200}
                  onChange={(event) => set_caption(index, event.target.value)}
                  placeholder={prompts?.photo_caption ?? "A short caption"}
                />
                <button
                  type="button"
                  className="order_remove"
                  aria-label={`Remove photo ${index + 1}`}
                  onClick={() => update("photo_captions", form.photo_captions.filter((_, at) => at !== index))}
                  disabled={form.photo_captions.length === 1}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="mm_button mm_button_quiet"
            onClick={() => update("photo_captions", [...form.photo_captions, ""])}
            disabled={photo_rows >= max_photo_rows}
          >
            Add another photo
          </button>
          {over_limit && plan ? (
            <p className="order_warning" role="status">
              The {plan.name} plan holds up to {plan.photo_limit} photos. You have {photo_rows}.
            </p>
          ) : null}

          <h3 className="font_display">Important dates (optional)</h3>
          <p className="order_note">{prompts?.milestone ?? "Dates that matter. They appear as plaques in a timeline hall."}</p>
          <div className="order_list">
            {form.milestones.map((milestone, index) => (
              <div key={index} className="order_milestone">
                <input
                  type="date"
                  aria-label={`Date ${index + 1}`}
                  value={milestone.date}
                  onChange={(event) => set_milestone(index, { date: event.target.value })}
                />
                <input
                  aria-label={`Name of date ${index + 1}`}
                  value={milestone.title}
                  maxLength={80}
                  placeholder="What happened"
                  onChange={(event) => set_milestone(index, { title: event.target.value })}
                />
                <input
                  aria-label={`Details of date ${index + 1}`}
                  value={milestone.detail}
                  maxLength={240}
                  placeholder="A line or two (optional)"
                  onChange={(event) => set_milestone(index, { detail: event.target.value })}
                />
                <button
                  type="button"
                  className="order_remove"
                  aria-label={`Remove date ${index + 1}`}
                  onClick={() => update("milestones", form.milestones.filter((_, at) => at !== index))}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="mm_button mm_button_quiet"
            onClick={() => update("milestones", [...form.milestones, { date: "", title: "", detail: "" }])}
            disabled={form.milestones.length >= max_milestones}
          >
            Add a date
          </button>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="order_card" aria-labelledby="step_letter">
          <h2 id="step_letter" className="font_display">
            Letter and music
          </h2>
          <label className="order_field">
            <span>Letter title (optional)</span>
            <input value={form.letter_title} maxLength={80} onChange={(event) => update("letter_title", event.target.value)} placeholder="Read this one aloud" />
          </label>
          <label className="order_field">
            <span>Letter (optional)</span>
            <textarea rows={8} value={form.letter} onChange={(event) => update("letter", event.target.value)} />
            <small>
              {prompts?.letter ?? "Write it the way you would say it."} {form.letter.length}/{letter_limit} characters. Longer letter? Send it in
              the chat instead.
            </small>
          </label>
          <label className="order_field">
            <span>Music</span>
            <input
              value={form.music}
              onChange={(event) => update("music", event.target.value)}
              placeholder="Paste a YouTube link, or type a song name"
            />
            <small>
              YouTube links play for everyone. Spotify and Apple Music links only play the full song for people logged in there. Leave it
              empty and we will choose something that fits.
            </small>
          </label>
          <label className="order_field">
            <span>Password (optional)</span>
            <input value={form.password} maxLength={80} onChange={(event) => update("password", event.target.value)} autoComplete="off" />
            <small>If you set one, share it separately with the person you are gifting.</small>
          </label>
        </section>
      ) : null}

      {step === 4 ? (
        <section className="order_card" aria-labelledby="step_send">
          <h2 id="step_send" className="font_display">
            Ready to send
          </h2>
          <dl className="order_summary">
            <div>
              <dt>For</dt>
              <dd>{form.recipient_name || "—"}</dd>
            </div>
            <div>
              <dt>Style</dt>
              <dd>{theme?.name}</dd>
            </div>
            <div>
              <dt>Plan</dt>
              <dd>
                {plan?.name} ({plan?.price_label}, {plan?.cadence})
              </dd>
            </div>
            <div>
              <dt>Photos</dt>
              <dd>{form.photo_captions.filter((_, index) => index < photo_rows).length} to send</dd>
            </div>
            <div>
              <dt>Dates</dt>
              <dd>{form.milestones.filter((milestone) => milestone.title && milestone.date).length}</dd>
            </div>
            <div>
              <dt>Letter</dt>
              <dd>{form.letter.trim() ? "Yes" : "No"}</dd>
            </div>
          </dl>

          {problems.length > 0 ? (
            <div className="order_errors" role="alert">
              {problems.map((problem) => (
                <p key={problem}>{problem}</p>
              ))}
            </div>
          ) : null}

          <div className="order_send">
            <a
              className="mm_button"
              href={send_blocked ? undefined : whatsapp_link(message)}
              target="_blank"
              rel="noopener noreferrer"
              aria-disabled={send_blocked}
              onClick={(event) => {
                if (send_blocked) {
                  event.preventDefault();
                }
              }}
            >
              Send on WhatsApp
            </a>
            <button type="button" className="mm_button mm_button_quiet" onClick={copy_message}>
              Copy the message
            </button>
          </div>
          {copied === "yes" ? <p role="status">Copied. Paste it into our WhatsApp chat.</p> : null}
          {copied === "no" ? <p role="status">Your browser would not copy it. Open the preview below and copy the text by hand.</p> : null}
          {message.length > long_message ? (
            <p className="order_warning">
              This message is long. If WhatsApp cuts it off, use Copy the message and paste it into the chat.
            </p>
          ) : null}

          <ol className="order_after">
            <li>WhatsApp opens with your answers already typed. Tap send.</li>
            <li>Send your photos in the same chat, in the order of your captions.</li>
            <li>We confirm the price, take payment, and send you the private link.</li>
          </ol>

          <details className="order_preview">
            <summary>See the message that will be sent</summary>
            <pre>{message}</pre>
          </details>
        </section>
      ) : null}

      <div className="order_nav">
        {step > 0 ? (
          <button type="button" className="mm_button mm_button_quiet" onClick={() => go(step - 1)}>
            Back
          </button>
        ) : (
          <span />
        )}
        {step < step_names.length - 1 ? (
          <button type="button" className="mm_button" onClick={next_step}>
            Next
          </button>
        ) : (
          <button type="button" className="order_link" onClick={start_over}>
            Clear the form
          </button>
        )}
      </div>
    </div>
  );
}
