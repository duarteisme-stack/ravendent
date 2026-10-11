import Link from "next/link";
import { fmtDateTz, fmtSlot } from "@/lib/format";
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
  return <span className={`rounded-full border px-2.5 py-0.5 text-xs ${s.cls}`}>{s.label}</span>;
}

export default function AppointmentList({ items, timezone }: { items: AppointmentRow[]; timezone: string }) {
  return (
    <ul className="divide-y divide-silver/15 border-y border-silver/15">
      {items.map((a) => (
        <li key={a.id} className="grid gap-x-8 gap-y-1 py-5 sm:grid-cols-[1fr_auto]">
          <div>
            <h3 className="text-2xl">{a.dental_services?.name ?? "Appointment"}</h3>
            <p className="text-silver">
              {fmtDateTz(a.starts_at, timezone)}, {fmtSlot(a.starts_at, timezone)} to {fmtSlot(a.ends_at, timezone)}
            </p>
            <p className="text-sm text-muted">
              {a.dentists?.display_name ? `${a.dentists.display_name}. ` : ""}Reference {a.reference}
            </p>
          </div>
          <div className="flex items-center gap-4 sm:flex-col sm:items-end sm:justify-between">
            <StatusBadge status={a.status} />
            <Link href={`/dashboard/appointments/${a.id}`} className="text-sm text-crimson-light underline underline-offset-4 hover:text-snow">View ticket</Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
