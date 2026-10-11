import type { ClinicHour } from "@/lib/clinic";
import { WEEKDAY_NAMES, fmtTime12 } from "@/lib/format";

export default function Hours({ hours }: { hours: ClinicHour[] }) {
  const ordered = [1, 2, 3, 4, 5, 6, 0]
    .map((d) => hours.find((h) => h.weekday === d))
    .filter((h): h is ClinicHour => Boolean(h));

  if (ordered.length === 0) return <p className="text-muted">Opening hours will be posted soon.</p>;

  return (
    <dl className="divide-y divide-silver/10">
      {ordered.map((h) => (
        <div key={h.weekday} className="flex flex-wrap items-baseline justify-between gap-x-4 py-3">
          <dt className="text-silver">{WEEKDAY_NAMES[h.weekday]}</dt>
          <dd className="text-right">
            {h.is_closed ? (
              <span className="text-muted">Closed</span>
            ) : (
              <>
                {fmtTime12(h.open_time)} to {fmtTime12(h.close_time)}
                {h.break_start && h.break_end && (
                  <span className="block text-xs text-muted">
                    Break {fmtTime12(h.break_start)} to {fmtTime12(h.break_end)}
                  </span>
                )}
              </>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
