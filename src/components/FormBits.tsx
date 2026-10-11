"use client";

import { useFormStatus } from "react-dom";
import type { FormState } from "@/app/actions/types";

export function SubmitButton({ children, pending: label = "Please wait...", className = "btn-primary w-full" }: { children: React.ReactNode; pending?: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${className} disabled:cursor-wait disabled:opacity-70`}>
      {pending ? label : children}
    </button>
  );
}

type FieldProps = {
  name: string;
  label: string;
  state: FormState;
  type?: string;
  autoComplete?: string;
  hint?: string;
  optional?: boolean;
  required?: boolean;
  defaultValue?: string;
  max?: string;
  inputMode?: "text" | "tel" | "email" | "numeric";
  rows?: number;
  maxLength?: number;
};

export function Field({ name, label, state, type = "text", autoComplete, hint, optional, required = true, defaultValue, max, inputMode, rows, maxLength }: FieldProps) {
  const err = state.fields?.[name];
  const describedBy = [hint ? `${name}-hint` : "", err ? `${name}-err` : ""].filter(Boolean).join(" ") || undefined;
  const value = state.values?.[name] ?? defaultValue ?? "";
  const common = {
    id: name, name, required: required && !optional, defaultValue: value, autoComplete,
    "aria-invalid": err ? true : undefined, "aria-describedby": describedBy, maxLength,
    className: `field ${err ? "!border-crimson-light" : ""}`,
  } as const;

  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-sm text-silver">
        {label}{optional && <span className="text-muted"> (optional)</span>}
      </label>
      {rows ? <textarea {...common} rows={rows} /> : <input {...common} type={type} max={max} inputMode={inputMode} />}
      {hint && <p id={`${name}-hint`} className="mt-1 text-xs text-muted">{hint}</p>}
      {err && <p id={`${name}-err`} className="mt-1 text-sm text-crimson-light">{err}</p>}
    </div>
  );
}

export function CheckField({ name, state, children }: { name: string; state: FormState; children: React.ReactNode }) {
  const err = state.fields?.[name];
  return (
    <div>
      <label className="flex items-start gap-3 text-sm text-silver">
        <input type="checkbox" name={name} id={name} aria-invalid={err ? true : undefined} aria-describedby={err ? `${name}-err` : undefined}
          className="mt-1 h-4 w-4 shrink-0 accent-[#8B1E2D]" />
        <span>{children}</span>
      </label>
      {err && <p id={`${name}-err`} className="mt-1 pl-7 text-sm text-crimson-light">{err}</p>}
    </div>
  );
}

export function FormNotice({ state }: { state: FormState }) {
  if (state.error) return <p role="alert" className="rounded-md border border-crimson/60 bg-crimson/10 px-3 py-2.5 text-sm">{state.error}</p>;
  if (state.message) return <p role="status" className="rounded-md border border-emerald/60 bg-emerald/10 px-3 py-2.5 text-sm">{state.message}</p>;
  return null;
}
