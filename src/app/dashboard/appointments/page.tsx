import Link from "next/link";
import AppointmentList from "@/components/AppointmentList";
import { Segmented } from "@/components/MeTabs";
import { getClinicData } from "@/lib/clinic";
import { APPT_SELECT, getSessionContext, type AppointmentRow } from "@/lib/dashboard";

export const metadata = { title: "My Visits" };

export default async function VisitsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const sp = await searchParams;
  const past = sp.tab === "past";
  const { sb, user } = await getSessionContext();
  const { settings } = await getClinicData();
  const now = new Date().toISOString();

  const q = sb.from("appointments").select(APPT_SELECT).eq("patient_id", user.id);
  const { data } = past
    ? await q.or(`status.in.(cancelled,completed,no_show),ends_at.lt.${now}`).order("starts_at", { ascending: false }).limit(60)
    : await q.in("status", ["pending", "confirmed"]).gte("ends_at", now).order("starts_at");
  const items = (data ?? []) as unknown as AppointmentRow[];

  return (
    <div className="space-y-7">
      <h1 className="text-5xl sm:text-6xl">Visits</h1>
      <Segmented current={past ? "/dashboard/appointments?tab=past" : "/dashboard/appointments"}
        items={[{ href: "/dashboard/appointments", label: "Upcoming" }, { href: "/dashboard/appointments?tab=past", label: "Past" }]} />
      {items.length === 0 ? (
        <div className="panel px-6 py-12 text-center">
          <p className="font-display text-3xl">{past ? "Nothing here yet" : "No upcoming visits"}</p>
          <p className="mx-auto mt-1 max-w-xs text-sm text-muted">{past ? "Completed and cancelled visits will appear here." : "Book a time and it will show up here with your ticket."}</p>
          {!past && <div className="mt-6"><Link href="/book" className="btn-primary">Book a visit</Link></div>}
        </div>
      ) : (
        <AppointmentList items={items} timezone={settings.timezone} />
      )}
    </div>
  );
}
