import MedicalForm from "@/components/MedicalForm";
import MeTabs from "@/components/MeTabs";
import { getSessionContext } from "@/lib/dashboard";
import { safeNext } from "@/lib/validation";

export const metadata = { title: "Medical Information" };

export default async function MedicalPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { sb, user } = await getSessionContext();
  const sp = await searchParams;
  const { data } = await sb.from("medical_information").select("*").eq("user_id", user.id).maybeSingle();

  const defaults: Record<string, string> = {
    allergies: data?.allergies ?? "",
    conditions: data?.conditions ?? "",
    medications: data?.medications ?? "",
    previous_dental_concerns: data?.previous_dental_concerns ?? "",
  };

  return (
    <div className="max-w-2xl space-y-6">
      <header className="space-y-5">
        <h1 className="text-5xl sm:text-6xl">Medical information</h1>
        <MeTabs current="/dashboard/medical" />
        <p className="text-muted">Your dentist uses this to choose safe materials and medication.</p>
      </header>
      <MedicalForm defaults={defaults} hasConsent={Boolean(data?.health_data_consent_at)} next={sp.next ? safeNext(sp.next) : undefined} />
    </div>
  );
}
