import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";

export function supabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/** Per-request Supabase client bound to the user's session cookies (RLS applies as that user). */
export async function createSupabaseServer() {
  const cookieStore = await cookies(); // read first so the page is always rendered per request, never at build time
  if (!supabaseConfigured()) {
    // Shows up in the Vercel function logs (browsers only see a generic error page).
    throw new Error("Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in the Vercel project settings, then redeploy.");
  }
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component: middleware refreshes the session instead.
        }
      },
    },
  });
}

/** Absolute site URL for email links. Prefer the explicit env var, fall back to the request host. */
export async function siteUrl(): Promise<string> {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env) return env.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export const PHOTO_BUCKET = "patient-photos";

/** Short-lived link to a patient's photo, or null when they have none. Works for the owner and for clinic staff (storage RLS). */
export async function getPhotoUrl(sb: Awaited<ReturnType<typeof createSupabaseServer>>, userId: string): Promise<string | null> {
  const { data, error } = await sb.storage.from(PHOTO_BUCKET).createSignedUrl(`${userId}/profile.jpg`, 3600);
  return error ? null : data?.signedUrl ?? null;
}
