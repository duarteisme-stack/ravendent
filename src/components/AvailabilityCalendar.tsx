"use client";

import Link from "next/link";
import { useState } from "react";
import MonthGrid from "./MonthGrid";
import { durationLabel, fmtSlot, longDate } from "@/lib/format";
import { useAvailability } from "@/lib/useAvailability";
import type { Dentist, Service } from "@/lib/clinic";

type Props = { services: Service[]; dentists: Dentist[]; timezone: string; horizonDays: number };

export default function AvailabilityCalendar({ services, dentists, timezone, horizonDays }: Props) {
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [dentistId, setDentistId] = useState("");
  const a = useAvailability({ serviceId, dentistId, timezone, horizonDays });
  const service = services.find((s) => s.id === serviceId);

  if (services.length === 0) {
    return <div className="panel p-8 text-center text-muted">No dental services are available for booking right now. Please contact the clinic.</div>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
      <div className="panel p-5 sm:p-7">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="cal-service" className="mb-1.5 block text-sm text-silver">Service</label>
            <select id="cal-service" className="field" value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
              {services.map((s) => <option key={s.id} value={s.id}>{s.name} ({durationLabel(s.duration_minutes)})</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="cal-dentist" className="mb-1.5 block text-sm text-silver">Dentist</label>
            <select id="cal-dentist" className="field" value={dentistId} onChange={(e) => setDentistId(e.target.value)}>
              <option value="">Any available dentist</option>
              {dentists.map((d) => <option key={d.id} value={d.id}>{d.display_name}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-7">
          <MonthGrid view={a.view} days={a.days} today={a.today} selected={a.selected} loading={a.loadingMonth}
            atMin={a.atMin} atMax={a.atMax} onShift={a.shift} onSelect={a.setSelected} />
        </div>
      </div>

      <div className="panel flex flex-col p-5 sm:p-7" aria-live="polite">
        {a.error && <p role="alert" className="mb-4 rounded-md border border-crimson/60 bg-crimson/10 px-3 py-2 text-sm">{a.error}</p>}

        {!a.selected ? (
          <div className="my-auto py-10 text-center">
            <h3 className="text-3xl">Pick a date</h3>
            <p className="mx-auto mt-2 max-w-xs text-muted">
              Choose a day on the calendar to see the times that fit {service ? `a ${durationLabel(service.duration_minutes)} ${service.name.toLowerCase()}` : "your appointment"}.
            </p>
          </div>
        ) : (
          <>
            <h3 className="text-3xl">{longDate(a.selected)}</h3>
            {service && (
              <p className="mt-1 text-sm text-muted">
                {service.name}, about {durationLabel(service.duration_minutes)}. Times are in clinic local time ({timezone.replace("_", " ")}).
              </p>
            )}
            {a.loadingSlots ? (
              <p className="mt-8 text-muted">Loading times...</p>
            ) : a.slots.length === 0 ? (
              <div className="mt-8 rounded-md border border-silver/15 bg-charcoal p-5">
                <p className="font-medium">No times left on this day.</p>
                <p className="mt-1 text-sm text-muted">It may be fully booked, or too close to the start time for this service. Try another date or dentist.</p>
              </div>
            ) : (
              <ul className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {a.slots.map((s) => (
                  <li key={s.start}>
                    <Link
                      href={`/book?service=${serviceId}&start=${encodeURIComponent(s.start)}${dentistId ? `&dentist=${dentistId}` : ""}`}
                      className="block rounded-md border border-silver/30 px-3 py-2.5 text-center font-medium transition-colors hover:border-crimson-light hover:bg-crimson/20"
                    >
                      {fmtSlot(s.start, timezone)}
                      <span className="block text-xs font-normal text-muted">until {fmtSlot(s.end, timezone)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        <p className="mt-auto pt-8 text-sm text-muted">
          Anyone can view open times. You need an account to reserve one.{" "}
          <Link href="/register" className="text-crimson-light underline underline-offset-4 hover:text-snow">Create an account</Link>{" "}
          or <Link href="/login" className="text-crimson-light underline underline-offset-4 hover:text-snow">log in</Link>.
        </p>
      </div>
    </div>
  );
}
