import DashboardNav from "@/components/DashboardNav";
import { logoutAction } from "@/app/actions/auth";
import { getSessionContext } from "@/lib/dashboard";

export const metadata = { title: "Dashboard", robots: { index: false } };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { sb, user } = await getSessionContext();
  const { count } = await sb.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("read_at", null);

  return (
    <div className="dash-shell mx-auto grid max-w-6xl grid-cols-1 gap-4 px-5 py-6 sm:px-8 lg:grid-cols-[15rem_1fr] lg:gap-8 lg:py-14">
      <div className="min-w-0 overflow-x-auto lg:overflow-visible">
        <DashboardNav unread={count ?? 0}>
          <form action={logoutAction}>
            <button type="submit" className="w-full whitespace-nowrap rounded-md border-l-2 border-transparent px-3 py-2 text-left text-[0.95rem] text-silver transition-colors hover:bg-white/5 hover:text-snow">
              Log Out
            </button>
          </form>
        </DashboardNav>
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
