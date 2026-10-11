"use client";

import { useActionState, useState } from "react";
import { cancelAction } from "@/app/actions/booking";
import type { FormState } from "@/app/actions/types";
import { FormNotice, SubmitButton } from "./FormBits";

export default function CancelPanel({ appointmentId, deadlineHours }: { appointmentId: string; deadlineHours: number }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState<FormState, FormData>(cancelAction, {});

  if (!open) return <button type="button" className="btn-ghost" onClick={() => setOpen(true)}>Cancel appointment</button>;

  return (
    <form action={action} role="alertdialog" aria-labelledby="cancel-title" aria-describedby="cancel-desc"
      className="panel w-full max-w-lg space-y-4 p-5">
      <input type="hidden" name="appointment_id" value={appointmentId} />
      <h2 id="cancel-title" className="text-2xl">Cancel this appointment?</h2>
      <p id="cancel-desc" className="text-sm text-silver">
        Your time will be released for other patients and your QR ticket will stop working. Appointments can be cancelled up to {deadlineHours} hours before the start time.
      </p>
      <FormNotice state={state} />
      <div>
        <label htmlFor="reason" className="mb-1.5 block text-sm text-silver">Reason <span className="text-muted">(optional)</span></label>
        <textarea id="reason" name="reason" rows={2} maxLength={300} className="field" />
      </div>
      <div className="flex flex-wrap gap-3">
        <button type="button" className="btn-ghost" autoFocus onClick={() => setOpen(false)}>Keep appointment</button>
        <SubmitButton className="btn-primary" pending="Cancelling...">Yes, cancel it</SubmitButton>
      </div>
    </form>
  );
}
