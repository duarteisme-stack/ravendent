"use server";

import { redirect } from "next/navigation";
import { createSupabaseServer, siteUrl, supabaseConfigured } from "@/lib/supabase-server";
import {
  safeNext, str, validateEmail, validatePassword, validateRegister,
} from "@/lib/validation";
import type { FormState } from "./types";

const GENERIC_LOGIN_ERROR = "Incorrect email or password.";
const NOT_CONFIGURED = "This site is not connected to its database yet. The site owner needs to finish the Supabase setup.";
const EMAIL_LIMIT = "Too many emails were sent recently, so we cannot send another right now. Please try again in about an hour, or contact the clinic.";
const isEmailLimit = (e: { code?: string; status?: number } | null) => Boolean(e && (e.code === "over_email_send_rate_limit" || e.status === 429));
const configError = (values?: Record<string, string>): FormState => {
  console.error("Auth action called but Supabase environment variables are missing.");
  return { error: NOT_CONFIGURED, values };
};

export async function registerAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const { values, password, errors } = validateRegister(fd);
  if (Object.keys(errors).length) return { fields: errors, values };
  if (!supabaseConfigured()) return configError(values);

  const sb = await createSupabaseServer();
  const { data, error } = await sb.auth.signUp({
    email: values.email,
    password,
    options: {
      emailRedirectTo: `${await siteUrl()}/auth/callback?next=/dashboard/profile`,
      data: { full_name: values.full_name, phone: values.phone, terms_accepted_at: new Date().toISOString() },
    },
  });

  if (error) {
    if (isEmailLimit(error)) {
      console.error("Supabase email rate limit hit on sign-up. Owner: enable custom SMTP (Brevo) in Supabase > Authentication > Emails and raise the email rate limit.");
      return { error: EMAIL_LIMIT, values };
    }
    if (error.code === "weak_password") return { fields: { password: "Choose a stronger password." }, values };
    console.error("signUp failed", error.code);
    return { error: "We could not create your account right now. Please try again.", values };
  }

  // Email confirmation off in Supabase: user is signed in immediately.
  if (data.session) redirect("/dashboard/profile");

  // Same message whether or not the email already exists (prevents account enumeration).
  return {
    message: `Check ${values.email} for a confirmation link. If you already have an account, log in or reset your password instead.`,
  };
}

export async function loginAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, "email").toLowerCase();
  const password = String(fd.get("password") ?? "");
  const next = safeNext(str(fd, "next"));

  const emailErr = validateEmail(email);
  if (emailErr || !password) return { fields: { ...(emailErr ? { email: emailErr } : {}), ...(!password ? { password: "Enter your password." } : {}) }, values: { email } };

  if (!supabaseConfigured()) return configError({ email });
  const sb = await createSupabaseServer();
  const { data: signIn, error } = await sb.auth.signInWithPassword({ email, password });

  if (error) {
    if (error.code === "email_not_confirmed") {
      return { error: "Please confirm your email address first. We can send the link again.", needsConfirmation: true, values: { email } };
    }
    if (error.status === 429 || error.code === "over_request_rate_limit") {
      return { error: "Too many attempts. Please wait a few minutes and try again.", values: { email } };
    }
    return { error: GENERIC_LOGIN_ERROR, values: { email } };
  }

  // Staff land on the admin dashboard unless they were sent here from a specific page.
  if (!str(fd, "next") || next === "/dashboard") {
    const { data: p } = await sb.from("profiles").select("role").eq("id", signIn.user.id).maybeSingle();
    if (p && p.role !== "customer") redirect("/admin");
  }
  redirect(next);
}

export async function resendConfirmationAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, "email").toLowerCase();
  if (validateEmail(email)) return { error: "Enter a valid email address." };
  const sb = await createSupabaseServer();
  const { error } = await sb.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${await siteUrl()}/auth/callback?next=/dashboard/profile` },
  });
  if (isEmailLimit(error)) return { error: EMAIL_LIMIT };
  return { message: "If that account is waiting for confirmation, a new link is on its way." };
}

export async function forgotPasswordAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, "email").toLowerCase();
  const err = validateEmail(email);
  if (err) return { fields: { email: err }, values: { email } };
  if (!supabaseConfigured()) return configError({ email });

  const sb = await createSupabaseServer();
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: `${await siteUrl()}/auth/callback?next=/reset-password` });
  if (isEmailLimit(error)) return { error: EMAIL_LIMIT, values: { email } };
  return { message: "If an account exists for that email, a reset link is on its way. It expires after a short time." };
}

export async function resetPasswordAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const password = String(fd.get("password") ?? "");
  const confirm = String(fd.get("confirm_password") ?? "");
  const pwErr = validatePassword(password);
  if (pwErr) return { fields: { password: pwErr } };
  if (password !== confirm) return { fields: { confirm_password: "Passwords do not match." } };

  const sb = await createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: "This reset link has expired. Request a new one." };

  const { error } = await sb.auth.updateUser({ password });
  if (error) {
    if (error.code === "same_password") return { fields: { password: "Choose a password you have not used before." } };
    if (error.code === "weak_password") return { fields: { password: "Choose a stronger password." } };
    return { error: "We could not update your password. Request a new reset link and try again." };
  }
  await sb.auth.signOut({ scope: "others" }); // end every other session
  redirect("/dashboard/settings?updated=password");
}

export async function logoutAction() {
  const sb = await createSupabaseServer();
  await sb.auth.signOut();
  redirect("/");
}
