import { Card, Check, Empty, Flash, PageHead } from "@/components/admin/UI";
import { promoteByEmailAction, setRoleAction } from "@/app/actions/admin";
import { requireStaff } from "@/lib/admin";

export const metadata = { title: "Staff and roles" };

type P = { id: string; full_name: string; email: string; role: string; is_active: boolean };

export default async function StaffPage({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const sp = await searchParams;
  const { sb, user } = await requireStaff(["admin"]);
  const { data } = await sb.from("profiles").select("id, full_name, email, role, is_active").neq("role", "customer").order("role").order("full_name");
  const staff = (data ?? []) as P[];

  return (
    <>
      <PageHead title="Staff and roles" sub="Admins manage everything. Receptionists run appointments and patients (no medical data). Dentists see their own appointments and patients." />
      <Flash ok={sp.ok} err={sp.err} />

      <Card className="mb-6">
        <h2 className="mb-1 text-2xl">Give someone access</h2>
        <p className="mb-4 text-sm text-muted">They must have registered on the website first.</p>
        <form action={promoteByEmailAction} className="flex flex-wrap items-end gap-3">
          <div className="min-w-56 flex-1"><label htmlFor="email" className="mb-1.5 block text-sm text-silver">Their account email</label><input id="email" name="email" type="email" required className="field" /></div>
          <div><label htmlFor="role" className="mb-1.5 block text-sm text-silver">Role</label>
            <select id="role" name="role" className="field"><option value="receptionist">Receptionist</option><option value="dentist">Dentist</option><option value="admin">Admin</option></select></div>
          <button type="submit" className="adm-btn-primary">Give access</button>
        </form>
      </Card>

      {staff.length === 0 ? <Empty>No staff yet.</Empty> : (
        <ul className="space-y-3">
          {staff.map((p) => (
            <li key={p.id} className="adm-card p-4">
              <form action={setRoleAction} className="flex flex-wrap items-end justify-between gap-4">
                <input type="hidden" name="id" value={p.id} />
                <div className="min-w-0"><p className="truncate text-lg">{p.full_name || "Unnamed"}{p.id === user.id && <span className="adm-pill ml-2">You</span>}</p><p className="truncate text-sm text-silver">{p.email}</p></div>
                {p.id === user.id ? <p className="text-sm text-muted">You cannot change your own role.</p> : (
                  <div className="flex flex-wrap items-end gap-4">
                    <div><label htmlFor={`r-${p.id}`} className="mb-1 block text-xs text-muted">Role</label>
                      <select id={`r-${p.id}`} name="role" defaultValue={p.role} className="field w-auto">
                        <option value="admin">Admin</option><option value="receptionist">Receptionist</option><option value="dentist">Dentist</option><option value="customer">Remove access</option>
                      </select></div>
                    <Check name="is_active" label="Account active" defaultChecked={p.is_active} idPrefix={`${p.id}-`} />
                    <button type="submit" className="adm-btn-ghost">Save</button>
                  </div>
                )}
              </form>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
