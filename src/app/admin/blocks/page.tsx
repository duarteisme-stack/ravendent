import { Card, Check, Confirm, Empty, Flash, PageHead } from "@/components/admin/UI";
import { addBlockAction, deleteBlockAction } from "@/app/actions/admin";
import { requireStaff } from "@/lib/admin";
import { getClinicData } from "@/lib/clinic";
import { fmtDateTz, fmtSlot, todayInTz } from "@/lib/format";

export const metadata = { title: "Holidays and leave" };

type Block = { id: string; kind: string; starts_at: string; ends_at: string; reason: string | null; dentists: { display_name: string } | null };

export default async function BlocksPage({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string; dentist?: string }> }) {
  const sp = await searchParams;
  const { sb } = await requireStaff(["admin", "receptionist"]);
  const { settings } = await getClinicData();
  const tz = settings.timezone;

  const [{ data }, { data: docs }] = await Promise.all([
    sb.from("blocked_slots").select("id, kind, starts_at, ends_at, reason, dentists(display_name)").gte("ends_at", new Date().toISOString()).order("starts_at"),
    sb.from("dentists").select("id, display_name").order("display_name"),
  ]);
  const blocks = (data ?? []) as unknown as Block[];
  const today = todayInTz(tz);

  return (
    <>
      <PageHead title="Holidays and leave" sub="Close the whole clinic or one doctor for a day, a range of days, or part of a day. Blocked times disappear from the booking calendar straight away." />
      <Flash ok={sp.ok} err={sp.err} />

      <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <Card>
          <h2 className="mb-4 text-2xl">Add a closure</h2>
          <form action={addBlockAction} className="space-y-4">
            <div>
              <label htmlFor="dentist_id" className="mb-1.5 block text-sm text-silver">Applies to</label>
              <select id="dentist_id" name="dentist_id" defaultValue={sp.dentist ?? ""} className="field">
                <option value="">Whole clinic</option>
                {(docs ?? []).map((d) => <option key={d.id} value={d.id}>{d.display_name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="kind" className="mb-1.5 block text-sm text-silver">Type</label>
              <select id="kind" name="kind" className="field" defaultValue="holiday">
                <option value="holiday">Holiday</option><option value="leave">Leave</option><option value="blocked">Other block</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label htmlFor="start_date" className="mb-1.5 block text-sm text-silver">From date</label><input id="start_date" name="start_date" type="date" min={today} required className="field" /></div>
              <div><label htmlFor="end_date" className="mb-1.5 block text-sm text-silver">To date</label><input id="end_date" name="end_date" type="date" min={today} className="field" /></div>
            </div>
            <Check name="all_day" label="All day" defaultChecked />
            <div className="grid grid-cols-2 gap-4">
              <div><label htmlFor="start_time" className="mb-1.5 block text-sm text-silver">From time</label><input id="start_time" name="start_time" type="time" defaultValue="08:00" className="field" /></div>
              <div><label htmlFor="end_time" className="mb-1.5 block text-sm text-silver">To time</label><input id="end_time" name="end_time" type="time" defaultValue="17:00" className="field" /></div>
            </div>
            <p className="text-xs text-muted">Times only apply when All day is unticked. Leave the end date empty for a single day.</p>
            <div><label htmlFor="reason" className="mb-1.5 block text-sm text-silver">Reason <span className="text-muted">(optional)</span></label><input id="reason" name="reason" maxLength={200} className="field" /></div>
            <button type="submit" className="adm-btn-primary">Save closure</button>
          </form>
        </Card>

        <Card>
          <h2 className="mb-4 text-2xl">Upcoming closures</h2>
          {blocks.length === 0 ? <Empty>No upcoming closures.</Empty> : (
            <ul className="space-y-3">
              {blocks.map((b) => (
                <li key={b.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-night-line bg-night p-4">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2"><span className="adm-pill capitalize">{b.kind}</span><span className="text-silver">{b.dentists?.display_name ?? "Whole clinic"}</span></p>
                    <p className="mt-1 text-sm">{fmtDateTz(b.starts_at, tz)}, {fmtSlot(b.starts_at, tz)}</p>
                    <p className="text-sm text-silver">until {fmtDateTz(new Date(Date.parse(b.ends_at) - 1000).toISOString(), tz)}, {fmtSlot(b.ends_at, tz)}</p>
                    {b.reason && <p className="mt-1 text-sm text-muted">{b.reason}</p>}
                  </div>
                  <Confirm action={deleteBlockAction} fields={{ id: b.id }} label="Remove" button="Yes, remove" message="Remove this closure? The time becomes bookable again." />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
