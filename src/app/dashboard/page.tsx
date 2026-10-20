import Link from "next/link";
import { DateBlock, StatusBadge } from "@/components/AppointmentList";
import { getClinicData } from "@/lib/clinic";
import { APPT_SELECT, getSessionContext, type AppointmentRow } from "@/lib/dashboard";
import { fmtSlot, greetingTz } from "@/lib/format";
import { getPhotoUrl } from "@/lib/supabase-server";

export default async function DashboardHome() {
  const { sb, user, profile } = await getSessionContext();
  const { settings } = await getClinicData();

  const [patient, medical, next] = await Promise.all([
    sb.from("patient_profiles").select("user_id").eq("user_id", user.id).maybeSingle(),
    sb.from("medical_information").select("user_id").eq("user_id", user.id).maybeSingle(),
    sb.from("appointments").select(APPT_SELECT).eq("patient_id", user.id).in("status", ["pending", "confirmed"])
      .gte("ends_at", new Date().toISOString()).order("starts_at").limit(1),
  ]);

  const photo = await getPhotoUrl(sb, user.id);
  const hasPatient = Boolean(patient.data);
  const hasMedical = Boolean(medical.data);
  const done = Number(hasPatient) + Number(hasMedical);
  const ready = done === 2;
  const appt = ((next.data ?? []) as unknown as AppointmentRow[])[0];
  const firstName = (profile?.full_name ?? "").split(" ")[0];
  const hoursUntil = appt ? (new Date(appt.starts_at).getTime() - Date.now()) / 3_600_000 : 0;
  const canReschedule = appt && hoursUntil >= settings.reschedule_deadline_hours;

  return (
    <div className="space-y-8">
      <header className="flex items-center gap-4">
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" className="h-16 w-16 shrink-0 rounded-full border border-silver/30 object-cover" />
        )}
        <div className="min-w-0">
          <p className="text-muted">{greetingTz(settings.timezone)}</p>
          <h1 className="truncate text-5xl sm:text-6xl">{firstName || "Welcome"}</h1>
        </div>
      </header>

      {!ready && (
        <section aria-labelledby="setup" className="panel flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <h2 id="setup" className="text-2xl">Finish your profile to book</h2>
            <p className="mt-0.5 text-sm text-muted">{done} of 2 steps done: patient details and medical information.</p>
            <div className="mt-3 h-1.5 w-48 max-w-full overflow-hidden rounded-full bg-ink" role="progressbar" aria-valuemin={0} aria-valuemax={2} aria-valuenow={done}>
              <div className="h-full rounded-full bg-crimson-light" style={{ width: `${(done / 2) * 100}%` }} />
            </div>
          </div>
          <Link href={hasPatient ? "/dashboard/medical" : "/dashboard/profile"} className="btn-primary">Continue</Link>
        </section>
      )}

      <section aria-labelledby="next">
        <h2 id="next" className="sr-only">Next appointment</h2>
        {appt ? (
          <div className="relative overflow-hidden rounded-2xl border border-silver/20 bg-gradient-to-br from-slate via-slate to-[#2a1219] p-6 shadow-glow sm:p-8">
            <div className="flex flex-wrap items-start gap-6">
              <DateBlock iso={appt.starts_at} timezone={settings.timezone} large />
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex items-center gap-3"><span className="text-sm text-muted">Your next visit</span><StatusBadge status={appt.status} /></div>
                <h3 className="text-4xl leading-tight sm:text-5xl">{appt.dental_services?.name ?? "Appointment"}</h3>
                <p className="mt-2 text-lg text-silver">{fmtSlot(appt.starts_at, settings.timezone)} to {fmtSlot(appt.ends_at, settings.timezone)}</p>
                {appt.dentists?.display_name && <p className="text-muted">{appt.dentists.display_name}</p>}
              </div>
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href={`/dashboard/appointments/${appt.id}`} className="btn-primary">View ticket</Link>
              {canReschedule && <Link href={`/dashboard/appointments/${appt.id}/reschedule`} className="btn-ghost">Reschedule</Link>}
            </div>
          </div>
        ) : (
          <div className="panel px-6 py-12 text-center sm:py-16">
            <h3 className="text-4xl">No visits scheduled</h3>
            <p className="mx-auto mt-2 max-w-sm text-muted">Pick a time that suits you. It takes about a minute.</p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link href={ready ? "/book" : hasPatient ? "/dashboard/medical" : "/dashboard/profile"} className="btn-primary">{ready ? "Book a visit" : "Complete profile first"}</Link>
              <Link href="/#availability" className="btn-ghost">See open times</Link>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
