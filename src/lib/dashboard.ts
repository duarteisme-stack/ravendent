import { redirect } from "next/navigation";
import { createSupabaseServer } from "./supabase-server";

export async function getSessionContext() {
  const sb = await createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await sb.from("profiles").select("full_name, email, phone, role").eq("id", user.id).maybeSingle();
  return { sb, user, profile };
}

export type AppointmentRow = {
  id: string;
  reference: string;
  starts_at: string;
  ends_at: string;
  status: "pending" | "confirmed" | "cancelled" | "completed" | "no_show";
  dental_services: { name: string } | null;
  dentists: { display_name: string } | null;
};

export const APPT_SELECT = "id, reference, starts_at, ends_at, status, dental_services(name), dentists(display_name)";
