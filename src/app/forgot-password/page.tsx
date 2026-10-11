import AuthShell from "@/components/AuthShell";
import ForgotForm from "@/components/ForgotForm";

export const metadata = { title: "Reset Password" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell title="Reset your password" intro="Enter the email you registered with and we will send a reset link.">
      <ForgotForm />
    </AuthShell>
  );
}
