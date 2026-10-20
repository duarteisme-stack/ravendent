/**
 * Reads a plain .txt file of "Label: value" lines and maps it to form fields.
 * Runs entirely in the browser; the file is never uploaded. Nothing is saved until the person reviews and submits the form.
 */
export type FieldKey =
  | "full_name" | "email" | "phone" | "date_of_birth" | "address"
  | "emergency_contact_name" | "emergency_contact_phone" | "reason_for_consultation"
  | "allergies" | "conditions" | "medications" | "previous_dental_concerns";

const ALIASES: Record<FieldKey, string[]> = {
  full_name: ["full name", "name", "legal name", "full legal name", "patient name"],
  email: ["email", "email address", "e mail"],
  phone: ["phone", "mobile", "mobile number", "mobile phone", "mobile phone number", "contact number", "phone number", "contact"],
  date_of_birth: ["date of birth", "dob", "birthday", "birth date", "birthdate", "born"],
  address: ["address", "home address"],
  emergency_contact_name: ["emergency contact name", "emergency contact", "emergency name", "emergency contact person"],
  emergency_contact_phone: ["emergency contact phone", "emergency contact number", "emergency phone", "emergency number", "emergency contact mobile"],
  reason_for_consultation: ["reason for visit", "reason for consultation", "reason", "chief complaint", "reason for your visit"],
  allergies: ["allergies", "allergy"],
  conditions: ["medical conditions", "conditions", "medical history", "medical conditions and history", "health conditions"],
  medications: ["medications", "current medications", "medication", "medicines"],
  previous_dental_concerns: ["previous dental concerns", "dental history", "dental concerns", "previous concerns"],
};

const MAX: Record<FieldKey, number> = {
  full_name: 120, email: 254, phone: 40, date_of_birth: 40, address: 300,
  emergency_contact_name: 120, emergency_contact_phone: 40, reason_for_consultation: 1000,
  allergies: 2000, conditions: 2000, medications: 2000, previous_dental_concerns: 2000,
};

const MULTILINE: FieldKey[] = ["address", "reason_for_consultation", "allergies", "conditions", "medications", "previous_dental_concerns"];

export const LABELS: Record<FieldKey, string> = {
  full_name: "Full name", email: "Email", phone: "Mobile phone", date_of_birth: "Date of birth", address: "Address",
  emergency_contact_name: "Emergency contact name", emergency_contact_phone: "Emergency contact phone",
  reason_for_consultation: "Reason for visit", allergies: "Allergies", conditions: "Medical conditions",
  medications: "Current medications", previous_dental_concerns: "Previous dental concerns",
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z]+/g, " ").trim();
const LOOKUP = new Map<string, FieldKey>();
for (const [k, list] of Object.entries(ALIASES) as [FieldKey, string[]][]) for (const a of list) LOOKUP.set(norm(a), k);

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const pad = (n: number) => String(n).padStart(2, "0");

function real(y: number, m: number, d: number): string {
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d ? `${y}-${pad(m)}-${pad(d)}` : "";
}

/** Returns YYYY-MM-DD, or "" when it cannot be read as a real date. Slash dates are read month first unless the day is above 12. */
export function normalizeDob(raw: string): string {
  const s = raw.trim();
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (m) return real(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (m) {
    const a = +m[1], b = +m[2], y = +m[3];
    return a > 12 ? real(y, b, a) : real(y, a, b);
  }
  m = s.match(/^([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})$/);
  if (m) { const i = MONTHS.indexOf(m[1].slice(0, 3).toLowerCase()); return i < 0 ? "" : real(+m[3], i + 1, +m[2]); }
  m = s.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\.?,?\s+(\d{4})$/);
  if (m) { const i = MONTHS.indexOf(m[2].slice(0, 3).toLowerCase()); return i < 0 ? "" : real(+m[3], i + 1, +m[1]); }
  return "";
}

export type ParseResult = { fields: Partial<Record<FieldKey, string>>; unreadable: FieldKey[]; ignoredLabels: string[] };

export function parseProfileText(text: string): ParseResult {
  const fields: Partial<Record<FieldKey, string>> = {};
  const ignoredLabels: string[] = [];
  const unreadable: FieldKey[] = [];
  let current: FieldKey | null = null;

  for (const rawLine of text.replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const kv = line.match(/^([A-Za-z][A-Za-z /_'()-]{0,48}?)\s*[:=]\s*(.*)$/);
    if (kv) {
      const key = LOOKUP.get(norm(kv[1]));
      if (key) { current = key; fields[key] = kv[2].trim(); }
      else { current = null; ignoredLabels.push(kv[1].trim()); }
      continue;
    }
    // A line without a label continues the previous multi-line answer (for example a second address line).
    if (current && MULTILINE.includes(current)) fields[current] = `${fields[current] ?? ""}\n${line}`.trim();
  }

  for (const k of Object.keys(fields) as FieldKey[]) {
    let v = (fields[k] ?? "").trim();
    if (k === "date_of_birth") {
      v = normalizeDob(v);
      if (!v) unreadable.push(k);
    }
    if (k === "email") v = v.toLowerCase();
    v = v.slice(0, MAX[k]);
    if (v) fields[k] = v; else delete fields[k];
  }
  return { fields, unreadable, ignoredLabels };
}

/** A blank template for people to fill in and upload. */
export function buildTemplate(keys: FieldKey[]): string {
  return [
    "# RavenDent details. Fill in after each colon, save as a .txt file, then choose it on the website.",
    "# Dates can be written like 1990-05-17 or May 17, 1990. Leave a line empty to skip it.",
    "",
    ...keys.map((k) => `${LABELS[k]}: `),
    "",
  ].join("\n");
}
