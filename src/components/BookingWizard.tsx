"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { bookAction, rescheduleAction } from "@/app/actions/booking";
import type { FormState } from "@/app/actions/types";
import type { Dentist, Service } from "@/lib/clinic";
import { durationLabel, fmtDateTz, fmtSlot, longDate, pesoRange, ymdInTz } from "@/lib/format";
import { useAvailability, type Slot } from "@/lib/useAvailability";
import { FormNotice, SubmitButton } from "./FormBits";
import MonthGrid from "./MonthGrid";

type Props = {
  mode: "book" | "reschedule";
  services: Service[];
  dentists: Dentist[];
  timezone: string;
  horizonDays: number;
  requireApproval: boolean;
  patientName: string;
  initial: { serviceId: string; dentistId: string; start?: string };
  current?: { id: string; startsAt: string; endsAt: string; serviceName: string; dentistName: string | null };
  returnTo?: string;
};

const STEPS = ["Service", "Date and time", "Review"];

export default function BookingWizard({ mode, services, dentists, timezone, horizonDays, requireApproval, patientName, initial, current, returnTo }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(initial.start ? 2 : 1);
  const [serviceId, setServiceId] = useState(initial.serviceId || services[0]?.id || "");
  const [dentistId, setDentistId] = useState(initial.dentistId);
  const [chosen, setChosen] = useState<Slot | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const pending = useRef<string | null>(initial.start ?? null);

  const [state, action] = useActionState<FormState, FormData>(mode === "book" ? bookAction : rescheduleAction, {});
  const a = useAvailability({ serviceId, dentistId, timezone, horizonDays, excludeAppointmentId: current?.id });
  const service = services.find((s) => s.id === serviceId);
  const dentist = dentists.find((d) => d.id === dentistId);
  const needsApproval = Boolean(service?.requires_approval) || requireApproval;

  // Arrived from a slot link: jump to that day and keep the slot only if it is still free.
  useEffect(() => {
    if (!pending.current) return;
    a.goToDate(ymdInTz(pending.current, timezone));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!pending.current || !a.selected || a.slotsFor !== a.selected) return;
    const hit = a.slots.find((s) => s.start === pending.current);
    if (hit) { setChosen(hit); setStep(3); }
    else setNotice("The time you picked is no longer available. Please choose another.");
    pending.current = null;
  }, [a.slots, a.slotsFor, a.selected]);

  // Lost the race at confirmation: send them back to pick again.
  useEffect(() => {
    if (state.code === "slot_unavailable") { setChosen(null); setStep(2); a.refresh(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const pickService = (id: string) => { setServiceId(id); setChosen(null); };
  const pickDentist = (id: string) => { setDentistId(id); setChosen(null); };

  return (
    <div className="space-y-8">
      <ol className="flex flex-wrap gap-x-8 gap-y-2" aria-label="Progress">
        {STEPS.map((label, i) => {
          const n = (i + 1) as 1 | 2 | 3;
          const reachable = n < step;
          return (
            <li key={label} aria-current={n === step ? "step" : undefined}>
              <button type="button" disabled={!reachable} onClick={() => setStep(n)}
                className={`flex items-center gap-2.5 text-[0.95rem] ${n === step ? "text-snow" : reachable ? "text-silver hover:text-snow" : "text-muted"}`}>
                <span className={`flex h-7 w-7 items-center justify-center rounded-full border text-sm ${n === step ? "border-crimson bg-crimson text-snow" : n < step ? "border-emerald/70 text-emerald-light" : "border-silver/30"}`}>
                  {n < step ? "\u2713" : n}
                </span>
                {label}
              </button>
            </li>
          );
        })}
      </ol>

      <FormNotice state={state} />
      {notice && step !== 3 && <p role="status" className="rounded-md border border-silver/30 bg-white/5 px-3 py-2.5 text-sm">{notice}</p>}
      {mode === "reschedule" && current && (
        <p className="rounded-md border border-silver/15 bg-charcoal px-4 py-3 text-sm text-silver">
          Current appointment: {current.serviceName} on {fmtDateTz(current.startsAt, timezone)}, {fmtSlot(current.startsAt, timezone)} to {fmtSlot(current.endsAt, timezone)}.
          It stays reserved until you confirm a new time.
        </p>
      )}

      {step === 1 && (
        <section aria-labelledby="s1" className="space-y-6">
          <h2 id="s1" className="text-3xl">{mode === "book" ? "What do you need?" : "Keep or change the service"}</h2>
          <fieldset>
            <legend className="sr-only">Dental service</legend>
            <div className="divide-y divide-silver/15 border-y border-silver/15">
              {services.map((s) => {
                const price = pesoRange(s.price_min, s.price_max);
                const on = s.id === serviceId;
                return (
                  <label key={s.id} className={`flex cursor-pointer items-start gap-4 px-2 py-4 transition-colors ${on ? "bg-white/5" : "hover:bg-white/[0.03]"}`}>
                    <input type="radio" name="service-choice" value={s.id} checked={on} onChange={() => pickService(s.id)} className="mt-1.5 h-4 w-4 accent-[#8B1E2D]" />
                    <span className="grid flex-1 gap-x-8 gap-y-1 sm:grid-cols-[1fr_auto]">
                      <span>
                        <span className="block text-xl">{s.name}</span>
                        {s.description && <span className="block text-sm text-silver">{s.description}</span>}
                        {s.prep_instructions && <span className="block text-sm text-muted">Before your visit: {s.prep_instructions}</span>}
                        {s.requires_approval && <span className="block text-sm text-muted">Needs staff approval before it is confirmed.</span>}
                      </span>
                      <span className="text-sm text-muted sm:text-right">
                        <span className="block text-snow">{durationLabel(s.duration_minutes)}</span>
                        {price && <span className="block">{price}</span>}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="max-w-sm">
            <label htmlFor="dentist-choice" className="mb-1.5 block text-sm text-silver">Preferred dentist</label>
            <select id="dentist-choice" className="field" value={dentistId} onChange={(e) => pickDentist(e.target.value)}>
              <option value="">Any available dentist</option>
              {dentists.map((d) => <option key={d.id} value={d.id}>{d.display_name}</option>)}
            </select>
          </div>
          <button type="button" className="btn-primary" onClick={() => { setNotice(null); setStep(2); }} disabled={!service}>Continue to date and time</button>
        </section>
      )}

      {step === 2 && (
        <section aria-labelledby="s2" className="space-y-6">
          <div>
            <h2 id="s2" className="text-3xl">Choose a date and time</h2>
            {service && <p className="mt-1 text-sm text-muted">{service.name}, about {durationLabel(service.duration_minutes)}. Times are in clinic local time.</p>}
          </div>
          <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
            <div className="panel p-5 sm:p-7">
              <MonthGrid view={a.view} days={a.days} today={a.today} selected={a.selected} loading={a.loadingMonth}
                atMin={a.atMin} atMax={a.atMax} onShift={a.shift} onSelect={a.setSelected} />
            </div>
            <div className="panel p-5 sm:p-7" aria-live="polite">
              {a.error && <p role="alert" className="mb-4 rounded-md border border-crimson/60 bg-crimson/10 px-3 py-2 text-sm">{a.error}</p>}
              {!a.selected ? (
                <p className="py-10 text-center text-muted">Pick a day to see open times.</p>
              ) : (
                <>
                  <h3 className="text-3xl">{longDate(a.selected)}</h3>
                  {a.loadingSlots ? (
                    <p className="mt-6 text-muted">Loading times...</p>
                  ) : a.slots.length === 0 ? (
                    <div className="mt-6 rounded-md border border-silver/15 bg-charcoal p-5">
                      <p className="font-medium">No times left on this day.</p>
                      <p className="mt-1 text-sm text-muted">Try another date, or choose a different dentist.</p>
                    </div>
                  ) : (
                    <ul className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                      {a.slots.map((s) => (
                        <li key={s.start}>
                          <button type="button" onClick={() => { setChosen(s); setNotice(null); setStep(3); }}
                            className={`block w-full rounded-md border px-3 py-2.5 text-center font-medium transition-colors hover:border-crimson-light hover:bg-crimson/20 ${chosen?.start === s.start ? "border-crimson bg-crimson/30" : "border-silver/30"}`}>
                            {fmtSlot(s.start, timezone)}
                            <span className="block text-xs font-normal text-muted">until {fmtSlot(s.end, timezone)}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          </div>
          <button type="button" className="btn-ghost" onClick={() => setStep(1)}>Back</button>
        </section>
      )}

      {step === 3 && chosen && service && (
        <section aria-labelledby="s3" className="max-w-2xl space-y-6">
          <h2 id="s3" className="text-3xl">{mode === "book" ? "Review and confirm" : "Review the new time"}</h2>
          <dl className="divide-y divide-silver/15 border-y border-silver/15">
            {([
              ["Patient", patientName],
              ["Service", service.name],
              ["Duration", `About ${durationLabel(service.duration_minutes)}`],
              ["Dentist", dentist ? dentist.display_name : "First available dentist"],
              ["Date", fmtDateTz(chosen.start, timezone)],
              ["Time", `${fmtSlot(chosen.start, timezone)} to ${fmtSlot(chosen.end, timezone)}`],
            ] as const).map(([k, v]) => (
              <div key={k} className="grid gap-1 py-3 sm:grid-cols-[9rem_1fr]">
                <dt className="text-muted">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>

          {needsApproval && (
            <p className="rounded-md border border-silver/30 bg-white/5 px-4 py-3 text-sm text-silver">
              This appointment needs staff approval. It will show as pending, and you will be notified once it is confirmed. Your QR ticket appears after confirmation.
            </p>
          )}

          <form action={action} className="space-y-5">
            <input type="hidden" name="service_id" value={serviceId} />
            <input type="hidden" name="dentist_id" value={dentistId} />
            <input type="hidden" name="start" value={chosen.start} />
            {current && <input type="hidden" name="appointment_id" value={current.id} />}
            {returnTo && <input type="hidden" name="return" value={returnTo} />}
            {mode === "book" && (
              <div>
                <label htmlFor="notes" className="mb-1.5 block text-sm text-silver">Note for the clinic <span className="text-muted">(optional)</span></label>
                <textarea id="notes" name="notes" rows={3} maxLength={500} className="field" />
              </div>
            )}
            <div className="flex flex-wrap gap-3">
              <SubmitButton className="btn-primary" pending={mode === "book" ? "Booking..." : "Updating..."}>
                {mode === "book" ? "Confirm appointment" : "Confirm new time"}
              </SubmitButton>
              <button type="button" className="btn-ghost" onClick={() => setStep(2)}>Change time</button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
