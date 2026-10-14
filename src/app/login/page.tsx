import AuthShell from "@/components/AuthShell";
import LoginForm from "@/components/LoginForm";
import { safeNext } from "@/lib/validation";

export const metadata = { title: "Log In" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string; reset?: string }> }) {
  const sp = await searchParams;
  const notice =
    sp.error === "link" ? "That link is invalid or has expired. Log in, or request a new one."
    : sp.next ? "Log in to continue. Anyone can view open times, but booking needs an account."
    : undefined;
  return (
    <AuthShell title="Log in" intro="Welcome back to RavenDent.">
      <LoginForm next={sp.next ? safeNext(sp.next) : ""} notice={notice} />
    </AuthShell>
  );
}
