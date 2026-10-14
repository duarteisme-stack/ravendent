import Link from "next/link";
import { Donut } from "@/components/admin/Charts";
import { Card, PageHead } from "@/components/admin/UI";
import { requireStaff } from "@/lib/admin";
import { getClinicData } from "@/lib/clinic";
import { addDays, todayInTz } from "@/lib/format";

export const metadata = { title: "Reports" };

type Report = { total: number; by_status: { name: string; count: number }[]; by_service: { name: string; count: number }[]; by_dentist: { name: string; count: number }[] };
const YMD = /^\d{4}-\d{2}-\d{2}$/;
const LABEL: Record<string, string> = { no_show: "Missed" };

function Table({ title, rows }: { title: string; rows: { name: string; count: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <Card>
      <h2 className="mb-3 text-2xl">{title}</h2>
      {rows.length === 0 ? <p className="text-sm text-muted">No data for this period.</p> : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.name}>
              <div className="flex justify-between text-sm"><span className="capitalize text-silver">{LABEL[r.name] ?? r.name}</span><span>{r.count}</span></div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-night"><div className="h-full rounded-full" style={{ width: `${(r.count / max) * 100}%`, background: "linear-gradient(90deg,#8b5cf6,#22d3ee)" }} /></div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const sp = await searchParams;
  const { sb } = await requireStaff();
  const { settings } = await getClinicData();
  const today = todayInTz(settings.timezone);
  const to = sp.to && YMD.test(sp.to) ? sp.to : today;
  const from = sp.from && YMD.test(sp.from) ? sp.from : addDays(to, -29);

  const { data, error } = await sb.rpc("admin_report", { p_from: from, p_to: to });
  const r = data as Report | null;
  const presets: [string, number][] = [["Last 7 days", 6], ["Last 30 days", 29], ["Last 90 days", 89]];

  return (
    <>
      <PageHead title="Reports" sub="Appointments by status, service, and doctor for any date range." />
      <Card className="mb-5">
        <div className="flex flex-wrap items-end gap-3">
          {presets.map(([label, n]) => <Link key={label} href={`/admin/reports?from=${addDays(today, -n)}&to=${today}`} className="adm-btn-ghost">{label}</Link>)}
          <form action="/admin/reports" className="ml-auto flex flex-wrap items-end gap-2">
            <div><label htmlFor="from" className="mb-1 block text-xs text-muted">From</label><input id="from" name="from" type="date" defaultValue={from} className="field" /></div>
            <div><label htmlFor="to" className="mb-1 block text-xs text-muted">To</label><input id="to" name="to" type="date" defaultValue={to} className="field" /></div>
            <button type="submit" className="adm-btn-primary">Show</button>
          </form>
        </div>
      </Card>

      {error || !r ? <Card><p>The report could not be loaded. Check that 003_admin.sql has been run.</p></Card> : (
        <div className="grid gap-5 lg:grid-cols-3">
          <Card className="grad-magenta !border-0 text-white lg:row-span-1">
            <p className="text-sm text-white/85">Appointments, {from} to {to}</p>
            <p className="mt-2 font-display text-7xl leading-none">{r.total}</p>
          </Card>
          <Card className="lg:col-span-2"><h2 className="mb-3 text-2xl">By status</h2><Donut items={r.by_status.map((s) => ({ name: LABEL[s.name] ?? s.name, count: s.count }))} centerLabel="Total" /></Card>
          <Table title="By service" rows={r.by_service} />
          <Table title="By doctor" rows={r.by_dentist} />
        </div>
      )}
    </>
  );
}
