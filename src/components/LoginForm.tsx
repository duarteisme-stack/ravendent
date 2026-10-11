"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, resendConfirmationAction } from "@/app/actions/auth";
import type { FormState } from "@/app/actions/types";
import { Field, FormNotice, SubmitButton } from "./FormBits";

export default function LoginForm({ next, notice }: { next: string; notice?: string }) {
  const [state, action] = useActionState<FormState, FormData>(loginAction, {});
  const [resend, resendAction] = useActionState<FormState, FormData>(resendConfirmationAction, {});

  return (
    <div className="space-y-5">
      {notice && <p role="status" className="rounded-md border border-silver/30 bg-white/5 px-3 py-2.5 text-sm">{notice}</p>}
      <form action={action} className="space-y-5" noValidate>
        <input type="hidden" name="next" value={next} />
        <FormNotice state={state} />
        <Field name="email" label="Email address" type="email" state={state} autoComplete="email" inputMode="email" />
        <Field name="password" label="Password" type="password" state={state} autoComplete="current-password" />
        <SubmitButton pending="Logging in...">Log in</SubmitButton>
      </form>

      {state.needsConfirmation && (
        <form action={resendAction} className="space-y-3 border-t border-silver/15 pt-5">
          <input type="hidden" name="email" value={state.values?.email ?? ""} />
          <FormNotice state={resend} />
          <SubmitButton className="btn-ghost w-full" pending="Sending...">Resend confirmation email</SubmitButton>
        </form>
      )}

      <div className="flex flex-wrap justify-between gap-2 text-sm text-muted">
        <Link href="/forgot-password" className="text-crimson-light underline underline-offset-4">Forgot password?</Link>
        <span>New here? <Link href="/register" className="text-crimson-light underline underline-offset-4">Create an account</Link></span>
      </div>
    </div>
  );
}
