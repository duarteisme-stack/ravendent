/** Pure, framework-free validation so it can be unit tested. Server actions are the authority; the browser only mirrors it. */

export type Errors = Record<string, string>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const str = (fd: FormData, key: string): string => String(fd.get(key) ?? "").trim();

export function validateEmail(email: string): string | null {
  if (!email) return "Enter your email address.";
  if (email.length > 254 || !EMAIL_RE.test(email)) return "Enter a valid email address.";
  return null;
}

export function validatePhone(phone: string, required = true): string | null {
  if (!phone) return required ? "Enter a mobile phone number." : null;
  if (!/^\+?[0-9\s\-()]{7,24}$/.test(phone)) return "Use digits only, with an optional leading + (for example 0917 123 4567).";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return "Phone numbers have 7 to 15 digits.";
  return null;
}

export function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-()]/g, "");
}

export function validatePassword(pw: string): string | null {
  if (pw.length < 10) return "Use at least 10 characters.";
  if (pw.length > 72) return "Use 72 characters or fewer.";
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) return "Include at least one letter and one number.";
  return null;
}

export function validateName(name: string, label = "full name"): string | null {
  if (name.length < 2) return `Enter your ${label}.`;
  if (name.length > 120) return `Your ${label} is too long.`;
  return null;
}

export function validateDob(dob: string, now = new Date()): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return "Enter your date of birth.";
  const d = new Date(`${dob}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== dob) return "Enter a real date.";
  if (d > now) return "Date of birth cannot be in the future.";
  if (d.getUTCFullYear() < 1900) return "Enter a real date of birth.";
  return null;
}

/** Only allow same-site relative redirects. */
export function safeNext(next: string | null | undefined, fallback = "/dashboard"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\") || /[\r\n]/.test(next)) return fallback;
  return next;
}

export function validateRegister(fd: FormData) {
  const values = {
    full_name: str(fd, "full_name"),
    email: str(fd, "email").toLowerCase(),
    phone: str(fd, "phone"),
  };
  const password = String(fd.get("password") ?? "");
  const confirm = String(fd.get("confirm_password") ?? "");
  const errors: Errors = {};

  const n = validateName(values.full_name);
  if (n) errors.full_name = n;
  const e = validateEmail(values.email);
  if (e) errors.email = e;
  const p = validatePhone(values.phone);
  if (p) errors.phone = p;
  const pw = validatePassword(password);
  if (pw) errors.password = pw;
  else if (password !== confirm) errors.confirm_password = "Passwords do not match.";
  if (fd.get("accept_terms") !== "on") errors.accept_terms = "You must accept the privacy notice and terms of service to create an account.";

  return { values: { ...values, phone: normalizePhone(values.phone) }, password, errors };
}

export function validatePatientProfile(fd: FormData, now = new Date()) {
  const values = {
    legal_name: str(fd, "legal_name"),
    date_of_birth: str(fd, "date_of_birth"),
    phone: str(fd, "phone"),
    address: str(fd, "address"),
    emergency_contact_name: str(fd, "emergency_contact_name"),
    emergency_contact_phone: str(fd, "emergency_contact_phone"),
    reason_for_consultation: str(fd, "reason_for_consultation"),
  };
  const errors: Errors = {};

  const a = validateName(values.legal_name, "full legal name");
  if (a) errors.legal_name = a;
  const b = validateDob(values.date_of_birth, now);
  if (b) errors.date_of_birth = b;
  const c = validatePhone(values.phone);
  if (c) errors.phone = c;
  const d = validateName(values.emergency_contact_name, "emergency contact's name");
  if (d) errors.emergency_contact_name = d;
  const e = validatePhone(values.emergency_contact_phone);
  if (e) errors.emergency_contact_phone = e;
  if (values.address.length > 300) errors.address = "Keep the address under 300 characters.";
  if (values.reason_for_consultation.length > 1000) errors.reason_for_consultation = "Keep this under 1000 characters.";
  if (fd.get("privacy_consent") !== "on") errors.privacy_consent = "We need your consent to store this information.";

  return { values, errors };
}

export function validateMedical(fd: FormData) {
  const values = {
    allergies: str(fd, "allergies"),
    conditions: str(fd, "conditions"),
    medications: str(fd, "medications"),
    previous_dental_concerns: str(fd, "previous_dental_concerns"),
  };
  const errors: Errors = {};
  for (const [k, v] of Object.entries(values)) if (v.length > 2000) errors[k] = "Keep this under 2000 characters.";
  if (fd.get("health_consent") !== "on") errors.health_consent = "We need your explicit consent to store health information.";
  return { values, errors };
}
