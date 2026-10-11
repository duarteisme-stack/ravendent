"use client";

import Link from "next/link";
import { useActionState } from "react";
import { forgotPasswordAction } from "@/app/actions/auth";
import type { FormState } from "@/app/actions/types";
import { Field, FormNotice, SubmitButton } from "./FormBits";

export default function ForgotForm() {
  const [state, action] = useActionState<FormState, FormData>(forgotPasswordAction, {});
  return (
    <form action={action} className="space-y-5" noValidate>
      <FormNotice state={state} />
      <Field name="email" label="Email address" type="email" state={state} autoComplete="email" inputMode="email" />
      <SubmitButton pending="Sending...">Send reset link</SubmitButton>
      <p className="text-center text-sm"><Link href="/login" className="text-crimson-light underline underline-offset-4">Back to log in</Link></p>
    </form>
  );
}
