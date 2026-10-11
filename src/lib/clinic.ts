import { getSupabase } from "./supabase";

export type ClinicSettings = {
  clinic_name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  timezone: string;
  booking_horizon_days: number;
  cancel_deadline_hours: number;
  reschedule_deadline_hours: number;
  require_approval: boolean;
};

export type ClinicHour = {
  weekday: number;
  is_closed: boolean;
  open_time: string | null;
  close_time: string | null;
  break_start: string | null;
  break_end: string | null;
};

export type Service = {
  id: string;
  name: string;
  description: string | null;
  price_min: number | null;
  price_max: number | null;
  duration_minutes: number;
  prep_instructions: string | null;
  requires_approval: boolean;
};

export type Dentist = {
  id: string;
  display_name: string;
  qualifications: string | null;
  bio: string | null;
  photo_url: string | null;
};

export type ClinicData = {
  configured: boolean;
  settings: ClinicSettings;
  hours: ClinicHour[];
  services: Service[];
  dentists: Dentist[];
};

const DEFAULT_SETTINGS: ClinicSettings = {
  clinic_name: "RavenDent",
  address: null,
  phone: null,
  email: null,
  timezone: "Asia/Manila",
  booking_horizon_days: 60,
  cancel_deadline_hours: 24,
  reschedule_deadline_hours: 24,
  require_approval: false,
};

/** Server-side fetch of everything the public homepage needs (all publicly readable via RLS). */
export async function getClinicData(): Promise<ClinicData> {
  const sb = getSupabase();
  const empty: ClinicData = { configured: false, settings: DEFAULT_SETTINGS, hours: [], services: [], dentists: [] };
  if (!sb) return empty;

  try {
    const [settings, hours, services, dentists] = await Promise.all([
      sb.from("clinic_settings").select("*").eq("id", 1).maybeSingle(),
      sb.from("clinic_hours").select("*").order("weekday"),
      sb.from("dental_services").select("*").eq("is_active", true).order("sort_order"),
      sb.from("dentists").select("*").eq("is_active", true).order("display_name"),
    ]);
    return {
      configured: true,
      settings: { ...DEFAULT_SETTINGS, ...(settings.data ?? {}) },
      hours: (hours.data ?? []) as ClinicHour[],
      services: (services.data ?? []) as Service[],
      dentists: (dentists.data ?? []) as Dentist[],
    };
  } catch (err) {
    console.error("getClinicData failed", err);
    return empty;
  }
}
