"use client";

import { longDate } from "@/lib/format";
import type { DayStatus } from "@/lib/useAvailability";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const pad = (n: number) => String(n).padStart(2, "0");

const STATUS_LABEL: Record<DayStatus, string> = {
  available: "Available",
  partial: "Partially booked",
  full: "Fully booked",
  closed: "Closed",
};

type Props = {
  view: { y: number; m: number };
  days: Record<string, DayStatus>;
  today: string;
  selected: string | null;
  loading: boolean;
  atMin: boolean;
  atMax: boolean;
  onShift: (delta: number) => void;
  onSelect: (ymd: string) => void;
};

const navBtn =
  "rounded-md border border-silver/25 px-3 py-1.5 text-silver transition-colors hover:border-silver hover:text-snow disabled:cursor-not-allowed disabled:opacity-30";

export default function MonthGrid({ view, days, today, selected, loading, atMin, atMax, onShift, onSelect }: Props) {
  const firstWeekday = new Date(Date.UTC(view.y, view.m, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate();
  const cells: (number | null)[] = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  return (
    <div>
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => onShift(-1)} disabled={atMin} aria-label="Previous month" className={navBtn}>Prev</button>
        <h3 className="text-3xl" aria-live="polite">{MONTHS[view.m]} {view.y}</h3>
        <button type="button" onClick={() => onShift(1)} disabled={atMax} aria-label="Next month" className={navBtn}>Next</button>
      </div>

      <div className={`mt-4 transition-opacity ${loading ? "opacity-50" : ""}`} aria-busy={loading}>
        <div className="grid grid-cols-7 gap-1.5 pb-2 text-center text-xs text-muted" aria-hidden="true">
          {WEEKDAYS.map((w) => <div key={w}>{w}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {cells.map((day, i) => {
            if (day === null) return <div key={`b${i}`} />;
            const ymd = `${view.y}-${pad(view.m + 1)}-${pad(day)}`;
            const status: DayStatus | undefined = days[ymd];
            const isToday = ymd === today;
            const isSelected = ymd === selected;
            const disabled = !status || status === "closed";
            const tone =
              status === "available" ? "border-emerald/60 text-snow hover:bg-emerald/15"
              : status === "partial" ? "border-silver/50 text-snow hover:bg-white/10"
              : status === "full" ? "border-crimson/50 text-muted hover:bg-crimson/10"
              : "border-transparent text-muted/40";
            return (
              <button
                key={ymd}
                type="button"
                disabled={disabled}
                onClick={() => onSelect(ymd)}
                aria-pressed={isSelected}
                aria-label={`${longDate(ymd)}${isToday ? ", today" : ""}, ${status ? STATUS_LABEL[status] : "loading"}`}
                className={`relative flex aspect-square flex-col items-center justify-center rounded-md border text-sm transition-colors disabled:cursor-not-allowed ${tone} ${isSelected ? "!bg-crimson !border-crimson !text-snow shadow-glow" : ""} ${isToday ? "ring-1 ring-silver ring-offset-2 ring-offset-slate" : ""}`}
              >
                <span className="font-medium">{day}</span>
                {status && status !== "closed" && (
                  <span aria-hidden="true" className={`mt-0.5 h-1.5 w-1.5 rounded-full ${
                    status === "available" ? "bg-emerald-light" : status === "partial" ? "bg-silver" : "bg-crimson-light"}`} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted">
        <li className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-light" />Available</li>
        <li className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-silver" />Partially booked</li>
        <li className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-crimson-light" />Fully booked</li>
        <li className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full border border-muted/50" />Closed</li>
        <li className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm ring-1 ring-silver" />Today</li>
      </ul>
    </div>
  );
}
