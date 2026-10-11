"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getSupabase } from "./supabase";
import { todayInTz } from "./format";

export type DayStatus = "available" | "partial" | "full" | "closed";
export type Slot = { start: string; end: string };

const POLL_MS = 30_000;
const pad = (n: number) => String(n).padStart(2, "0");

type Opts = { serviceId: string; dentistId: string; timezone: string; horizonDays: number; excludeAppointmentId?: string };

/** Month + day availability from the server-authoritative RPCs, refreshed while the tab is visible. */
export function useAvailability({ serviceId, dentistId, timezone, horizonDays, excludeAppointmentId }: Opts) {
  const today = useMemo(() => todayInTz(timezone), [timezone]);
  const [ty, tm, td] = today.split("-").map(Number);

  const [view, setView] = useState({ y: ty, m: tm - 1 }); // m is 0-based
  const [days, setDays] = useState<Record<string, DayStatus>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsFor, setSlotsFor] = useState<string | null>(null);
  const [loadingMonth, setLoadingMonth] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const monthReq = useRef(0);
  const slotReq = useRef(0);

  const maxMonth = useMemo(() => {
    const end = new Date(Date.UTC(ty, tm - 1, td + horizonDays));
    return { y: end.getUTCFullYear(), m: end.getUTCMonth() };
  }, [ty, tm, td, horizonDays]);
  const atMin = view.y === ty && view.m === tm - 1;
  const atMax = view.y > maxMonth.y || (view.y === maxMonth.y && view.m >= maxMonth.m);

  const loadMonth = useCallback(async (silent = false) => {
    const sb = getSupabase();
    if (!sb || !serviceId) {
      setLoadingMonth(false);
      if (!sb) setError("Availability is temporarily unavailable. Please check back soon or contact the clinic.");
      return;
    }
    const id = ++monthReq.current;
    if (!silent) setLoadingMonth(true);
    const { data, error: err } = await sb.rpc("get_month_availability", {
      p_month: `${view.y}-${pad(view.m + 1)}-01`,
      p_service_id: serviceId,
      p_dentist_id: dentistId || null,
      p_exclude_appointment: excludeAppointmentId ?? null,
    });
    if (id !== monthReq.current) return;
    if (err) {
      console.error(err);
      setError("We could not load availability. Please try again in a moment.");
    } else {
      setError(null);
      const map: Record<string, DayStatus> = {};
      for (const r of (data ?? []) as { out_day: string; out_status: DayStatus }[]) map[r.out_day] = r.out_status;
      setDays(map);
    }
    setLoadingMonth(false);
  }, [view, serviceId, dentistId, excludeAppointmentId]);

  const loadSlots = useCallback(async (silent = false) => {
    const sb = getSupabase();
    if (!sb || !serviceId || !selected) return;
    const id = ++slotReq.current;
    if (!silent) setLoadingSlots(true);
    const { data, error: err } = await sb.rpc("get_available_slots", {
      p_date: selected,
      p_service_id: serviceId,
      p_dentist_id: dentistId || null,
      p_exclude_appointment: excludeAppointmentId ?? null,
    });
    if (id !== slotReq.current) return;
    if (err) {
      console.error(err);
      setError("We could not load times for this date. Please try again.");
    } else {
      const seen = new Map<string, Slot>();
      for (const r of (data ?? []) as { slot_start: string; slot_end: string }[]) {
        if (!seen.has(r.slot_start)) seen.set(r.slot_start, { start: r.slot_start, end: r.slot_end });
      }
      setSlots([...seen.values()].sort((a, b) => a.start.localeCompare(b.start)));
      setSlotsFor(selected);
    }
    setLoadingSlots(false);
  }, [selected, serviceId, dentistId, excludeAppointmentId]);

  useEffect(() => { void loadMonth(); }, [loadMonth]);
  useEffect(() => {
    if (selected) void loadSlots();
    else setSlots([]);
  }, [loadSlots, selected]);

  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void loadMonth(true);
      if (selected) void loadSlots(true);
    }, POLL_MS);
    return () => clearInterval(t);
  }, [loadMonth, loadSlots, selected]);

  const shift = (delta: number) => {
    setSelected(null);
    setView(({ y, m }) => {
      const d = new Date(Date.UTC(y, m + delta, 1));
      return { y: d.getUTCFullYear(), m: d.getUTCMonth() };
    });
  };

  /** Jump the calendar to the month of a date (YYYY-MM-DD) and select it. */
  const goToDate = (ymd: string) => {
    const [y, m] = ymd.split("-").map(Number);
    setView({ y, m: m - 1 });
    setSelected(ymd);
  };

  const refresh = () => { void loadMonth(true); void loadSlots(true); };

  return { today, view, shift, atMin, atMax, days, selected, setSelected, goToDate, slots, slotsFor, loadingMonth, loadingSlots, error, setError, refresh };
}
