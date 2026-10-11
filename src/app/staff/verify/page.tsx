import { getSessionContext } from "@/lib/dashboard";
import { getClinicData } from "@/lib/clinic";
import { fmtDateTz, fmtSlot } from "@/lib/format";
import { StatusBadge } from "@/components/AppointmentList";

export const metadata = { title: "Verify Appointment", robots: { index: false } };

type Result = {
  out_reference: string; out_patient: string; out_service: string; out_dentist: string;
  out_starts_at: string; out_ends_at: string; out_status: "pending" | "confirmed" | "cancelled" | "completed" | "no_show"; out_valid: boolean;
};

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { sb, profile } = await getSessionContext();
  const sp = await searchParams;

  if (!profile || !["admin", "receptionist", "dentist"].includes(profile.role)) {
    return (
      <section className="mx-auto max-w-xl px-5 py-24 sm:px-8">
        <h1 className="text-5xl">Staff only</h1>
        <p className="mt-4 text-muted">Appointment verification is available to clinic staff. If you are a patient, show your QR ticket at reception.</p>
      </section>
    );
  }

  const code = (sp.code ?? "").trim().slice(0, 64);
  let row: Result | null = null;
  if (code) {
    const { data } = await sb.rpc("verify_appointment", { p_code: code });
    row = ((data ?? []) as Result[])[0] ?? null;
  }
  const { settings } = await getClinicData();

  return (
    <section className="mx-auto max-w-2xl space-y-8 px-5 py-16 sm:px-8">
      <h1 className="text-5xl">Verify appointment</h1>

      <form method="get" className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <label htmlFor="code" className="mb-1.5 block text-sm text-silver">Appointment reference or scanned code</label>
          <input id="code" name="code" defaultValue={code} className="field" placeholder="RD-261027-1A2B3C4D" autoComplete="off" />
        </div>
        <button type="submit" className="btn-primary">Check</button>
      </form>

      {code && !row && (
        <div role="alert" className="panel border-crimson/60 p-6">
          <p className="font-display text-3xl text-crimson-light">Not valid</p>
          <p className="mt-1 text-silver">No appointment matches this code.</p>
        </div>
      )}

      {row && (
        <div className={`panel p-6 ${row.out_valid ? "border-emerald/60" : "border-crimson/60"}`} role="status">
          <p className={`font-display text-4xl ${row.out_valid ? "text-emerald-light" : "text-crimson-light"}`}>{row.out_valid ? "Valid" : "Not valid"}</p>
          {!row.out_valid && (
            <p className="mt-1 text-silver">
              {row.out_status === "confirmed"
                ? "This code was replaced when the appointment changed. Ask for the current ticket, or look it up by reference."
                : row.out_status === "pending" ? "This appointment is still waiting for approval."
                : `This appointment is ${row.out_status.replace("_", " ")}.`}
            </p>
          )}
          <dl className="mt-5 divide-y divide-silver/15 border-y border-silver/15">
            {([
              ["Reference", row.out_reference],
              ["Patient", row.out_patient],
              ["Service", row.out_service],
              ["Dentist", row.out_dentist],
              ["Date", fmtDateTz(row.out_starts_at, settings.timezone)],
              ["Time", `${fmtSlot(row.out_starts_at, settings.timezone)} to ${fmtSlot(row.out_ends_at, settings.timezone)}`],
            ] as const).map(([k, v]) => (
              <div key={k} className="grid gap-1 py-2.5 sm:grid-cols-[8rem_1fr]"><dt className="text-muted">{k}</dt><dd>{v}</dd></div>
            ))}
          </dl>
          <div className="mt-4"><StatusBadge status={row.out_status} /></div>
        </div>
      )}
    </section>
  );
}
