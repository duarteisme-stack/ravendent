"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import { str } from "@/lib/validation";
import type { FormState } from "./types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MESSAGES: Record<string, string> = {
  slot_unavailable: "That time was just taken by someone else. Please choose another time.",
  too_many_active: "You have reached the limit of upcoming appointments. Cancel or complete one before booking another.",
  one_per_day: "Only one session a day is allowed. Please choose another day.",
  rate_limited: "Too many changes in a short time. Please wait a while and try again.",
  service_unavailable: "That service is no longer available. Please choose another.",
  deadline_passed: "This appointment is inside the clinic's change deadline. Please contact the clinic to change it.",
  not_reschedulable: "This appointment can no longer be changed.",
  not_cancellable: "This appointment can no longer be cancelled.",
  not_found: "We could not find that appointment.",
};

function fail(err: { message?: string }): FormState {
  const code = (err.message ?? "").trim();
  if (code === "profile_incomplete") redirect("/dashboard/profile");
  if (code === "not_authenticated") redirect("/login");
  if (MESSAGES[code]) return { error: MESSAGES[code], code };
  console.error("booking rpc failed", code);
  return { error: "Something went wrong. Please try again.", code: "unknown" };
}

function parseSlot(fd: FormData) {
  const serviceId = str(fd, "service_id");
  const dentistId = str(fd, "dentist_id");
  const start = str(fd, "start");
  const startMs = Date.parse(start);
  if (!UUID.test(serviceId) || (dentistId && !UUID.test(dentistId)) || Number.isNaN(startMs) || startMs < Date.now()) return null;
  return { serviceId, dentistId: dentistId || null, start: new Date(startMs).toISOString() };
}

export async function bookAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const slot = parseSlot(fd);
  if (!slot) return { error: "Please choose a service and an available time.", code: "invalid" };
  const notes = str(fd, "notes").slice(0, 500);

  const sb = await createSupabaseServer();
  const { data, error } = await sb.rpc("book_appointment", {
    p_service_id: slot.serviceId, p_dentist_id: slot.dentistId, p_start: slot.start, p_notes: notes || null,
  });
  if (error) return fail(error);

  const row = (data as { out_id: string }[] | null)?.[0];
  if (!row) return { error: "Something went wrong. Please try again.", code: "unknown" };
  revalidatePath("/dashboard", "layout");
  redirect(`/dashboard/appointments/${row.out_id}?new=1`);
}

export async function rescheduleAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const appointmentId = str(fd, "appointment_id");
  const slot = parseSlot(fd);
  if (!UUID.test(appointmentId) || !slot) return { error: "Please choose a service and an available time.", code: "invalid" };

  const sb = await createSupabaseServer();
  const { error } = await sb.rpc("reschedule_appointment", {
    p_appointment_id: appointmentId, p_new_start: slot.start, p_new_service_id: slot.serviceId, p_new_dentist_id: slot.dentistId,
  });
  if (error) return fail(error);

  revalidatePath("/dashboard", "layout");
  redirect(`/dashboard/appointments/${appointmentId}?updated=1`);
}

export async function cancelAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const appointmentId = str(fd, "appointment_id");
  if (!UUID.test(appointmentId)) return { error: "We could not find that appointment.", code: "not_found" };

  const sb = await createSupabaseServer();
  const { error } = await sb.rpc("cancel_appointment", { p_appointment_id: appointmentId, p_reason: str(fd, "reason").slice(0, 300) || null });
  if (error) return fail(error);

  revalidatePath("/dashboard", "layout");
  redirect(`/dashboard/appointments/${appointmentId}?cancelled=1`);
}
