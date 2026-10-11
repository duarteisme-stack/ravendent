import AccountForm from "@/components/AccountForm";
import ResetForm from "@/components/ResetForm";
import { getSessionContext } from "@/lib/dashboard";

export const metadata = { title: "Account Settings" };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ updated?: string }> }) {
  const { user, profile } = await getSessionContext();
  const sp = await searchParams;

  return (
    <div className="max-w-xl space-y-12">
      <h1 className="text-5xl">Account settings</h1>
      {sp.updated === "password" && (
        <p role="status" className="rounded-md border border-emerald/60 bg-emerald/10 px-3 py-2.5 text-sm">Password updated. Other devices have been signed out.</p>
      )}
      <section aria-labelledby="contact">
        <h2 id="contact" className="mb-5 text-3xl">Contact details</h2>
        <AccountForm fullName={profile?.full_name ?? ""} phone={profile?.phone ?? ""} email={profile?.email ?? user.email ?? ""} />
      </section>
      <section aria-labelledby="password">
        <h2 id="password" className="mb-5 text-3xl">Change password</h2>
        <ResetForm />
      </section>
    </div>
  );
}
