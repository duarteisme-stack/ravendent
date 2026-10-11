import Link from "next/link";
import AuthShell from "@/components/AuthShell";
import ResetForm from "@/components/ResetForm";
import { createSupabaseServer } from "@/lib/supabase-server";

export const metadata = { title: "Choose a New Password" };

export default async function ResetPasswordPage() {
  const sb = await createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();

  if (!user) {
    return (
      <AuthShell title="Link expired">
        <p className="text-muted">This reset link is invalid or has expired. Request a new one to continue.</p>
        <Link href="/forgot-password" className="btn-primary mt-6 w-full">Request a new link</Link>
      </AuthShell>
    );
  }
  return (
    <AuthShell title="Choose a new password">
      <ResetForm />
    </AuthShell>
  );
}
