import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, Confirm, Empty, Flash, PageHead } from "@/components/admin/UI";
import { addAvailabilityAction, deleteAvailabilityAction } from "@/app/actions/admin";
import { requireStaff } from "@/lib/admin";
import { getClinicData } from "@/lib/clinic";
import { fmtDateTz, fmtSlot, fmtTime12 } from "@/lib/format";

export const metadata = { title: "Working times" };

const DAYS = [[1, "Monday"], [2, "Tuesday"], [3, "Wednesday"], [4, "Thursday"], [5, "Friday"], [6, "Saturday"], [0, "Sunday"]] as const;

export default async function DoctorTimes({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; err?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { sb } = await requireStaff(["admin"]);
  const { settings } = await getClinicData();

  const { data: doc } = await sb.from("dentists").select("id, display_name, qualifications").eq("id", id).maybeSingle();
  if (!doc) notFound();
  const [{ data: windows }, { data: blocks }, { data: hours }] = await Promise.all([
    sb.from("dentist_availability").select("id, weekday, start_time, end_time").eq("dentist_id", id).order("start_time"),
    sb.from("blocked_slots").select("id, kind, starts_at, ends_at, reason").eq("dentist_id", id).gte("ends_at", new Date().toISOString()).order("starts_at"),
    sb.from("clinic_hours").select("weekday, is_closed, open_time, close_time"),
  ]);
  const byDay = (d: number) => (windows ?? []).filter((w) => w.weekday === d);
  const clinic = (d: number) => (hours ?? []).find((h) => h.weekday === d);

  return (
    <>
      <Link href="/admin/doctors" className="text-sm text-silver hover:text-snow">Back to doctors</Link>
      <div className="mt-2"><PageHead title={doc.display_name} sub="Patients can only book inside the hours below, and only when the clinic is also open." /></div>
      <Flash ok={sp.ok} err={sp.err} />

      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <h2 className="mb-4 text-2xl">Weekly schedule</h2>
          <ul className="divide-y divide-night-line">
            {DAYS.map(([d, name]) => {
              const ws = byDay(d);
              const c = clinic(d);
              return (
                <li key={d} className="flex flex-wrap items-start justify-between gap-3 py-3">
                  <div className="w-28 text-silver">{name}{c?.is_closed && <span className="block text-xs text-muted">Clinic closed</span>}</div>
                  <div className="flex min-w-0 flex-1 flex-wrap gap-2">
                    {ws.length === 0 && <span className="text-sm text-muted">Not working</span>}
                    {ws.map((w) => (
                      <span key={w.id} className="inline-flex items-center gap-2 rounded-lg border border-night-line bg-night px-3 py-1.5 text-sm">
                        {fmtTime12(w.start_time)} to {fmtTime12(w.end_time)}
                        <form action={deleteAvailabilityAction}>
                          <input type="hidden" name="id" value={w.id} /><input type="hidden" name="dentist_id" value={id} />
                          <button type="submit" aria-label={`Remove ${name} ${fmtTime12(w.start_time)} to ${fmtTime12(w.end_time)}`} className="text-crimson-light hover:text-white">Remove</button>
                        </form>
                      </span>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>

        <div className="space-y-5">
          <Card>
            <h2 className="mb-4 text-2xl">Add working time</h2>
            <form action={addAvailabilityAction} className="space-y-4">
              <input type="hidden" name="dentist_id" value={id} />
              <fieldset>
                <legend className="mb-2 text-sm text-silver">Days</legend>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map(([d, name]) => (
                    <label key={d} className="cursor-pointer">
                      <input type="checkbox" name="days" value={d} className="peer sr-only" />
                      <span className="block rounded-lg border border-night-line px-3 py-1.5 text-sm text-silver peer-checked:border-[#8b5cf6] peer-checked:bg-[#8b5cf6]/25 peer-checked:text-white peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-silver">{name.slice(0, 3)}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="grid grid-cols-2 gap-4">
                <div><label htmlFor="start_time" className="mb-1.5 block text-sm text-silver">From</label><input id="start_time" name="start_time" type="time" defaultValue="08:00" required className="field" /></div>
                <div><label htmlFor="end_time" className="mb-1.5 block text-sm text-silver">To</label><input id="end_time" name="end_time" type="time" defaultValue="17:00" required className="field" /></div>
              </div>
              <p className="text-xs text-muted">Lunch breaks are set once for the whole clinic under Hours and settings.</p>
              <button type="submit" className="adm-btn-primary">Add time</button>
            </form>
          </Card>

          <Card>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-2xl">Leave and blocks</h2>
              <Link href={`/admin/blocks?dentist=${id}`} className="adm-btn-ghost !px-3 !py-1.5">Add leave</Link>
            </div>
            {(blocks ?? []).length === 0 ? <p className="text-sm text-muted">No upcoming leave.</p> : (
              <ul className="space-y-2 text-sm">
                {blocks!.map((b) => (
                  <li key={b.id} className="rounded-lg border border-night-line bg-night px-3 py-2">
                    <span className="capitalize">{b.kind}</span>: {fmtDateTz(b.starts_at, settings.timezone)}, {fmtSlot(b.starts_at, settings.timezone)} to {fmtDateTz(b.ends_at, settings.timezone)}, {fmtSlot(b.ends_at, settings.timezone)}
                    {b.reason && <span className="block text-muted">{b.reason}</span>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
