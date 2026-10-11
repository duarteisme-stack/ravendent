"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registerAction } from "@/app/actions/auth";
import type { FormState } from "@/app/actions/types";
import { CheckField, Field, FormNotice, SubmitButton } from "./FormBits";

export default function RegisterForm() {
  const [state, action] = useActionState<FormState, FormData>(registerAction, {});

  if (state.message) {
    return (
      <div className="space-y-4">
        <FormNotice state={state} />
        <p className="text-sm text-muted">The link works from any device. Check your spam folder if it does not arrive within a few minutes.</p>
        <Link href="/login" className="btn-ghost w-full">Go to log in</Link>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5" noValidate>
      <FormNotice state={state} />
      <Field name="full_name" label="Full name" state={state} autoComplete="name" />
      <Field name="email" label="Email address" type="email" state={state} autoComplete="email" inputMode="email" />
      <Field name="phone" label="Mobile phone number" type="tel" state={state} autoComplete="tel" inputMode="tel" hint="Used for appointment contact only." />
      <Field name="password" label="Password" type="password" state={state} autoComplete="new-password" hint="At least 10 characters, with a letter and a number." />
      <Field name="confirm_password" label="Confirm password" type="password" state={state} autoComplete="new-password" />
      <CheckField name="accept_terms" state={state}>
        I have read the <Link href="/privacy" target="_blank" className="text-crimson-light underline underline-offset-4">privacy notice</Link> and agree to the{" "}
        <Link href="/terms" target="_blank" className="text-crimson-light underline underline-offset-4">terms of service</Link>.
      </CheckField>
      <SubmitButton pending="Creating account...">Create account</SubmitButton>
      <p className="text-center text-sm text-muted">
        Already registered? <Link href="/login" className="text-crimson-light underline underline-offset-4">Log in</Link>
      </p>
    </form>
  );
}
