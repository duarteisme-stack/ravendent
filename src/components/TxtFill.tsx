"use client";

import { useRef, useState } from "react";
import { LABELS, buildTemplate, parseProfileText, type FieldKey } from "@/lib/profile-text";

type Props = {
  /** Which form input (by name) receives each field from the file. Fields the form does not have are skipped. */
  map: Partial<Record<FieldKey, string>>;
  title?: string;
};

function setValue(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

export default function TxtFill({ map, title = "Fill this in from a text file" }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const keys = Object.keys(map) as FieldKey[];
  const template = `data:text/plain;charset=utf-8,${encodeURIComponent(buildTemplate(keys))}`;

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow choosing the same file again
    if (!file) return;
    if (file.size > 100_000) return setMsg({ ok: false, text: "That file is too large. Use a small .txt file (under 100 KB)." });
    if (!/\.txt$/i.test(file.name) && file.type !== "text/plain") return setMsg({ ok: false, text: "Please choose a .txt file." });

    const form = input.current?.closest("form");
    if (!form) return;
    const { fields, unreadable } = parseProfileText(await file.text());

    const filled: string[] = [];
    for (const k of keys) {
      const v = fields[k];
      const el = form.elements.namedItem(map[k]!) as HTMLInputElement | HTMLTextAreaElement | null;
      if (v && el && "value" in el) { setValue(el, v); filled.push(LABELS[k]); }
    }
    const bad = unreadable.filter((k) => keys.includes(k)).map((k) => LABELS[k]);

    if (!filled.length) {
      setMsg({ ok: false, text: "We could not find any matching lines. Each line should look like \"Full name: Ana Reyes\". Download the template to see the format." });
      return;
    }
    setMsg({
      ok: true,
      text: `Filled in: ${filled.join(", ")}.${bad.length ? ` Could not read: ${bad.join(", ")}.` : ""} Check everything below before you save. Nothing has been saved yet.`,
    });
  }

  return (
    <div className="rounded-xl border border-dashed border-silver/30 bg-charcoal/60 p-4">
      <p className="font-medium">{title}</p>
      <p className="mt-0.5 text-sm text-muted">Choose a .txt file with lines like &quot;Full name: Ana Reyes&quot;. It is read on your device and is not uploaded.</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" className="btn-ghost !py-2 !px-4 !text-sm" onClick={() => input.current?.click()}>Choose .txt file</button>
        <a href={template} download="ravendent-details-template.txt" className="text-sm text-crimson-light underline underline-offset-4 hover:text-snow">Download a blank template</a>
        <input ref={input} type="file" accept=".txt,text/plain" onChange={onFile} className="sr-only" aria-label="Choose a text file to fill in the form" tabIndex={-1} />
      </div>
      {msg && <p role="status" className={`mt-3 rounded-md border px-3 py-2 text-sm ${msg.ok ? "border-emerald/60 bg-emerald/10" : "border-crimson/60 bg-crimson/10"}`}>{msg.text}</p>}
    </div>
  );
}
