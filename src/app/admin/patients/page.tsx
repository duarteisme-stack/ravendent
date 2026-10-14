import Link from "next/link";
import { Empty, PageHead } from "@/components/admin/UI";
import { requireStaff } from "@/lib/admin";

export const metadata = { title: "Patients" };

type P = { id: string; full_name: string; email: string; phone: string | null; created_at: string };

export default async function PatientsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const sp = await searchParams;
  const { sb, role } = await requireStaff();
  const q = (sp.q ?? "").replace(/[^A-Za-z0-9 .@_-]/g, "").trim().slice(0, 60);

  let people: P[] = [];
  if (role === "dentist") {
    // Dentists only see patients who have an appointment with them (appointments are already limited to their own).
    const { data: appts } = await sb.from("appointments").select("patient_id").limit(500);
    const ids = [...new Set((appts ?? []).map((a) => a.patient_id))];
    if (ids.length) {
      let qq = sb.from("profiles").select("id, full_name, email, phone, created_at").in("id", ids).order("full_name");
      if (q) qq = qq.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);
      people = ((await qq.limit(100)).data ?? []) as P[];
    }
  } else {
    let qq = sb.from("profiles").select("id, full_name, email, phone, created_at").eq("role", "customer").order("created_at", { ascending: false });
    if (q) qq = qq.or(`full_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`);
    people = ((await qq.limit(100)).data ?? []) as P[];
  }

  return (
    <>
      <PageHead title="Patients" sub={role === "dentist" ? "Patients who have an appointment with you." : "Everyone who has registered. Showing the latest 100."} />
      <form action="/admin/patients" className="mb-5 flex gap-2">
        <label className="sr-only" htmlFor="q">Search patients</label>
        <input id="q" name="q" defaultValue={q} placeholder="Search name, email, or phone" className="field max-w-md" />
        <button className="adm-btn-ghost" type="submit">Search</button>
      </form>
      {people.length === 0 ? <Empty>No patients found.</Empty> : (
        <ul className="space-y-2">
          {people.map((p) => (
            <li key={p.id}>
              <Link href={`/admin/patients/${p.id}`} className="adm-card flex flex-wrap items-center justify-between gap-2 p-4 transition-colors hover:border-[#8b5cf6]/60">
                <span className="min-w-0"><span className="block truncate text-lg">{p.full_name || "Unnamed"}</span><span className="block truncate text-sm text-silver">{p.email}</span></span>
                <span className="text-sm text-muted">{p.phone ?? ""}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
