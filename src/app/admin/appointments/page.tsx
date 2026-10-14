import Link from "next/link";
import { StatusBadge } from "@/components/AppointmentList";
import { Card, Empty, Flash, PageHead } from "@/components/admin/UI";
import { staffStatusAction } from "@/app/actions/admin";
import { getClinicData } from "@/lib/clinic";
import { requireStaff } from "@/lib/admin";
import { fmtDateTz, fmtSlot, localDayEndISO, localDayStartISO, todayInTz } from "@/lib/format";

export const metadata = { title: "Appointments" };

type Row = {
  id: string; reference: string; starts_at: string; ends_at: string;
  status: "pending" | "confirmed" | "cancelled" | "completed" | "no_show";
  profiles: { full_name: string; phone: string | null } | null;
  dental_services: { name: string } | null; dentists: { display_name: string } | null;
};
type SP = { view?: string; status?: string; q?: string; page?: string; ok?: string; err?: string };

const PAGE = 20;
const VIEWS = [["today", "Today"], ["upcoming", "Upcoming"], ["past", "Past"], ["all", "All"]] as const;
const STATUSES = ["pending", "confirmed", "completed", "cancelled", "no_show"];

function NoteForm({ id, status, label, role, ret, danger }: { id: string; status: string; label: string; role: string; ret: string; danger?: boolean }) {
  return (
    <details className="relative">
      <summary className={`${danger ? "adm-btn-danger" : "adm-btn-ghost"} cursor-pointer list-none !px-3 !py-1.5`}>{label}</summary>
      <form action={staffStatusAction} className="absolute right-0 z-30 mt-2 w-72 max-w-[80vw] space-y-3 rounded-xl border border-night-line bg-night-raised p-4 shadow-2xl">
        <input type="hidden" name="appointment_id" value={id} />
        <input type="hidden" name="status" value={status} />
        <input type="hidden" name="return_to" value={ret} />
        <p className="text-sm text-silver">{status === "cancelled" ? "The time is released and the patient is notified." : "The patient is notified."}</p>
        {role !== "dentist" && <input name="note" maxLength={300} placeholder="Note for the patient (optional)" className="field" aria-label="Note for the patient" />}
        <button type="submit" className={danger ? "adm-btn-danger w-full" : "adm-btn-primary w-full"}>Confirm</button>
      </form>
    </details>
  );
}

function Quick({ id, status, label, ret }: { id: string; status: string; label: string; ret: string }) {
  return (
    <form action={staffStatusAction}>
      <input type="hidden" name="appointment_id" value={id} />
      <input type="hidden" name="status" value={status} />
      <input type="hidden" name="return_to" value={ret} />
      <button type="submit" className="adm-btn-primary !px-3 !py-1.5">{label}</button>
    </form>
  );
}

export default async function AdminAppointments({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { sb, role } = await requireStaff();
  const { settings } = await getClinicData();
  const tz = settings.timezone;

  const view = VIEWS.some(([v]) => v === sp.view) ? sp.view! : "upcoming";
  const status = STATUSES.includes(sp.status ?? "") ? sp.status! : "";
  const q = (sp.q ?? "").replace(/[^A-Za-z0-9 .@_-]/g, "").trim().slice(0, 60);
  const page = Math.max(1, Math.floor(Number(sp.page) || 1));

  let query = sb.from("appointments")
    .select("id, reference, starts_at, ends_at, status, profiles(full_name, phone), dental_services(name), dentists(display_name)", { count: "exact" });

  const today = todayInTz(tz);
  const nowISO = new Date().toISOString();
  if (view === "today") query = query.gte("starts_at", localDayStartISO(today, tz)).lt("starts_at", localDayEndISO(today, tz)).order("starts_at");
  else if (view === "upcoming") query = query.gte("starts_at", nowISO).order("starts_at");
  else if (view === "past") query = query.lt("starts_at", nowISO).order("starts_at", { ascending: false });
  else query = query.order("starts_at", { ascending: false });
  if (status) query = query.eq("status", status);

  if (q) {
    const { data: people } = await sb.from("profiles").select("id").or(`full_name.ilike.%${q}%,email.ilike.%${q}%`).limit(50);
    const ids = (people ?? []).map((p) => p.id);
    query = query.or(ids.length ? `reference.ilike.%${q}%,patient_id.in.(${ids.join(",")})` : `reference.ilike.%${q}%`);
  }

  const { data, count } = await query.range((page - 1) * PAGE, page * PAGE - 1);
  const rows = (data ?? []) as unknown as Row[];
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE));
  const href = (over: Record<string, string>) => {
    const p = new URLSearchParams({ view, ...(status && { status }), ...(q && { q }), ...over });
    return `/admin/appointments?${p}`;
  };
  const ret = href({ page: String(page) });

  return (
    <>
      <PageHead title="Appointments" sub={role === "dentist" ? "Your appointments." : "Approve requests, reschedule, cancel, and mark visits complete."} />
      <Flash ok={sp.ok} err={sp.err} />

      <Card className="mb-5">
        <div className="flex flex-wrap items-center gap-3">
          <div role="tablist" className="inline-flex rounded-full border border-night-line p-1">
            {VIEWS.map(([v, label]) => (
              <Link key={v} href={href({ view: v, page: "1" })} role="tab" aria-selected={view === v}
                className={`rounded-full px-4 py-1.5 text-sm ${view === v ? "bg-[#8b5cf6] text-white" : "text-silver hover:text-snow"}`}>{label}</Link>
            ))}
          </div>
          <form className="flex flex-1 flex-wrap gap-2" action="/admin/appointments">
            <input type="hidden" name="view" value={view} />
            <label className="sr-only" htmlFor="q">Search</label>
            <input id="q" name="q" defaultValue={q} placeholder="Search name, email, or reference" className="field min-w-48 flex-1" />
            <label className="sr-only" htmlFor="status">Status</label>
            <select id="status" name="status" defaultValue={status} className="field w-auto">
              <option value="">Any status</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s === "no_show" ? "Missed" : s[0].toUpperCase() + s.slice(1)}</option>)}
            </select>
            <button type="submit" className="adm-btn-ghost">Search</button>
          </form>
        </div>
      </Card>

      {rows.length === 0 ? (
        <Empty>No appointments match.</Empty>
      ) : (
        <ul className="space-y-3">
          {rows.map((a) => {
            const canManage = role !== "dentist";
            return (
              <li key={a.id} className="adm-card grid gap-x-6 gap-y-3 p-4 md:grid-cols-[11rem_1fr_auto] md:items-center">
                <div>
                  <p className="font-medium">{fmtDateTz(a.starts_at, tz)}</p>
                  <p className="text-sm text-silver">{fmtSlot(a.starts_at, tz)} to {fmtSlot(a.ends_at, tz)}</p>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-lg">{a.profiles?.full_name || "Patient"}</p>
                  <p className="truncate text-sm text-silver">{a.dental_services?.name} with {a.dentists?.display_name}</p>
                  <p className="text-xs text-muted">{a.reference}{a.profiles?.phone ? ` / ${a.profiles.phone}` : ""}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 md:justify-end">
                  <StatusBadge status={a.status} />
                  {a.status === "pending" && canManage && <><Quick id={a.id} status="confirmed" label="Approve" ret={ret} /><NoteForm id={a.id} status="cancelled" label="Decline" role={role} ret={ret} danger /></>}
                  {a.status === "confirmed" && (
                    <>
                      <Quick id={a.id} status="completed" label="Complete" ret={ret} />
                      <NoteForm id={a.id} status="no_show" label="Missed" role={role} ret={ret} />
                      {canManage && <Link href={`/admin/appointments/${a.id}/reschedule`} className="adm-btn-ghost !px-3 !py-1.5">Reschedule</Link>}
                      {canManage && <NoteForm id={a.id} status="cancelled" label="Cancel" role={role} ret={ret} danger />}
                    </>
                  )}
                  {a.status === "pending" && canManage && <Link href={`/admin/appointments/${a.id}/reschedule`} className="adm-btn-ghost !px-3 !py-1.5">Reschedule</Link>}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {pages > 1 && (
        <nav aria-label="Pages" className="mt-6 flex items-center justify-between text-sm text-silver">
          {page > 1 ? <Link className="adm-btn-ghost" href={href({ page: String(page - 1) })}>Previous</Link> : <span />}
          <span>Page {page} of {pages} ({count} appointments)</span>
          {page < pages ? <Link className="adm-btn-ghost" href={href({ page: String(page + 1) })}>Next</Link> : <span />}
        </nav>
      )}
    </>
  );
}
