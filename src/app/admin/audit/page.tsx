import { Empty, PageHead } from "@/components/admin/UI";
import { requireStaff } from "@/lib/admin";
import { getClinicData } from "@/lib/clinic";
import { fmtDateTz, fmtSlot } from "@/lib/format";

export const metadata = { title: "Audit log" };

type L = { id: string; created_at: string; action: string; entity: string | null; details: Record<string, unknown> | null; profiles: { full_name: string; email: string } | null };

export default async function AuditPage() {
  const { sb } = await requireStaff(["admin"]);
  const { settings } = await getClinicData();
  const { data } = await sb.from("audit_logs").select("id, created_at, action, entity, details, profiles(full_name, email)").order("created_at", { ascending: false }).limit(100);
  const logs = (data ?? []) as unknown as L[];

  return (
    <>
      <PageHead title="Audit log" sub="Who changed what, newest first (latest 100). Medical details are never written here." />
      {logs.length === 0 ? <Empty>Nothing recorded yet.</Empty> : (
        <ul className="space-y-2">
          {logs.map((l) => (
            <li key={l.id} className="adm-card flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 p-4">
              <div className="min-w-0">
                <p><span className="text-snow">{l.action.replace(/_/g, " ")}</span> <span className="text-muted">{l.entity ? `(${l.entity})` : ""}</span></p>
                <p className="text-sm text-silver">{l.profiles?.full_name || l.profiles?.email || "System"}</p>
                {l.details && <p className="mt-1 break-words text-xs text-muted">{Object.entries(l.details).map(([k, v]) => `${k}: ${String(v)}`).join(", ")}</p>}
              </div>
              <time dateTime={l.created_at} className="shrink-0 text-sm text-muted">{fmtDateTz(l.created_at, settings.timezone)}, {fmtSlot(l.created_at, settings.timezone)}</time>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
