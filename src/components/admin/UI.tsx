import type { ReactNode } from "react";

export function PageHead({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-4xl sm:text-5xl">{title}</h1>
        {sub && <p className="mt-1 max-w-2xl text-sm text-muted">{sub}</p>}
      </div>
      {action}
    </header>
  );
}

export function Flash({ ok, err }: { ok?: string; err?: string }) {
  if (!ok && !err) return null;
  return err
    ? <p role="alert" className="mb-5 rounded-lg border border-crimson/60 bg-crimson/10 px-4 py-3 text-sm">{err.slice(0, 300)}</p>
    : <p role="status" className="mb-5 rounded-lg border border-emerald/60 bg-emerald/10 px-4 py-3 text-sm">{ok!.slice(0, 300)}</p>;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`adm-card p-5 sm:p-6 ${className}`}>{children}</section>;
}

export function Label({ htmlFor, children, optional }: { htmlFor: string; children: ReactNode; optional?: boolean }) {
  return <label htmlFor={htmlFor} className="mb-1.5 block text-sm text-silver">{children}{optional && <span className="text-muted"> (optional)</span>}</label>;
}

type InputProps = { name: string; label: string; defaultValue?: string | number | null; type?: string; required?: boolean; optional?: boolean; hint?: string; min?: number | string; max?: number | string; step?: number | string; idPrefix?: string; placeholder?: string };
export function Input({ name, label, defaultValue, type = "text", required, optional, hint, min, max, step, idPrefix = "", placeholder }: InputProps) {
  const id = `${idPrefix}${name}`;
  return (
    <div>
      <Label htmlFor={id} optional={optional}>{label}</Label>
      <input id={id} name={name} type={type} defaultValue={defaultValue ?? ""} required={required} min={min} max={max} step={step} placeholder={placeholder} className="field" />
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function Textarea({ name, label, defaultValue, optional, rows = 3, idPrefix = "" }: { name: string; label: string; defaultValue?: string | null; optional?: boolean; rows?: number; idPrefix?: string }) {
  const id = `${idPrefix}${name}`;
  return (
    <div>
      <Label htmlFor={id} optional={optional}>{label}</Label>
      <textarea id={id} name={name} rows={rows} defaultValue={defaultValue ?? ""} className="field" />
    </div>
  );
}

export function Check({ name, label, defaultChecked, idPrefix = "" }: { name: string; label: string; defaultChecked?: boolean; idPrefix?: string }) {
  return (
    <label htmlFor={`${idPrefix}${name}`} className="flex items-center gap-2.5 text-sm text-silver">
      <input id={`${idPrefix}${name}`} type="checkbox" name={name} defaultChecked={defaultChecked} className="h-4 w-4 accent-[#8b5cf6]" />
      {label}
    </label>
  );
}

/** Two-step delete with no JavaScript: a details popover holding the real form. */
export function Confirm({ action, fields, label, message, danger = true, button }: {
  action: (fd: FormData) => void | Promise<void>; fields: Record<string, string>; label: string; message: string; danger?: boolean; button?: string;
}) {
  return (
    <details className="relative">
      <summary className={`${danger ? "adm-btn-danger" : "adm-btn-ghost"} cursor-pointer list-none`}>{label}</summary>
      <form action={action} className="absolute right-0 z-30 mt-2 w-72 max-w-[80vw] space-y-3 rounded-xl border border-night-line bg-night-raised p-4 shadow-2xl">
        {Object.entries(fields).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
        <p className="text-sm text-silver">{message}</p>
        <button type="submit" className={danger ? "adm-btn-danger w-full" : "adm-btn-primary w-full"}>{button ?? "Yes, continue"}</button>
      </form>
    </details>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-night-line px-6 py-10 text-center text-muted">{children}</div>;
}
