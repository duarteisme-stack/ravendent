"use client";

import { useActionState } from "react";
import { saveMedicalAction } from "@/app/actions/profile";
import type { FormState } from "@/app/actions/types";
import { CheckField, Field, FormNotice, SubmitButton } from "./FormBits";

export default function MedicalForm({ defaults, hasConsent, next }: { defaults: Record<string, string>; hasConsent: boolean; next?: string }) {
  const [state, action] = useActionState<FormState, FormData>(saveMedicalAction, {});

  return (
    <form action={action} className="space-y-6" noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      <FormNotice state={state} />
      <p className="text-sm text-muted">
        Write &quot;None&quot; if a section does not apply. Leaving a section empty is also fine, but the dentist will ask you in person.
      </p>
      <Field name="allergies" label="Allergies" state={state} optional rows={3} maxLength={2000} defaultValue={defaults.allergies}
        hint="Medicines (such as penicillin), latex, anesthetics, or foods. Allergies change which materials and drugs are safe for you." />
      <Field name="conditions" label="Medical conditions and history" state={state} optional rows={3} maxLength={2000} defaultValue={defaults.conditions}
        hint="For example diabetes, heart conditions, high blood pressure, pregnancy, or past surgeries. These affect anesthesia, healing, and infection risk." />
      <Field name="medications" label="Current medications" state={state} optional rows={3} maxLength={2000} defaultValue={defaults.medications}
        hint="Include blood thinners and supplements. Some interact with dental drugs or raise bleeding risk." />
      <Field name="previous_dental_concerns" label="Previous dental concerns" state={state} optional rows={3} maxLength={2000} defaultValue={defaults.previous_dental_concerns}
        hint="Past treatments, pain, sensitivity, or anything that made visits difficult." />

      <div className="rounded-md border border-silver/15 bg-charcoal p-4 text-sm text-muted">
        Only authorized dentists and administrators can see this section. Receptionists cannot. It is never shown on the public calendar or put in your QR code.
      </div>

      {hasConsent ? (
        <input type="hidden" name="health_consent" value="on" />
      ) : (
        <CheckField name="health_consent" state={state}>
          I explicitly consent to RavenDent storing my health information to provide safe dental care. I can update or ask for correction of it at any time.
        </CheckField>
      )}
      <SubmitButton pending="Saving...">Save medical information</SubmitButton>
    </form>
  );
}
