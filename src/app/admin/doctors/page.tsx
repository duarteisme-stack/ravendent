import Link from "next/link";
import { Card, Check, Confirm, Empty, Flash, Input, PageHead, Textarea } from "@/components/admin/UI";
import { deleteDentistAction, saveDentistAction } from "@/app/actions/admin";
import { requireStaff } from "@/lib/admin";

export const metadata = { title: "Doctors" };

type Doc = { id: string; display_name: string; qualifications: string | null; bio: string | null; photo_url: string | null; is_active: boolean; profile_id: string | null };

function DoctorForm({ d, prefix }: { d?: Doc; prefix: string }) {
  return (
    <form action={saveDentistAction} className="space-y-4">
      {d && <input type="hidden" name="id" value={d.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Input name="display_name" label="Name" defaultValue={d?.display_name} required idPrefix={prefix} placeholder="Dr. Maria Santos" />
        <Input name="qualifications" label="Qualifications" defaultValue={d?.qualifications} optional idPrefix={prefix} placeholder="DMD, Orthodontics" />
        <Input name="photo_url" label="Photo link" type="url" defaultValue={d?.photo_url} optional idPrefix={prefix} hint="A picture address starting with https://" />
        <Input name="login_email" label="Login email" type="email" optional idPrefix={prefix}
          hint={d?.profile_id ? "Linked. Enter another email only to change it." : "Link their account so they can sign in and see their own appointments."} />
      </div>
      <Textarea name="bio" label="Short bio" defaultValue={d?.bio} optional rows={2} idPrefix={prefix} />
      <Check name="is_active" label="Shown on the website and bookable" defaultChecked={d?.is_active ?? true} idPrefix={prefix} />
      <button type="submit" className="adm-btn-primary">{d ? "Save changes" : "Add doctor"}</button>
    </form>
  );
}

export default async function DoctorsPage({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const sp = await searchParams;
  const { sb } = await requireStaff(["admin"]);
  const { data } = await sb.from("dentists").select("*").order("display_name");
  const doctors = (data ?? []) as Doc[];

  return (
    <>
      <PageHead title="Doctors and times" sub="Add doctors, edit their details, and set the days and hours each one works." />
      <Flash ok={sp.ok} err={sp.err} />

      <details className="adm-card mb-6 p-5 sm:p-6">
        <summary className="cursor-pointer text-xl">Add a doctor</summary>
        <div className="mt-5"><DoctorForm prefix="new-" /></div>
      </details>

      {doctors.length === 0 ? <Empty>No doctors yet. Patients cannot book until a doctor has working times.</Empty> : (
        <ul className="space-y-3">
          {doctors.map((d) => (
            <li key={d.id} className="adm-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-4">
                  {d.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={d.photo_url} alt="" className="h-14 w-14 shrink-0 rounded-full border border-night-line object-cover" />
                  ) : (
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-night-line bg-night font-display text-xl text-silver" aria-hidden="true">
                      {d.display_name.replace(/^Dr\.?\s*/i, "").split(" ").map((p) => p[0]).slice(0, 2).join("")}
                    </span>
                  )}
                  <div className="min-w-0">
                    <h2 className="flex flex-wrap items-center gap-3 text-2xl">{d.display_name}{!d.is_active && <span className="adm-pill">Hidden</span>}</h2>
                    {d.qualifications && <p className="text-sm text-silver">{d.qualifications}</p>}
                    <p className="text-xs text-muted">{d.profile_id ? "Has a login account" : "No login account linked"}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/admin/doctors/${d.id}`} className="adm-btn-primary">Working times</Link>
                  <Confirm action={deleteDentistAction} fields={{ id: d.id }} label="Delete" button="Yes, delete doctor"
                    message="Delete this doctor and their working times? If they have appointments you will be asked to hide them instead." />
                </div>
              </div>
              <details className="mt-4">
                <summary className="adm-btn-ghost inline-flex cursor-pointer list-none">Edit details</summary>
                <div className="mt-4 border-t border-night-line pt-5"><DoctorForm d={d} prefix={`${d.id}-`} /></div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
