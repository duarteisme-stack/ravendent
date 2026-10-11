import Link from "next/link";
import AppointmentList from "@/components/AppointmentList";
import { getClinicData } from "@/lib/clinic";
import { APPT_SELECT, getSessionContext, type AppointmentRow } from "@/lib/dashboard";

export default async function DashboardOverview() {
  const { sb, user, profile } = await getSessionContext();
  const { settings } = await getClinicData();

  const [patient, medical, next] = await Promise.all([
    sb.from("patient_profiles").select("user_id").eq("user_id", user.id).maybeSingle(),
    sb.from("medical_information").select("user_id").eq("user_id", user.id).maybeSingle(),
    sb.from("appointments").select(APPT_SELECT).eq("patient_id", user.id).in("status", ["pending", "confirmed"])
      .gte("ends_at", new Date().toISOString()).order("starts_at").limit(1),
  ]);

  const hasPatient = Boolean(patient.data);
  const hasMedical = Boolean(medical.data);
  const ready = hasPatient && hasMedical;
  const appt = (next.data ?? []) as unknown as AppointmentRow[];
  const firstName = (profile?.full_name ?? "").split(" ")[0];

  return (
    <div className="space-y-12">
      <header>
        <h1 className="text-5xl">{firstName ? `Welcome, ${firstName}` : "Welcome"}</h1>
        <p className="mt-2 text-muted">Your appointments and patient information in one place.</p>
      </header>

      {!ready && (
        <section aria-labelledby="setup" className="panel p-6 sm:p-8">
          <h2 id="setup" className="text-3xl">Finish your patient profile</h2>
          <p className="mt-2 max-w-prose text-silver">You need both sections below before you can book your first appointment.</p>
          <ul className="mt-5 space-y-3">
            <li className="flex items-center justify-between gap-4">
              <span>{hasPatient ? "Patient profile complete" : "Patient profile needed"}</span>
              {hasPatient ? <span className="text-sm text-emerald-light">Done</span> : <Link href="/dashboard/profile" className="btn-primary !py-2 !px-4 !text-sm">Complete profile</Link>}
            </li>
            <li className="flex items-center justify-between gap-4">
              <span>{hasMedical ? "Medical information complete" : "Medical information needed"}</span>
              {hasMedical ? <span className="text-sm text-emerald-light">Done</span> : <Link href="/dashboard/medical" className="btn-primary !py-2 !px-4 !text-sm">Add medical information</Link>}
            </li>
          </ul>
        </section>
      )}

      <section aria-labelledby="next">
        <h2 id="next" className="text-3xl">Next appointment</h2>
        <div className="mt-4">
          {appt.length > 0 ? (
            <AppointmentList items={appt} timezone={settings.timezone} />
          ) : (
            <div className="panel p-6">
              <p className="font-medium">You have no upcoming appointments.</p>
              <p className="mt-1 text-sm text-muted">Pick a time on the public calendar, or start from the booking page.</p>
              <div className="mt-5 flex flex-wrap gap-3">
                {ready ? (
                  <Link href="/book" className="btn-primary">Book an Appointment</Link>
                ) : (
                  <Link href={hasPatient ? "/dashboard/medical" : "/dashboard/profile"} className="btn-primary">Complete your profile to book</Link>
                )}
                <Link href="/#availability" className="btn-ghost">View Available Dates</Link>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
