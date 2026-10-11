"use client";

import { useActionState } from "react";
import { resetPasswordAction } from "@/app/actions/auth";
import type { FormState } from "@/app/actions/types";
import { Field, FormNotice, SubmitButton } from "./FormBits";

export default function ResetForm() {
  const [state, action] = useActionState<FormState, FormData>(resetPasswordAction, {});
  return (
    <form action={action} className="space-y-5" noValidate>
      <FormNotice state={state} />
      <Field name="password" label="New password" type="password" state={state} autoComplete="new-password" hint="At least 10 characters, with a letter and a number." />
      <Field name="confirm_password" label="Confirm new password" type="password" state={state} autoComplete="new-password" />
      <SubmitButton pending="Saving...">Save new password</SubmitButton>
    </form>
  );
}
