import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import CancelPanel from "@/components/CancelPanel";
import PrintButton from "@/components/PrintButton";
import Ticket from "@/components/Ticket";
import { getClinicData } from "@/lib/clinic";
import { getSessionContext } from "@/lib/dashboard";
import { fmtDateTz, fmtSlot } from "@/lib/format";
import { buildTicketText } from "@/lib/qr";

export const metadata = { title: "Appointment" };

type Row = {
  id: string; reference: string; patient_id: string; starts_at: string; ends_at: string;
  status: "pending" | "confirmed" | "cancelled" | "completed" | "no_show";
  dental_services: { name: string } | null; dentists: { display_name: string } | null;
};

export default async function AppointmentPage({
  params, searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<{ new?: string; updated?: string; cancelled?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { sb, user } = await getSessionContext();
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { data } = await sb.from("appointments")
    .select("id, reference, patient_id, starts_at, ends_at, status, dental_services(name), dentists(display_name)")
    .eq("id", id).maybeSingle();
  const appt = data as unknown as Row | null;
  if (!appt || appt.patient_id !== user.id) notFound();

  const [{ settings }, patient, tokenRes] = await Promise.all([
    getClinicData(),
    sb.from("patient_profiles").select("legal_name").eq("user_id", user.id).maybeSingle(),
    sb.from("appointment_tokens").select("token").eq("appointment_id", id).eq("is_active", true).maybeSingle(),
  ]);

  // The QR shows the appointment details as plain text (no link). The last line is a random code staff
  // scanners check against the database, so old tickets stop validating after a change or cancellation.
  const token = appt.status === "confirmed" ? tokenRes.data?.token : null;
  const dateLabel = fmtDateTz(appt.starts_at, settings.timezone);
  const startLabel = fmtSlot(appt.starts_at, settings.timezone);
  const endLabel = fmtSlot(appt.ends_at, settings.timezone);
  let qrSvg: string | null = null;
  let qrPng: string | null = null;
  if (token) {
    const text = buildTicketText({
      reference: appt.reference, patient: patient.data?.legal_name ?? "", service: appt.dental_services?.name ?? "Appointment",
      date: dateLabel, start: startLabel, end: endLabel, dentist: appt.dentists?.display_name ?? null, code: token,
    });
    const colors = { dark: "#0B0B0F", light: "#FFFFFF" };
    [qrSvg, qrPng] = await Promise.all([
      QRCode.toString(text, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: colors }),
      QRCode.toDataURL(text, { width: 800, margin: 2, errorCorrectionLevel: "M", color: colors }),
    ]);
  }

  const active = appt.status === "pending" || appt.status === "confirmed";
  const hoursUntil = (new Date(appt.starts_at).getTime() - Date.now()) / 3_600_000;
  const canReschedule = active && hoursUntil >= settings.reschedule_deadline_hours;
  const canCancel = active && hoursUntil >= settings.cancel_deadline_hours;

  const banner =
    sp.new ? (appt.status === "pending" ? "Request received. The clinic will confirm it soon, and you will get a notification." : "Appointment confirmed. Your ticket is below.")
    : sp.updated ? "Appointment rescheduled. Your previous QR code no longer works; use the ticket below."
    : sp.cancelled ? "Appointment cancelled. The time has been released."
    : null;

  return (
    <div className="space-y-8">
      <div className="no-print">
        <Link href="/dashboard/appointments" className="text-sm text-silver hover:text-snow">Back to appointments</Link>
        <h1 className="mt-2 text-5xl">Your appointment</h1>
      </div>

      {banner && <p role="status" className="no-print rounded-md border border-emerald/60 bg-emerald/10 px-4 py-3">{banner}</p>}

      <Ticket
        patientName={patient.data?.legal_name ?? ""}
        reference={appt.reference}
        service={appt.dental_services?.name ?? "Appointment"}
        date={dateLabel}
        start={startLabel}
        end={endLabel}
        dentist={appt.dentists?.display_name ?? null}
        status={appt.status}
        qrSvg={qrSvg}
      />

      <div className="no-print space-y-4">
        <div className="flex flex-wrap items-start gap-3">
          {qrPng && <a href={qrPng} download={`ravendent-${appt.reference}.png`} className="btn-ghost">Download QR code</a>}
          {qrSvg && <PrintButton />}
          {canReschedule && <Link href={`/dashboard/appointments/${appt.id}/reschedule`} className="btn-primary">Reschedule</Link>}
          {canCancel && <CancelPanel appointmentId={appt.id} deadlineHours={settings.cancel_deadline_hours} />}
        </div>
        {active && (!canReschedule || !canCancel) && (
          <p className="max-w-xl text-sm text-muted">
            Online changes close {settings.reschedule_deadline_hours} hours before the appointment (cancellations {settings.cancel_deadline_hours} hours).
            To change it now, please contact the clinic{settings.phone ? ` at ${settings.phone}` : ""}.
          </p>
        )}
      </div>
    </div>
  );
}
