import Link from "next/link";
import { notFound } from "next/navigation";
import BookingWizard from "@/components/BookingWizard";
import { getClinicData } from "@/lib/clinic";
import { getSessionContext } from "@/lib/dashboard";

export const metadata = { title: "Reschedule Appointment" };

type Row = {
  id: string; patient_id: string; starts_at: string; ends_at: string; service_id: string;
  status: "pending" | "confirmed" | "cancelled" | "completed" | "no_show";
  dental_services: { name: string } | null; dentists: { display_name: string } | null;
};

export default async function ReschedulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { sb, user } = await getSessionContext();

  const { data } = await sb.from("appointments")
    .select("id, patient_id, starts_at, ends_at, service_id, status, dental_services(name), dentists(display_name)")
    .eq("id", id).maybeSingle();
  const appt = data as unknown as Row | null;
  if (!appt || appt.patient_id !== user.id) notFound();

  const { settings, services, dentists } = await getClinicData();
  const hoursUntil = (new Date(appt.starts_at).getTime() - Date.now()) / 3_600_000;
  const allowed = (appt.status === "pending" || appt.status === "confirmed") && hoursUntil >= settings.reschedule_deadline_hours;

  const patient = await sb.from("patient_profiles").select("legal_name").eq("user_id", user.id).maybeSingle();

  return (
    <div className="space-y-8">
      <div>
        <Link href={`/dashboard/appointments/${id}`} className="text-sm text-silver hover:text-snow">Back to appointment</Link>
        <h1 className="mt-2 text-5xl">Reschedule</h1>
      </div>
      {!allowed ? (
        <div className="panel max-w-xl p-6">
          <p className="font-medium">This appointment can no longer be rescheduled online.</p>
          <p className="mt-1 text-sm text-muted">
            Changes close {settings.reschedule_deadline_hours} hours before the start time. Please contact the clinic{settings.phone ? ` at ${settings.phone}` : ""}.
          </p>
        </div>
      ) : (
        <BookingWizard
          mode="reschedule"
          services={services}
          dentists={dentists}
          timezone={settings.timezone}
          horizonDays={settings.booking_horizon_days}
          requireApproval={settings.require_approval}
          patientName={patient.data?.legal_name ?? ""}
          initial={{ serviceId: appt.service_id, dentistId: "" }}
          current={{ id: appt.id, startsAt: appt.starts_at, endsAt: appt.ends_at, serviceName: appt.dental_services?.name ?? "Appointment", dentistName: appt.dentists?.display_name ?? null }}
        />
      )}
    </div>
  );
}
