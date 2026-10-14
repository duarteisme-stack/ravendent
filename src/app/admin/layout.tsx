import AdminNav from "@/components/admin/AdminNav";
import { logoutAction } from "@/app/actions/auth";
import { NAV, requireStaff } from "@/lib/admin";

export const metadata = { title: "Admin", robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { sb, role, profile } = await requireStaff();
  const { count } = await sb.from("appointments").select("id", { count: "exact", head: true }).eq("status", "pending").gte("ends_at", new Date().toISOString());

  const groups = NAV.map((g) => ({ label: g.label, items: g.items.filter((i) => i.roles.includes(role)).map(({ href, label, badge }) => ({ href, label, badge })) })).filter((g) => g.items.length);

  return (
    <div className="adm fixed inset-0 z-[60] overflow-y-auto text-snow lg:flex">
      <AdminNav groups={groups} pending={count ?? 0} name={profile?.full_name || profile?.email || "Staff"} role={role}
        logout={<form action={logoutAction}><button type="submit" className="adm-btn-ghost !px-3 !py-1.5">Log out</button></form>} />
      <div className="min-h-screen min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-10">{children}</div>
    </div>
  );
}
