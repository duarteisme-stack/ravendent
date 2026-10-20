import { redirect } from "next/navigation";
import DashboardNav from "@/components/DashboardNav";
import { logoutAction } from "@/app/actions/auth";
import { getSessionContext } from "@/lib/dashboard";

export const metadata = { title: "Dashboard", robots: { index: false } };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { sb, user, profile } = await getSessionContext();
  // Admins, receptionists, and dentists run the clinic from the admin dashboard; the patient area is for patients.
  if (profile?.role && profile.role !== "customer") redirect("/admin");
  const { count } = await sb.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("read_at", null);

  return (
    <div className="dash-shell mx-auto grid max-w-5xl gap-10 px-5 pb-32 pt-8 sm:px-8 lg:grid-cols-[13rem_1fr] lg:pb-16 lg:pt-12">
      <DashboardNav unread={count ?? 0}>
        <form action={logoutAction}>
          <button type="submit" className="w-full rounded-lg px-3 py-2.5 text-left text-silver transition-colors hover:bg-white/5 hover:text-snow">Log out</button>
        </form>
      </DashboardNav>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
