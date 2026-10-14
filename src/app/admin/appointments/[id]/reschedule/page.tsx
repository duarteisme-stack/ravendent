import Link from "next/link";
import { notFound } from "next/navigation";
import BookingWizard from "@/components/BookingWizard";
import { PageHead } from "@/components/admin/UI";
import { requireStaff } from "@/lib/admin";
import { getClinicData } from "@/lib/clinic";

export const metadata = { title: "Reschedule" };

type Row = {
  id: string; starts_at: string; ends_at: string; service_id: string; status: string;
  profiles: { full_name: string } | null; dental_services: { name: string } | null; dentists: { display_name: string } | null;
};

export default async function AdminReschedule({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { sb } = await requireStaff(["admin", "receptionist"]);

  const { data } = await sb.from("appointments")
    .select("id, starts_at, ends_at, service_id, status, profiles(full_name), dental_services(name), dentists(display_name)").eq("id", id).maybeSingle();
  const a = data as unknown as Row | null;
  if (!a) notFound();

  const { settings, services, dentists } = await getClinicData();
  const open = a.status === "pending" || a.status === "confirmed";

  return (
    <>
      <Link href="/admin/appointments" className="text-sm text-silver hover:text-snow">Back to appointments</Link>
      <div className="mt-2"><PageHead title="Reschedule" sub={`For ${a.profiles?.full_name ?? "the patient"}. They are notified and get a new QR code; the old one stops working.`} /></div>
      {!open ? (
        <p className="adm-card p-6 text-silver">Only pending or confirmed appointments can be rescheduled.</p>
      ) : (
        <BookingWizard mode="reschedule" services={services} dentists={dentists} timezone={settings.timezone} horizonDays={settings.booking_horizon_days}
          requireApproval={settings.require_approval} patientName={a.profiles?.full_name ?? ""} returnTo="/admin/appointments"
          initial={{ serviceId: a.service_id, dentistId: "" }}
          current={{ id: a.id, startsAt: a.starts_at, endsAt: a.ends_at, serviceName: a.dental_services?.name ?? "Appointment", dentistName: a.dentists?.display_name ?? null }} />
      )}
    </>
  );
}
