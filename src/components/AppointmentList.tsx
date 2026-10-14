import Link from "next/link";
import { datePartsTz, fmtSlot } from "@/lib/format";
import type { AppointmentRow } from "@/lib/dashboard";

const STATUS: Record<AppointmentRow["status"], { label: string; cls: string }> = {
  confirmed: { label: "Confirmed", cls: "border-emerald/60 text-emerald-light" },
  pending: { label: "Pending approval", cls: "border-silver/50 text-silver" },
  cancelled: { label: "Cancelled", cls: "border-crimson/60 text-crimson-light" },
  completed: { label: "Completed", cls: "border-silver/30 text-muted" },
  no_show: { label: "Missed", cls: "border-crimson/40 text-muted" },
};

export function StatusBadge({ status }: { status: AppointmentRow["status"] }) {
  const s = STATUS[status];
  return <span className={`whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs ${s.cls}`}>{s.label}</span>;
}

export function DateBlock({ iso, timezone, large = false }: { iso: string; timezone: string; large?: boolean }) {
  const p = datePartsTz(iso, timezone);
  return (
    <div className={`flex shrink-0 flex-col items-center justify-center rounded-xl border border-silver/20 bg-ink/60 ${large ? "h-24 w-24" : "h-16 w-16"}`}>
      <span className="text-xs text-muted">{p.weekday}</span>
      <span className={`font-display leading-none ${large ? "text-5xl" : "text-3xl"}`}>{p.day}</span>
      <span className="text-xs text-silver">{p.month}</span>
    </div>
  );
}

export default function AppointmentList({ items, timezone }: { items: AppointmentRow[]; timezone: string }) {
  return (
    <ul className="space-y-3">
      {items.map((a) => (
        <li key={a.id}>
          <Link href={`/dashboard/appointments/${a.id}`} className="panel flex items-center gap-4 p-4 transition-colors hover:border-silver/40">
            <DateBlock iso={a.starts_at} timezone={timezone} />
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-xl leading-tight">{a.dental_services?.name ?? "Appointment"}</h3>
              <p className="text-sm text-silver">{fmtSlot(a.starts_at, timezone)} to {fmtSlot(a.ends_at, timezone)}</p>
              {a.dentists?.display_name && <p className="truncate text-sm text-muted">{a.dentists.display_name}</p>}
            </div>
            <StatusBadge status={a.status} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
