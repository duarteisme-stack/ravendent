"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit, requireStaff } from "@/lib/admin";
import { localToUtcISO } from "@/lib/format";
import { parseScanned } from "@/lib/qr";
import { createSupabaseServer } from "@/lib/supabase-server";
import { safeNext, str } from "@/lib/validation";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const YMD = /^\d{4}-\d{2}-\d{2}$/;

const done = (path: string, msg: string): never => redirect(`${path}?ok=${encodeURIComponent(msg)}`);
const fail = (path: string, msg: string): never => redirect(`${path}?err=${encodeURIComponent(msg)}`);

function numOrNull(fd: FormData, key: string): number | null {
  const v = str(fd, key);
  if (v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

/** Postgres error codes -> plain language. */
function dbMessage(error: { code?: string; message?: string }, what: string): string {
  if (error.code === "23505") return `${what} already exists.`;
  if (error.code === "23503") return `${what} is used by existing appointments or records. Deactivate it instead of deleting.`;
  if (error.code === "42501") return "You do not have permission to do that.";
  console.error("admin db error", error.code, error.message);
  return "Something went wrong. Please try again.";
}

/* ------------------------------ Services ------------------------------ */

export async function saveServiceAction(fd: FormData) {
  const { sb, user } = await requireStaff(["admin"]);
  const back = "/admin/services";
  const id = str(fd, "id");
  const price_min = numOrNull(fd, "price_min");
  const price_max = numOrNull(fd, "price_max");
  const duration = Number(str(fd, "duration_minutes"));
  const row = {
    name: str(fd, "name"),
    description: str(fd, "description") || null,
    price_min, price_max,
    duration_minutes: duration,
    prep_instructions: str(fd, "prep_instructions") || null,
    requires_approval: fd.get("requires_approval") === "on",
    is_active: fd.get("is_active") === "on",
    sort_order: Number(str(fd, "sort_order") || 0),
  };
  if (row.name.length < 2 || row.name.length > 120) fail(back, "Enter a service name (2 to 120 characters).");
  if (!Number.isInteger(duration) || duration < 5 || duration > 480) fail(back, "Duration must be a whole number of minutes between 5 and 480.");
  if ([price_min, price_max].some((n) => n !== null && (Number.isNaN(n) || n < 0))) fail(back, "Prices must be numbers of 0 or more.");
  if (price_min !== null && price_max !== null && price_min > price_max) fail(back, "The lowest price cannot be above the highest price.");
  if (!Number.isInteger(row.sort_order)) fail(back, "Order must be a whole number.");

  const { error } = id ? await sb.from("dental_services").update(row).eq("id", id) : await sb.from("dental_services").insert(row);
  if (error) fail(back, dbMessage(error, "A service with that name"));
  await audit(sb, user.id, id ? "service_updated" : "service_created", "dental_services", id || null, { name: row.name, duration });
  revalidatePath("/"); revalidatePath("/book"); revalidatePath(back);
  done(back, id ? "Service updated." : "Service added.");
}

export async function deleteServiceAction(fd: FormData) {
  const { sb, user } = await requireStaff(["admin"]);
  const id = str(fd, "id");
  if (!UUID.test(id)) fail("/admin/services", "Service not found.");
  const { data, error } = await sb.from("dental_services").delete().eq("id", id).select("name");
  if (error) fail("/admin/services", dbMessage(error, "This service"));
  if (!data?.length) fail("/admin/services", "Service not found.");
  await audit(sb, user.id, "service_deleted", "dental_services", id, { name: data![0].name });
  revalidatePath("/"); revalidatePath("/admin/services");
  done("/admin/services", "Service deleted.");
}

/* ------------------------------ Doctors ------------------------------ */

export async function saveDentistAction(fd: FormData) {
  const { sb, user } = await requireStaff(["admin"]);
  const back = "/admin/doctors";
  const id = str(fd, "id");
  const photo = str(fd, "photo_url");
  const loginEmail = str(fd, "login_email").toLowerCase();
  const row: Record<string, unknown> = {
    display_name: str(fd, "display_name"),
    qualifications: str(fd, "qualifications") || null,
    bio: str(fd, "bio") || null,
    photo_url: photo || null,
    is_active: fd.get("is_active") === "on",
  };
  if ((row.display_name as string).length < 2) fail(back, "Enter the doctor's name.");
  if (photo && !/^https:\/\/[^\s]+$/i.test(photo)) fail(back, "The photo link must start with https://");

  if (loginEmail) {
    const { data: acct } = await sb.from("profiles").select("id, role").eq("email", loginEmail).maybeSingle();
    if (!acct) fail(back, "No account uses that email yet. Ask the doctor to register first, then link it here.");
    row.profile_id = acct!.id;
    if (acct!.role === "customer") await sb.from("profiles").update({ role: "dentist" }).eq("id", acct!.id);
  }

  const { data, error } = id
    ? await sb.from("dentists").update(row).eq("id", id).select("id")
    : await sb.from("dentists").insert(row).select("id");
  if (error) fail(back, error.code === "23505" ? "That login account is already linked to another doctor." : dbMessage(error, "This doctor"));
  await audit(sb, user.id, id ? "doctor_updated" : "doctor_created", "dentists", data?.[0]?.id ?? id, { name: row.display_name });
  revalidatePath("/"); revalidatePath(back);
  if (!id && data?.[0]?.id) redirect(`/admin/doctors/${data[0].id}?ok=${encodeURIComponent("Doctor added. Now set their weekly working times.")}`);
  done(back, "Doctor updated.");
}

export async function deleteDentistAction(fd: FormData) {
  const { sb, user } = await requireStaff(["admin"]);
  const id = str(fd, "id");
  if (!UUID.test(id)) fail("/admin/doctors", "Doctor not found.");
  const { data, error } = await sb.from("dentists").delete().eq("id", id).select("display_name");
  if (error) fail("/admin/doctors", dbMessage(error, "This doctor"));
  if (!data?.length) fail("/admin/doctors", "Doctor not found.");
  await audit(sb, user.id, "doctor_deleted", "dentists", id, { name: data![0].display_name });
  revalidatePath("/"); revalidatePath("/admin/doctors");
  done("/admin/doctors", "Doctor deleted.");
}

export async function addAvailabilityAction(fd: FormData) {
  const { sb, user } = await requireStaff(["admin"]);
  const dentistId = str(fd, "dentist_id");
  const back = `/admin/doctors/${dentistId}`;
  if (!UUID.test(dentistId)) fail("/admin/doctors", "Doctor not found.");
  const days = fd.getAll("days").map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
  const start = str(fd, "start_time"), end = str(fd, "end_time");
  if (!days.length) fail(back, "Choose at least one day.");
  if (!HHMM.test(start) || !HHMM.test(end) || end <= start) fail(back, "Enter a start time that is earlier than the end time.");

  const { data: existing } = await sb.from("dentist_availability").select("weekday, start_time, end_time").eq("dentist_id", dentistId);
  const clash = (existing ?? []).find((e) => days.includes(e.weekday) && e.start_time.slice(0, 5) < end && e.end_time.slice(0, 5) > start);
  if (clash) fail(back, "That overlaps a working window already set for one of those days. Remove or change the old one first.");

  const { error } = await sb.from("dentist_availability").insert(days.map((weekday) => ({ dentist_id: dentistId, weekday, start_time: start, end_time: end })));
  if (error) fail(back, dbMessage(error, "This time"));
  await audit(sb, user.id, "availability_added", "dentist_availability", dentistId, { days, start, end });
  revalidatePath("/"); revalidatePath(back);
  done(back, "Working time added.");
}

export async function deleteAvailabilityAction(fd: FormData) {
  const { sb, user } = await requireStaff(["admin"]);
  const id = str(fd, "id"), dentistId = str(fd, "dentist_id");
  const back = UUID.test(dentistId) ? `/admin/doctors/${dentistId}` : "/admin/doctors";
  if (!UUID.test(id)) fail(back, "Working time not found.");
  const { error } = await sb.from("dentist_availability").delete().eq("id", id);
  if (error) fail(back, dbMessage(error, "This time"));
  await audit(sb, user.id, "availability_removed", "dentist_availability", id);
  revalidatePath("/"); revalidatePath(back);
  done(back, "Working time removed.");
}

/* ------------------------- Clinic settings and hours ------------------------- */

export async function saveClinicSettingsAction(fd: FormData) {
  const { sb, user } = await requireStaff(["admin"]);
  const back = "/admin/clinic";
  const tz = str(fd, "timezone");
  try { new Intl.DateTimeFormat("en-US", { timeZone: tz }); } catch { fail(back, "Unknown time zone. Use a name like Asia/Manila."); }

  const ints: [string, number, number][] = [
    ["slot_interval_minutes", 5, 120], ["min_notice_hours", 0, 720], ["booking_horizon_days", 1, 365],
    ["cancel_deadline_hours", 0, 720], ["reschedule_deadline_hours", 0, 720], ["reminder_hours_before", 1, 168], ["max_active_appointments", 1, 50],
  ];
  const row: Record<string, unknown> = {
    clinic_name: str(fd, "clinic_name"), address: str(fd, "address") || null, phone: str(fd, "phone") || null,
    email: str(fd, "email") || null, timezone: tz, require_approval: fd.get("require_approval") === "on",
  };
  if ((row.clinic_name as string).length < 2) fail(back, "Enter the clinic name.");
  for (const [k, lo, hi] of ints) {
    const n = Number(str(fd, k));
    if (!Number.isInteger(n) || n < lo || n > hi) fail(back, `${k.replace(/_/g, " ")} must be a whole number from ${lo} to ${hi}.`);
    row[k] = n;
  }
  const { error } = await sb.from("clinic_settings").update(row).eq("id", 1);
  if (error) fail(back, dbMessage(error, "These settings"));
  await audit(sb, user.id, "settings_updated", "clinic_settings", "1");
  revalidatePath("/", "layout");
  done(back, "Settings saved.");
}

export async function saveClinicHoursAction(fd: FormData) {
  const { sb, user } = await requireStaff(["admin"]);
  const back = "/admin/clinic";
  const rows = [];
  for (let d = 0; d <= 6; d++) {
    const closed = fd.get(`closed_${d}`) === "on";
    const open = str(fd, `open_${d}`), close = str(fd, `close_${d}`), bs = str(fd, `break_start_${d}`), be = str(fd, `break_end_${d}`);
    if (!closed) {
      if (!HHMM.test(open) || !HHMM.test(close) || close <= open) fail(back, `Day ${d + 1}: closing time must be after opening time.`);
      if ((bs && !be) || (!bs && be)) fail(back, `Day ${d + 1}: enter both break times or neither.`);
      if (bs && (!HHMM.test(bs) || !HHMM.test(be) || be <= bs || bs < open || be > close)) fail(back, `Day ${d + 1}: the break must sit inside opening hours.`);
    }
    rows.push({ weekday: d, is_closed: closed, open_time: closed ? null : open, close_time: closed ? null : close, break_start: closed || !bs ? null : bs, break_end: closed || !be ? null : be });
  }
  const { error } = await sb.from("clinic_hours").upsert(rows);
  if (error) fail(back, dbMessage(error, "These hours"));
  await audit(sb, user.id, "hours_updated", "clinic_hours");
  revalidatePath("/", "layout");
  done(back, "Opening hours saved.");
}

/* ------------------------------ Holidays and leave ------------------------------ */

export async function addBlockAction(fd: FormData) {
  const { sb, user } = await requireStaff(["admin", "receptionist"]);
  const back = "/admin/blocks";
  const { data: settings } = await sb.from("clinic_settings").select("timezone").eq("id", 1).single();
  const tz = settings?.timezone ?? "Asia/Manila";
  const dentistId = str(fd, "dentist_id");
  const kind = str(fd, "kind");
  const startDate = str(fd, "start_date"), endDate = str(fd, "end_date") || startDate;
  const allDay = fd.get("all_day") === "on";
  const startTime = allDay ? "00:00" : str(fd, "start_time"), endTime = allDay ? "23:59" : str(fd, "end_time");

  if (!["holiday", "leave", "blocked"].includes(kind)) fail(back, "Choose a type.");
  if (dentistId && !UUID.test(dentistId)) fail(back, "Doctor not found.");
  if (!YMD.test(startDate) || !YMD.test(endDate)) fail(back, "Enter the dates.");
  if (!HHMM.test(startTime) || !HHMM.test(endTime)) fail(back, "Enter the times.");

  const starts = localToUtcISO(startDate, startTime, tz);
  const endsBase = localToUtcISO(endDate, endTime, tz);
  const ends = allDay ? new Date(Date.parse(endsBase) + 60_000).toISOString() : endsBase;
  if (Date.parse(ends) <= Date.parse(starts)) fail(back, "The end must be after the start.");

  const { error } = await sb.from("blocked_slots").insert({
    dentist_id: dentistId || null, starts_at: starts, ends_at: ends, kind, reason: str(fd, "reason").slice(0, 200) || null, created_by: user.id,
  });
  if (error) fail(back, dbMessage(error, "This block"));

  // Warn about bookings that already sit inside the new block.
  let q = sb.from("appointments").select("id", { count: "exact", head: true }).in("status", ["pending", "confirmed"]).lt("starts_at", ends).gt("ends_at", starts);
  if (dentistId) q = q.eq("dentist_id", dentistId);
  const { count } = await q;

  await audit(sb, user.id, "block_added", "blocked_slots", null, { kind, startDate, endDate, dentistId: dentistId || "clinic" });
  revalidatePath("/"); revalidatePath(back);
  done(back, count ? `Saved. ${count} existing appointment${count === 1 ? "" : "s"} fall inside it: reschedule or cancel them from Appointments.` : "Saved. No existing appointments are affected.");
}

export async function deleteBlockAction(fd: FormData) {
  const { sb, user } = await requireStaff(["admin", "receptionist"]);
  const id = str(fd, "id");
  if (!UUID.test(id)) fail("/admin/blocks", "Not found.");
  const { error } = await sb.from("blocked_slots").delete().eq("id", id);
  if (error) fail("/admin/blocks", dbMessage(error, "This block"));
  await audit(sb, user.id, "block_removed", "blocked_slots", id);
  revalidatePath("/"); revalidatePath("/admin/blocks");
  done("/admin/blocks", "Removed.");
}

/* ------------------------------ Staff and roles ------------------------------ */

const ROLES = ["customer", "receptionist", "dentist", "admin"];

export async function setRoleAction(fd: FormData) {
  const { sb, user } = await requireStaff(["admin"]);
  const back = "/admin/staff";
  const id = str(fd, "id"), role = str(fd, "role");
  if (!UUID.test(id) || !ROLES.includes(role)) fail(back, "Invalid request.");
  if (id === user.id) fail(back, "You cannot change your own role. Ask another admin.");
  const { error } = await sb.from("profiles").update({ role, is_active: fd.get("is_active") === "on" }).eq("id", id);
  if (error) fail(back, dbMessage(error, "This account"));
  await audit(sb, user.id, "role_changed", "profiles", id, { role });
  revalidatePath(back);
  done(back, "Account updated.");
}

export async function promoteByEmailAction(fd: FormData) {
  const { sb, user } = await requireStaff(["admin"]);
  const back = "/admin/staff";
  const email = str(fd, "email").toLowerCase(), role = str(fd, "role");
  if (!["receptionist", "dentist", "admin"].includes(role)) fail(back, "Choose a role.");
  const { data: acct } = await sb.from("profiles").select("id").eq("email", email).maybeSingle();
  if (!acct) fail(back, "No account uses that email. They need to register on the website first.");
  const { error } = await sb.from("profiles").update({ role, is_active: true }).eq("id", acct!.id);
  if (error) fail(back, dbMessage(error, "This account"));
  await audit(sb, user.id, "role_changed", "profiles", acct!.id, { role, via: "email" });
  revalidatePath(back);
  done(back, `${email} is now ${role}.`);
}

/* ------------------------------ Appointments ------------------------------ */

const STATUS_MESSAGES: Record<string, string> = {
  confirmed: "Appointment confirmed. The patient has been notified.",
  cancelled: "Appointment cancelled and the time released.",
  completed: "Marked as completed.",
  no_show: "Marked as a missed appointment.",
};

export async function staffStatusAction(fd: FormData) {
  await requireStaff();
  const sb = await createSupabaseServer();
  const id = str(fd, "appointment_id"), status = str(fd, "status");
  const back = safeNext(str(fd, "return_to"), "/admin/appointments");
  const path = back.startsWith("/admin") ? back : "/admin/appointments";
  const [base] = path.split("?");
  if (!UUID.test(id) || !STATUS_MESSAGES[status]) fail(base, "Invalid request.");

  const { error } = await sb.rpc("staff_set_status", { p_appointment_id: id, p_status: status, p_note: str(fd, "note").slice(0, 300) || null });
  if (error) {
    const code = (error.message ?? "").trim();
    fail(base, code === "invalid_transition" ? "That change is not allowed for this appointment's current status." : code === "forbidden" ? "You do not have permission to do that." : "Something went wrong. Please try again.");
  }
  revalidatePath("/admin", "layout"); revalidatePath("/");
  done(base, STATUS_MESSAGES[status]);
}

/* ------------------------------ QR scanning ------------------------------ */

export type ScanResult =
  | { state: "ok"; id: string; reference: string; patient: string; service: string; dentist: string; starts_at: string; ends_at: string; status: string; valid: boolean }
  | { state: "notfound" | "unreadable" | "error" };

export async function verifyCodeAction(raw: string): Promise<ScanResult> {
  await requireStaff();
  const parsed = parseScanned(String(raw).slice(0, 2000));
  if (!parsed) return { state: "unreadable" };
  const sb = await createSupabaseServer();
  const { data, error } = await sb.rpc("verify_appointment", { p_code: parsed.value });
  if (error) { console.error("verify failed", error.message); return { state: "error" }; }
  const row = (data as Record<string, unknown>[] | null)?.[0];
  if (!row) return { state: "notfound" };
  return {
    state: "ok", id: row.out_id as string, reference: row.out_reference as string, patient: row.out_patient as string,
    service: row.out_service as string, dentist: row.out_dentist as string, starts_at: row.out_starts_at as string,
    ends_at: row.out_ends_at as string, status: row.out_status as string, valid: row.out_valid as boolean,
  };
}

export async function completeFromScanAction(id: string): Promise<{ ok: boolean; error?: string }> {
  await requireStaff();
  if (!UUID.test(id)) return { ok: false, error: "Invalid appointment." };
  const sb = await createSupabaseServer();
  const { error } = await sb.rpc("staff_set_status", { p_appointment_id: id, p_status: "completed", p_note: "Checked in by QR scan" });
  if (error) return { ok: false, error: (error.message ?? "").trim() === "invalid_transition" ? "This appointment can no longer be marked completed." : "Something went wrong." };
  revalidatePath("/admin", "layout");
  return { ok: true };
}
