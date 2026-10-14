import AccountForm from "@/components/AccountForm";
import MeTabs from "@/components/MeTabs";
import ResetForm from "@/components/ResetForm";
import { logoutAction } from "@/app/actions/auth";
import { getSessionContext } from "@/lib/dashboard";

export const metadata = { title: "Account" };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ updated?: string }> }) {
  const { user, profile } = await getSessionContext();
  const sp = await searchParams;

  return (
    <div className="max-w-xl space-y-10">
      <header className="space-y-5">
        <h1 className="text-5xl sm:text-6xl">Account</h1>
        <MeTabs current="/dashboard/settings" />
      </header>
      {sp.updated === "password" && (
        <p role="status" className="rounded-md border border-emerald/60 bg-emerald/10 px-3 py-2.5 text-sm">Password updated. Other devices have been signed out.</p>
      )}
      <section aria-labelledby="contact" className="panel p-5 sm:p-6">
        <h2 id="contact" className="mb-5 text-3xl">Contact details</h2>
        <AccountForm fullName={profile?.full_name ?? ""} phone={profile?.phone ?? ""} email={profile?.email ?? user.email ?? ""} />
      </section>
      <section aria-labelledby="password" className="panel p-5 sm:p-6">
        <h2 id="password" className="mb-5 text-3xl">Change password</h2>
        <ResetForm />
      </section>
      <form action={logoutAction}>
        <button type="submit" className="btn-ghost w-full sm:w-auto">Log out</button>
      </form>
    </div>
  );
}
