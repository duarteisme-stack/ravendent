"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import {
  normalizePhone, safeNext, str, validateMedical, validateName, validatePatientProfile, validatePhone,
} from "@/lib/validation";
import type { FormState } from "./types";

async function requireUser() {
  const sb = await createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");
  return { sb, user };
}

export async function savePatientProfileAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const { sb, user } = await requireUser();
  const { values, errors } = validatePatientProfile(fd);
  if (Object.keys(errors).length) return { fields: errors, values };

  const { data: existing } = await sb.from("patient_profiles").select("privacy_consent_at").eq("user_id", user.id).maybeSingle();
  const { error } = await sb.from("patient_profiles").upsert({
    user_id: user.id,
    legal_name: values.legal_name,
    date_of_birth: values.date_of_birth,
    phone: normalizePhone(values.phone),
    address: values.address || null,
    emergency_contact_name: values.emergency_contact_name,
    emergency_contact_phone: normalizePhone(values.emergency_contact_phone),
    reason_for_consultation: values.reason_for_consultation || null,
    privacy_consent_at: existing?.privacy_consent_at ?? new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  if (error) {
    console.error("patient_profiles upsert", error.code);
    return { error: "We could not save your profile. Please try again.", values };
  }

  revalidatePath("/dashboard", "layout");
  const next = str(fd, "next");
  if (next) redirect(safeNext(next));
  return { message: "Patient profile saved.", values };
}

export async function saveMedicalAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const { sb, user } = await requireUser();
  const { values, errors } = validateMedical(fd);
  if (Object.keys(errors).length) return { fields: errors, values };

  const { data: existing } = await sb.from("medical_information").select("health_data_consent_at").eq("user_id", user.id).maybeSingle();
  const { error } = await sb.from("medical_information").upsert({
    user_id: user.id,
    allergies: values.allergies || null,
    conditions: values.conditions || null,
    medications: values.medications || null,
    previous_dental_concerns: values.previous_dental_concerns || null,
    health_data_consent_at: existing?.health_data_consent_at ?? new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  if (error) {
    console.error("medical_information upsert", error.code);
    return { error: "We could not save your medical information. Please try again.", values };
  }

  revalidatePath("/dashboard", "layout");
  const next = str(fd, "next");
  if (next) redirect(safeNext(next));
  return { message: "Medical information saved.", values };
}

export async function updateAccountAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const { sb, user } = await requireUser();
  const full_name = str(fd, "full_name");
  const phone = str(fd, "phone");
  const fields: Record<string, string> = {};
  const n = validateName(full_name);
  if (n) fields.full_name = n;
  const p = validatePhone(phone);
  if (p) fields.phone = p;
  if (Object.keys(fields).length) return { fields, values: { full_name, phone } };

  const { error } = await sb.from("profiles").update({ full_name, phone: normalizePhone(phone) }).eq("id", user.id);
  if (error) return { error: "We could not save your changes. Please try again.", values: { full_name, phone } };
  revalidatePath("/dashboard", "layout");
  return { message: "Account details updated.", values: { full_name, phone } };
}

export async function markNotificationsReadAction() {
  const { sb, user } = await requireUser();
  await sb.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).is("read_at", null);
  revalidatePath("/dashboard", "layout");
}
