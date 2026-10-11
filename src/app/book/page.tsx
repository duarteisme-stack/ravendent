import { redirect } from "next/navigation";
import BookingWizard from "@/components/BookingWizard";
import { getClinicData } from "@/lib/clinic";
import { getSessionContext } from "@/lib/dashboard";

export const metadata = { title: "Book an Appointment" };

type SP = { service?: string; start?: string; dentist?: string };

export default async function BookPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { sb, user } = await getSessionContext();

  const qs = new URLSearchParams();
  if (sp.service) qs.set("service", sp.service);
  if (sp.start) qs.set("start", sp.start);
  if (sp.dentist) qs.set("dentist", sp.dentist);
  const here = `/book${qs.size ? `?${qs}` : ""}`;

  // Required profile first; each form sends the user back here when saved.
  const [patient, medical] = await Promise.all([
    sb.from("patient_profiles").select("legal_name").eq("user_id", user.id).maybeSingle(),
    sb.from("medical_information").select("user_id").eq("user_id", user.id).maybeSingle(),
  ]);
  if (!patient.data) redirect(`/dashboard/profile?next=${encodeURIComponent(here)}`);
  if (!medical.data) redirect(`/dashboard/medical?next=${encodeURIComponent(here)}`);

  const { settings, services, dentists } = await getClinicData();
  const serviceId = services.find((s) => s.id === sp.service)?.id ?? "";
  const dentistId = dentists.find((d) => d.id === sp.dentist)?.id ?? "";
  const start = sp.start && !Number.isNaN(Date.parse(sp.start)) && serviceId ? sp.start : undefined;

  return (
    <section className="mx-auto max-w-5xl px-5 py-12 sm:px-8 sm:py-16">
      <h1 className="text-5xl">Book an appointment</h1>
      <p className="mb-10 mt-2 max-w-xl text-muted">Choose a service, pick a time that fits, and confirm. Your ticket is ready as soon as the booking is saved.</p>
      {services.length === 0 ? (
        <div className="panel p-6 text-muted">No services are open for booking right now. Please contact the clinic.</div>
      ) : (
        <BookingWizard
          mode="book"
          services={services}
          dentists={dentists}
          timezone={settings.timezone}
          horizonDays={settings.booking_horizon_days}
          requireApproval={settings.require_approval}
          patientName={patient.data.legal_name}
          initial={{ serviceId, dentistId, start }}
        />
      )}
    </section>
  );
}
