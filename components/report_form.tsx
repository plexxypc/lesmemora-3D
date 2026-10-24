"use client";

import { useState, type FormEvent } from "react";
import { brand_name } from "@/lib/brand";

/**
 * Builds a report on this device and copies it. Nothing is uploaded in this preview.
 *
 * @returns The report form.
 */
export function ReportForm() {
  const [notice, set_notice] = useState<string | null>(null);

  function on_submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const report = [
      `${brand_name} report`,
      `Link: ${String(data.get("link") ?? "")}`,
      `What happened: ${String(data.get("details") ?? "")}`,
      `Contact: ${String(data.get("contact") ?? "") || "not given"}`,
    ].join("\n");
    void navigator.clipboard.writeText(report).then(
      () => set_notice("Copied. This preview does not upload the report."),
      () => set_notice("Copy failed. The report stays in the form and was not uploaded."),
    );
  }

  return (
    <form onSubmit={on_submit} className="mt-6 grid gap-3">
      <label className="grid gap-1 text-sm">
        Museum link
        <input className="rounded-lg border border-white/20 bg-black/20 px-3 py-2" name="link" type="url" required placeholder="https://" />
      </label>
      <label className="grid gap-1 text-sm">
        What happened
        <textarea className="min-h-28 rounded-lg border border-white/20 bg-black/20 px-3 py-2" name="details" required />
      </label>
      <label className="grid gap-1 text-sm">
        Contact, if you want a reply
        <input className="rounded-lg border border-white/20 bg-black/20 px-3 py-2" name="contact" type="text" />
      </label>
      <button className="mt-2 w-fit rounded-full bg-[#e28aa6] px-4 py-2 font-semibold text-[#2a1422]" type="submit">
        Copy report
      </button>
      {notice ? <p role="status">{notice}</p> : null}
    </form>
  );
}
