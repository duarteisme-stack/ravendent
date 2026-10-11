import PatientProfileForm from "@/components/PatientProfileForm";
import { getSessionContext } from "@/lib/dashboard";
import { safeNext } from "@/lib/validation";

export const metadata = { title: "Patient Profile" };

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { sb, user, profile } = await getSessionContext();
  const sp = await searchParams;
  const { data } = await sb.from("patient_profiles").select("*").eq("user_id", user.id).maybeSingle();

  const defaults: Record<string, string> = {
    legal_name: data?.legal_name ?? profile?.full_name ?? "",
    date_of_birth: data?.date_of_birth ?? "",
    phone: data?.phone ?? profile?.phone ?? "",
    address: data?.address ?? "",
    emergency_contact_name: data?.emergency_contact_name ?? "",
    emergency_contact_phone: data?.emergency_contact_phone ?? "",
    reason_for_consultation: data?.reason_for_consultation ?? "",
  };

  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <h1 className="text-5xl">Patient profile</h1>
        <p className="mt-2 text-muted">
          We ask only for what the clinic needs to treat you safely and reach you. You can review and update everything here.
        </p>
      </header>
      <PatientProfileForm defaults={defaults} hasConsent={Boolean(data?.privacy_consent_at)} next={sp.next ? safeNext(sp.next) : undefined} />
    </div>
  );
}
