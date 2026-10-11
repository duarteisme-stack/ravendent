import Link from "next/link";
import AppointmentList from "@/components/AppointmentList";
import { getClinicData } from "@/lib/clinic";
import { APPT_SELECT, getSessionContext, type AppointmentRow } from "@/lib/dashboard";

export const metadata = { title: "Appointment history" };

export default async function Page() {
  const { sb, user } = await getSessionContext();
  const { settings } = await getClinicData();
  const { data } = await sb.from("appointments").select(APPT_SELECT).eq("patient_id", user.id).or(`status.in.(cancelled,completed,no_show),ends_at.lt.${new Date().toISOString()}`).order("starts_at", { ascending: false });
  const items = (data ?? []) as unknown as AppointmentRow[];

  return (
    <div className="space-y-8">
      <h1 className="text-5xl">Appointment history</h1>
      {items.length === 0 ? (
        <div className="panel p-6">
          <p className="font-medium">Past, completed, and cancelled appointments will appear here.</p>
          <div className="mt-5"><Link href="/book" className="btn-primary">Book an Appointment</Link></div>
        </div>
      ) : (
        <AppointmentList items={items} timezone={settings.timezone} />
      )}
    </div>
  );
}
