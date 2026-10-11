"use client";

import { useActionState } from "react";
import { updateAccountAction } from "@/app/actions/profile";
import type { FormState } from "@/app/actions/types";
import { Field, FormNotice, SubmitButton } from "./FormBits";

export default function AccountForm({ fullName, phone, email }: { fullName: string; phone: string; email: string }) {
  const [state, action] = useActionState<FormState, FormData>(updateAccountAction, {});
  return (
    <form action={action} className="space-y-5" noValidate>
      <FormNotice state={state} />
      <div>
        <p className="mb-1.5 text-sm text-silver">Email address</p>
        <p className="rounded-md border border-silver/15 bg-charcoal px-3 py-2.5 text-muted">{email}</p>
      </div>
      <Field name="full_name" label="Full name" state={state} autoComplete="name" defaultValue={fullName} />
      <Field name="phone" label="Mobile phone number" type="tel" state={state} autoComplete="tel" inputMode="tel" defaultValue={phone} />
      <SubmitButton pending="Saving...">Save changes</SubmitButton>
    </form>
  );
}
