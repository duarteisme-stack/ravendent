import { Card, Check, Flash, Input, PageHead } from "@/components/admin/UI";
import { saveClinicHoursAction, saveClinicSettingsAction } from "@/app/actions/admin";
import { requireStaff } from "@/lib/admin";
import { WEEKDAY_NAMES } from "@/lib/format";

export const metadata = { title: "Hours and settings" };

const trim = (t: string | null) => (t ? t.slice(0, 5) : "");

export default async function ClinicPage({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const sp = await searchParams;
  const { sb } = await requireStaff(["admin"]);
  const [{ data: s }, { data: hours }] = await Promise.all([
    sb.from("clinic_settings").select("*").eq("id", 1).single(),
    sb.from("clinic_hours").select("*").order("weekday"),
  ]);
  const h = (d: number) => hours?.find((x) => x.weekday === d);

  return (
    <>
      <PageHead title="Hours and settings" sub="What patients see on the website, and the rules the booking system follows." />
      <Flash ok={sp.ok} err={sp.err} />

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-2xl">Opening hours</h2>
          <form action={saveClinicHoursAction} className="space-y-3">
            {[1, 2, 3, 4, 5, 6, 0].map((d) => {
              const row = h(d);
              return (
                <fieldset key={d} className="rounded-xl border border-night-line p-3">
                  <legend className="px-2 text-silver">{WEEKDAY_NAMES[d]}</legend>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div><label className="mb-1 block text-xs text-muted" htmlFor={`open_${d}`}>Opens</label><input id={`open_${d}`} name={`open_${d}`} type="time" defaultValue={trim(row?.open_time ?? null) || "08:00"} className="field" /></div>
                    <div><label className="mb-1 block text-xs text-muted" htmlFor={`close_${d}`}>Closes</label><input id={`close_${d}`} name={`close_${d}`} type="time" defaultValue={trim(row?.close_time ?? null) || "17:00"} className="field" /></div>
                    <div><label className="mb-1 block text-xs text-muted" htmlFor={`break_start_${d}`}>Break from</label><input id={`break_start_${d}`} name={`break_start_${d}`} type="time" defaultValue={trim(row?.break_start ?? null)} className="field" /></div>
                    <div><label className="mb-1 block text-xs text-muted" htmlFor={`break_end_${d}`}>Break to</label><input id={`break_end_${d}`} name={`break_end_${d}`} type="time" defaultValue={trim(row?.break_end ?? null)} className="field" /></div>
                  </div>
                  <div className="mt-3"><Check name={`closed_${d}`} label="Closed all day" defaultChecked={row?.is_closed ?? d === 0} /></div>
                </fieldset>
              );
            })}
            <button type="submit" className="adm-btn-primary">Save opening hours</button>
          </form>
        </Card>

        <Card>
          <h2 className="mb-4 text-2xl">Clinic details and rules</h2>
          <form action={saveClinicSettingsAction} className="space-y-4">
            <Input name="clinic_name" label="Clinic name" defaultValue={s?.clinic_name} required />
            <Input name="address" label="Address" defaultValue={s?.address} optional />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input name="phone" label="Phone" defaultValue={s?.phone} optional />
              <Input name="email" label="Email" type="email" defaultValue={s?.email} optional />
            </div>
            <Input name="timezone" label="Time zone" defaultValue={s?.timezone} required hint="For example Asia/Manila. All times on the site follow this." />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input name="slot_interval_minutes" label="Start times every (minutes)" type="number" defaultValue={s?.slot_interval_minutes} required />
              <Input name="min_notice_hours" label="Minimum notice (hours)" type="number" defaultValue={s?.min_notice_hours} required />
              <Input name="booking_horizon_days" label="Book up to (days ahead)" type="number" defaultValue={s?.booking_horizon_days} required />
              <Input name="max_active_appointments" label="Upcoming visits per patient" type="number" defaultValue={s?.max_active_appointments} required />
              <Input name="cancel_deadline_hours" label="Cancel until (hours before)" type="number" defaultValue={s?.cancel_deadline_hours} required />
              <Input name="reschedule_deadline_hours" label="Reschedule until (hours before)" type="number" defaultValue={s?.reschedule_deadline_hours} required />
              <Input name="reminder_hours_before" label="Reminder (hours before)" type="number" defaultValue={s?.reminder_hours_before} required hint="Used when email reminders are switched on." />
            </div>
            <Check name="require_approval" label="Every booking needs staff approval" defaultChecked={s?.require_approval} />
            <button type="submit" className="adm-btn-primary">Save settings</button>
          </form>
        </Card>
      </div>
    </>
  );
}
