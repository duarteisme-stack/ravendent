import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/AppointmentList";
import { Card, Empty, PageHead } from "@/components/admin/UI";
import { requireStaff } from "@/lib/admin";
import { getClinicData } from "@/lib/clinic";
import { fmtDateTz, fmtSlot } from "@/lib/format";
import { getPhotoUrl } from "@/lib/supabase-server";

export const metadata = { title: "Patient" };

type Appt = { id: string; reference: string; starts_at: string; ends_at: string; status: "pending" | "confirmed" | "cancelled" | "completed" | "no_show"; dental_services: { name: string } | null; dentists: { display_name: string } | null };

const Row = ({ k, v }: { k: string; v: string | null | undefined }) => (
  <div className="grid gap-1 py-2.5 sm:grid-cols-[11rem_1fr]"><dt className="text-sm text-muted">{k}</dt><dd className="whitespace-pre-line">{v || "Not provided"}</dd></div>
);

export default async function PatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { sb, role } = await requireStaff();
  const { settings } = await getClinicData();

  const { data: appts } = await sb.from("appointments").select("id, reference, starts_at, ends_at, status, dental_services(name), dentists(display_name)")
    .eq("patient_id", id).order("starts_at", { ascending: false }).limit(50);
  if (role === "dentist" && !(appts ?? []).length) notFound(); // dentists only see their own patients

  const [{ data: prof }, { data: pat }, med] = await Promise.all([
    sb.from("profiles").select("full_name, email, phone, created_at").eq("id", id).maybeSingle(),
    sb.from("patient_profiles").select("*").eq("user_id", id).maybeSingle(),
    role === "receptionist" ? Promise.resolve({ data: null }) : sb.from("medical_information").select("*").eq("user_id", id).maybeSingle(),
  ]);
  if (!prof) notFound();
  const list = (appts ?? []) as unknown as Appt[];
  const photo = await getPhotoUrl(sb, id);

  return (
    <>
      <Link href="/admin/patients" className="text-sm text-silver hover:text-snow">Back to patients</Link>
      <div className="mt-2 flex items-center gap-5">
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="Patient photo" className="mb-6 h-20 w-20 shrink-0 rounded-full border border-night-line object-cover" />
        )}
        <div className="min-w-0 flex-1"><PageHead title={pat?.legal_name || prof.full_name || "Patient"} sub={`Registered ${fmtDateTz(prof.created_at, settings.timezone)}`} /></div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="mb-2 text-2xl">Contact</h2>
          <dl className="divide-y divide-night-line">
            <Row k="Email" v={prof.email} /><Row k="Phone" v={pat?.phone ?? prof.phone} />
            <Row k="Date of birth" v={pat?.date_of_birth} /><Row k="Address" v={pat?.address} />
            <Row k="Emergency contact" v={pat ? `${pat.emergency_contact_name}, ${pat.emergency_contact_phone}` : null} />
            <Row k="Reason for visit" v={pat?.reason_for_consultation} />
          </dl>
        </Card>

        <Card>
          <h2 className="mb-2 text-2xl">Medical information</h2>
          {role === "receptionist" ? (
            <p className="text-sm text-muted">Medical information is only visible to dentists and admins.</p>
          ) : !med.data ? <p className="text-sm text-muted">The patient has not added medical information.</p> : (
            <dl className="divide-y divide-night-line">
              <Row k="Allergies" v={med.data.allergies} /><Row k="Conditions" v={med.data.conditions} />
              <Row k="Medications" v={med.data.medications} /><Row k="Previous concerns" v={med.data.previous_dental_concerns} />
            </dl>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="mb-4 text-2xl">Appointments</h2>
          {list.length === 0 ? <Empty>No appointments yet.</Empty> : (
            <ul className="divide-y divide-night-line">
              {list.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div><p>{a.dental_services?.name} with {a.dentists?.display_name}</p><p className="text-sm text-silver">{fmtDateTz(a.starts_at, settings.timezone)}, {fmtSlot(a.starts_at, settings.timezone)} to {fmtSlot(a.ends_at, settings.timezone)}</p><p className="text-xs text-muted">{a.reference}</p></div>
                  <StatusBadge status={a.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
