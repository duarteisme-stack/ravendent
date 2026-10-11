import AuthShell from "@/components/AuthShell";
import RegisterForm from "@/components/RegisterForm";

export const metadata = { title: "Create Account" };

export default function RegisterPage() {
  return (
    <AuthShell title="Create your account" intro="One account lets you book, reschedule, and keep your appointment tickets. You will complete a short patient profile before your first booking.">
      <RegisterForm />
    </AuthShell>
  );
}
