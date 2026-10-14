/**
 * The QR shows the appointment details as plain text when scanned with any camera (no link).
 * The final line carries a random verification code that staff scanners check against the database,
 * so a QR from before a reschedule or cancellation is reported as no longer valid.
 * No medical information, phone number, or email is ever included.
 */
export type TicketInfo = {
  reference: string;
  patient: string;
  service: string;
  date: string;
  start: string;
  end: string;
  dentist: string | null;
  code: string;
};

export function buildTicketText(t: TicketInfo): string {
  return [
    "RAVENDENT APPOINTMENT",
    `Ref: ${t.reference}`,
    `Patient: ${t.patient}`,
    `Service: ${t.service}`,
    `Date: ${t.date}`,
    `Time: ${t.start} - ${t.end}`,
    `Dentist: ${t.dentist ?? "To be assigned"}`,
    `Code: ${t.code}`,
  ].join("\n");
}

export type ParsedCode = { kind: "token"; value: string } | { kind: "reference"; value: string } | null;

const TOKEN = /\b([0-9a-f]{36})\b/i;
const REF = /\b(RD-\d{6}-[0-9A-F]{8})\b/i;

/** Accepts a scanned ticket, a bare code, a bare reference, or an older link that carried ?code= */
export function parseScanned(raw: string): ParsedCode {
  const text = raw.trim();
  if (!text) return null;
  const line = text.match(/^Code:\s*([0-9a-f]{36})\s*$/im);
  if (line) return { kind: "token", value: line[1].toLowerCase() };
  const link = text.match(/[?&]code=([0-9a-f]{36})/i);
  if (link) return { kind: "token", value: link[1].toLowerCase() };
  const tok = text.match(TOKEN);
  if (tok) return { kind: "token", value: tok[1].toLowerCase() };
  const ref = text.match(REF);
  if (ref) return { kind: "reference", value: ref[1].toUpperCase() };
  return null;
}
