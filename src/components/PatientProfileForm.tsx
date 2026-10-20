"use client";

import { useActionState } from "react";
import { savePatientProfileAction } from "@/app/actions/profile";
import type { FormState } from "@/app/actions/types";
import { CheckField, Field, FormNotice, SubmitButton } from "./FormBits";
import TxtFill from "./TxtFill";

export type PatientDefaults = Record<string, string>;

export default function PatientProfileForm({ defaults, hasConsent, next }: { defaults: PatientDefaults; hasConsent: boolean; next?: string }) {
  const [state, action] = useActionState<FormState, FormData>(savePatientProfileAction, {});
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={action} className="space-y-6" noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      <FormNotice state={state} />
      <TxtFill map={{ full_name: "legal_name", date_of_birth: "date_of_birth", phone: "phone", address: "address", emergency_contact_name: "emergency_contact_name", emergency_contact_phone: "emergency_contact_phone", reason_for_consultation: "reason_for_consultation" }} />

      <fieldset className="space-y-5">
        <legend className="font-display text-2xl">Required</legend>
        <Field name="legal_name" label="Full legal name" state={state} autoComplete="name" defaultValue={defaults.legal_name} />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field name="date_of_birth" label="Date of birth" type="date" state={state} max={today} autoComplete="bday" defaultValue={defaults.date_of_birth}
            hint="Dentists use this to choose safe treatment options. If the patient is under 18, a parent or guardian should complete this form." />
          <Field name="phone" label="Contact number" type="tel" state={state} autoComplete="tel" inputMode="tel" defaultValue={defaults.phone} />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field name="emergency_contact_name" label="Emergency contact name" state={state} defaultValue={defaults.emergency_contact_name} />
          <Field name="emergency_contact_phone" label="Emergency contact phone" type="tel" state={state} inputMode="tel" defaultValue={defaults.emergency_contact_phone} />
        </div>
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="font-display text-2xl">Optional</legend>
        <Field name="address" label="Address" state={state} optional autoComplete="street-address" defaultValue={defaults.address} hint="Only if you want the clinic to have it on file." />
        <Field name="reason_for_consultation" label="Reason for your visit" state={state} optional rows={3} defaultValue={defaults.reason_for_consultation} maxLength={1000}
          hint="For example: tooth pain, a check-up, or a cleaning." />
      </fieldset>

      {hasConsent ? (
        <input type="hidden" name="privacy_consent" value="on" />
      ) : (
        <CheckField name="privacy_consent" state={state}>
          I consent to RavenDent collecting and storing this information to provide dental care and manage my appointments, as described in the privacy notice.
        </CheckField>
      )}
      <SubmitButton pending="Saving...">Save patient profile</SubmitButton>
    </form>
  );
}
