import { Card, Check, Confirm, Empty, Flash, Input, PageHead, Textarea } from "@/components/admin/UI";
import { deleteServiceAction, saveServiceAction } from "@/app/actions/admin";
import { requireStaff } from "@/lib/admin";
import { durationLabel, pesoRange } from "@/lib/format";

export const metadata = { title: "Services" };

type Svc = {
  id: string; name: string; description: string | null; price_min: number | null; price_max: number | null; duration_minutes: number;
  prep_instructions: string | null; requires_approval: boolean; is_active: boolean; sort_order: number;
};

function ServiceForm({ s, prefix }: { s?: Svc; prefix: string }) {
  return (
    <form action={saveServiceAction} className="space-y-4">
      {s && <input type="hidden" name="id" value={s.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Input name="name" label="Service name" defaultValue={s?.name} required idPrefix={prefix} />
        <Input name="duration_minutes" label="Duration (minutes)" type="number" min={5} max={480} step={5} defaultValue={s?.duration_minutes ?? 30} required idPrefix={prefix}
          hint="Time reserved on the doctor's schedule. Availability updates immediately." />
        <Input name="price_min" label="Starting price (PHP)" type="number" min={0} step="any" defaultValue={s?.price_min} optional idPrefix={prefix} />
        <Input name="price_max" label="Highest price (PHP)" type="number" min={0} step="any" defaultValue={s?.price_max} optional idPrefix={prefix} />
      </div>
      <Textarea name="description" label="Description" defaultValue={s?.description} optional rows={2} idPrefix={prefix} />
      <Textarea name="prep_instructions" label="Preparation instructions" defaultValue={s?.prep_instructions} optional rows={2} idPrefix={prefix} />
      <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
        <div className="w-28"><Input name="sort_order" label="Order" type="number" defaultValue={s?.sort_order ?? 0} idPrefix={prefix} /></div>
        <Check name="requires_approval" label="Needs staff approval before confirming" defaultChecked={s?.requires_approval} idPrefix={prefix} />
        <Check name="is_active" label="Shown on the website and bookable" defaultChecked={s?.is_active ?? true} idPrefix={prefix} />
      </div>
      <button type="submit" className="adm-btn-primary">{s ? "Save changes" : "Add service"}</button>
    </form>
  );
}

export default async function ServicesPage({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const sp = await searchParams;
  const { sb } = await requireStaff(["admin"]);
  const { data } = await sb.from("dental_services").select("*").order("sort_order").order("name");
  const services = (data ?? []) as Svc[];

  return (
    <>
      <PageHead title="Services" sub="Add, edit, or remove treatments and set how long each one reserves on the schedule." />
      <Flash ok={sp.ok} err={sp.err} />

      <details className="adm-card mb-6 p-5 sm:p-6">
        <summary className="cursor-pointer text-xl">Add a service</summary>
        <div className="mt-5"><ServiceForm prefix="new-" /></div>
      </details>

      {services.length === 0 ? <Empty>No services yet.</Empty> : (
        <ul className="space-y-3">
          {services.map((s) => (
            <li key={s.id} className="adm-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="flex flex-wrap items-center gap-3 text-2xl">{s.name}
                    {!s.is_active && <span className="adm-pill">Hidden</span>}
                    {s.requires_approval && <span className="adm-pill">Needs approval</span>}
                  </h2>
                  <p className="mt-1 text-sm text-silver">{durationLabel(s.duration_minutes)}{pesoRange(s.price_min, s.price_max) ? `, ${pesoRange(s.price_min, s.price_max)}` : ""}</p>
                  {s.description && <p className="mt-1 text-sm text-muted">{s.description}</p>}
                </div>
                <Confirm action={deleteServiceAction} fields={{ id: s.id }} label="Delete" button="Yes, delete service"
                  message="Delete this service for good? If it has appointments you will be asked to hide it instead." />
              </div>
              <details className="mt-4">
                <summary className="adm-btn-ghost inline-flex cursor-pointer list-none">Edit</summary>
                <div className="mt-4 border-t border-night-line pt-5"><ServiceForm s={s} prefix={`${s.id}-`} /></div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
