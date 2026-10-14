import type { SupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { getSessionContext } from "./dashboard";

export type StaffRole = "admin" | "receptionist" | "dentist";
export const ALL_STAFF: StaffRole[] = ["admin", "receptionist", "dentist"];

/** Server-side gate for every admin page and action. Customers never get past this. */
export async function requireStaff(allowed: StaffRole[] = ALL_STAFF) {
  const ctx = await getSessionContext();
  const role = ctx.profile?.role as string | undefined;
  if (!role || role === "customer") redirect("/dashboard");
  if (!allowed.includes(role as StaffRole)) redirect("/admin");
  return { ...ctx, role: role as StaffRole };
}

export async function audit(sb: SupabaseClient, actorId: string, action: string, entity: string, entityId?: string | null, details?: Record<string, unknown>) {
  const { error } = await sb.from("audit_logs").insert({ actor_id: actorId, action, entity, entity_id: entityId ?? null, details: details ?? null });
  if (error) console.error("audit insert failed", error.message);
}

export const NAV = [
  { label: "Schedule", items: [
    { href: "/admin", label: "Overview", roles: ALL_STAFF },
    { href: "/admin/appointments", label: "Appointments", roles: ALL_STAFF, badge: true },
    { href: "/admin/scan", label: "Scan QR", roles: ALL_STAFF },
  ] },
  { label: "Clinic", items: [
    { href: "/admin/doctors", label: "Doctors and times", roles: ["admin"] as StaffRole[] },
    { href: "/admin/services", label: "Services", roles: ["admin"] as StaffRole[] },
    { href: "/admin/clinic", label: "Hours and settings", roles: ["admin"] as StaffRole[] },
    { href: "/admin/blocks", label: "Holidays and leave", roles: ["admin", "receptionist"] as StaffRole[] },
  ] },
  { label: "People", items: [
    { href: "/admin/patients", label: "Patients", roles: ALL_STAFF },
    { href: "/admin/staff", label: "Staff and roles", roles: ["admin"] as StaffRole[] },
  ] },
  { label: "Insights", items: [
    { href: "/admin/reports", label: "Reports", roles: ALL_STAFF },
    { href: "/admin/audit", label: "Audit log", roles: ["admin"] as StaffRole[] },
  ] },
];
