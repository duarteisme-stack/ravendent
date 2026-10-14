import { redirect } from "next/navigation";

// Older tickets linked here; scanning now lives in the admin dashboard.
export default function VerifyRedirect() {
  redirect("/admin/scan");
}
