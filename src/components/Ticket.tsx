import Logo from "./Logo";
import { StatusBadge } from "./AppointmentList";
import type { AppointmentRow } from "@/lib/dashboard";

type Props = {
  patientName: string;
  reference: string;
  service: string;
  date: string;
  start: string;
  end: string;
  dentist: string | null;
  status: AppointmentRow["status"];
  qrSvg: string | null;
};

export default function Ticket({ patientName, reference, service, date, start, end, dentist, status, qrSvg }: Props) {
  const rows: [string, string][] = [
    ["Patient", patientName],
    ["Service", service],
    ["Date", date],
    ["Start time", start],
    ["Estimated end", end],
    ["Dentist", dentist ?? "To be assigned"],
  ];
  return (
    <article className="ticket panel overflow-hidden" aria-label="Appointment ticket">
      <div className="h-1 bg-crimson" />
      <div className="grid gap-8 p-6 sm:p-8 md:grid-cols-[1fr_auto]">
        <div>
          <div className="flex items-center gap-2.5"><Logo className="h-8 w-8" /><span className="font-display text-2xl">RavenDent</span></div>
          <p className="mt-6 text-sm text-muted">Appointment reference</p>
          <p className="font-display text-4xl tracking-wide">{reference}</p>
          <div className="mt-3"><StatusBadge status={status} /></div>
          <dl className="mt-6 divide-y divide-silver/15 border-y border-silver/15">
            {rows.map(([k, v]) => (
              <div key={k} className="grid gap-1 py-2.5 sm:grid-cols-[8.5rem_1fr]">
                <dt className="text-sm text-muted">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="flex flex-col items-center justify-center gap-3 md:w-56">
          {qrSvg ? (
            <>
              <div className="w-48 rounded-md bg-white p-2" role="img" aria-label={`QR code for appointment ${reference}`} dangerouslySetInnerHTML={{ __html: qrSvg }} />
              <p className="text-center text-xs text-muted">Show this at reception. It holds only a random reference, no personal or medical details.</p>
            </>
          ) : (
            <p className="rounded-md border border-silver/15 bg-charcoal p-4 text-center text-sm text-muted">
              {status === "pending" ? "Your QR code appears here once the clinic confirms this appointment." : "This ticket is no longer valid."}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
