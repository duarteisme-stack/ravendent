import Link from "next/link";
import { BarChart, Donut, HUES, LineChart, dayLabel } from "@/components/admin/Charts";
import { Card, PageHead } from "@/components/admin/UI";
import { requireStaff } from "@/lib/admin";

type Stats = {
  today_count: number; pending_count: number; patients_count: number; cancelled_30d: number;
  daily: { day: string; booked: number; completed: number }[];
  upcoming: { day: string; count: number }[];
  by_weekday: { dow: number; count: number }[];
  by_service: { name: string; count: number }[];
  patients_split: { new: number; returning: number };
};

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function AdminOverview() {
  const { sb, role, profile } = await requireStaff();
  const { data, error } = await sb.rpc("admin_dashboard_stats");
  const s = data as Stats | null;

  if (error || !s) {
    console.error("admin_dashboard_stats", error?.message);
    return (
      <>
        <PageHead title="Overview" />
        <Card><p className="font-medium">The dashboard numbers could not be loaded.</p>
          <p className="mt-1 text-sm text-muted">Check that the 003_admin.sql migration has been run in Supabase, then refresh.</p></Card>
      </>
    );
  }

  const first = (profile?.full_name ?? "").split(" ")[0];

  return (
    <>
      <PageHead title={first ? `Welcome back, ${first}` : "Overview"} sub={role === "dentist" ? "Showing your own appointments." : "Today at the clinic and how the last month has gone."} />

      <div className="grid gap-4 lg:grid-cols-12">
        {/* KPI row */}
        <div className="grad-magenta rounded-2xl p-6 text-white shadow-xl lg:col-span-3">
          <p className="text-sm text-white/85">Appointments today</p>
          <p className="mt-2 font-display text-7xl leading-none">{s.today_count}</p>
          <Link href="/admin/appointments?view=today" className="mt-4 inline-block text-sm underline underline-offset-4">View today&apos;s schedule</Link>
        </div>
        <div className="grad-cyan rounded-2xl p-6 text-white shadow-xl lg:col-span-3">
          <p className="text-sm text-white/85">Awaiting approval</p>
          <p className="mt-2 font-display text-7xl leading-none">{s.pending_count}</p>
          <Link href="/admin/appointments?view=upcoming&status=pending" className="mt-4 inline-block text-sm underline underline-offset-4">Review requests</Link>
        </div>
        <div className="grid gap-4 lg:col-span-2">
          <div className="adm-card flex items-center gap-4 p-5">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#d946ef]/20 text-[#e879f9]" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20a8 8 0 0 1 16 0" /></svg>
            </span>
            <div><p className="text-sm text-silver">Patients</p><p className="font-display text-3xl leading-none">{s.patients_count}</p></div>
          </div>
          <div className="adm-card flex items-center gap-4 p-5">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#22d3ee]/20 text-[#22d3ee]" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </span>
            <div><p className="text-sm text-silver">Cancelled, 30 days</p><p className="font-display text-3xl leading-none">{s.cancelled_30d}</p></div>
          </div>
        </div>
        <Card className="lg:col-span-4">
          <h2 className="text-2xl">Next 14 days</h2>
          <p className="mb-2 text-sm text-muted">Booked and pending appointments per day</p>
          <LineChart id="up" fill height={170} labels={s.upcoming.map((d) => dayLabel(d.day))} series={[{ name: "Appointments", color: HUES.cyan, values: s.upcoming.map((d) => d.count) }]} />
        </Card>

        {/* Trend + weekday */}
        <Card className="lg:col-span-8">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl">Appointments, last 30 days</h2>
            <ul className="flex gap-4 text-sm text-silver">
              <li className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: HUES.magenta }} />Scheduled</li>
              <li className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: HUES.cyan }} />Completed</li>
            </ul>
          </div>
          <LineChart id="tr" labels={s.daily.map((d) => dayLabel(d.day))} series={[
            { name: "Scheduled", color: HUES.magenta, values: s.daily.map((d) => d.booked) },
            { name: "Completed", color: HUES.cyan, values: s.daily.map((d) => d.completed) },
          ]} />
        </Card>
        <Card className="lg:col-span-4">
          <h2 className="text-2xl">Busiest weekdays</h2>
          <p className="mb-2 text-sm text-muted">Appointments per weekday, around now</p>
          <BarChart id="wd" items={s.by_weekday.map((d) => ({ label: DOW[d.dow], value: d.count }))} />
        </Card>

        {/* Mix */}
        <Card className="lg:col-span-6">
          <h2 className="mb-4 text-2xl">By service</h2>
          <Donut items={s.by_service} centerLabel="Appointments" />
        </Card>
        <Card className="lg:col-span-6">
          <h2 className="mb-4 text-2xl">New and returning patients</h2>
          <Donut centerLabel="Patients, 30 days" colors={[HUES.magenta, HUES.cyan]}
            items={[{ name: "New patients", count: s.patients_split.new }, { name: "Returning patients", count: s.patients_split.returning }]} />
        </Card>
      </div>
    </>
  );
}
