import MedicalForm from "@/components/MedicalForm";
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
      <header>
        <h1 className="text-5xl">Medical information</h1>
        <p className="mt-2 text-muted">Your dentist uses this to choose safe materials, anesthesia, and medication. Keep it current.</p>
      </header>
      <MedicalForm defaults={defaults} hasConsent={Boolean(data?.health_data_consent_at)} next={sp.next ? safeNext(sp.next) : undefined} />
    </div>
  );
}
