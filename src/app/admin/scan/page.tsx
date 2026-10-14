import QrScanner from "@/components/admin/QrScanner";
import { PageHead } from "@/components/admin/UI";
import { requireStaff } from "@/lib/admin";
import { getClinicData } from "@/lib/clinic";

export const metadata = { title: "Scan QR" };

export default async function ScanPage() {
  await requireStaff();
  const { settings } = await getClinicData();
  return (
    <>
      <PageHead title="Scan QR ticket" sub="Scan a patient's ticket to confirm the appointment is current. Tickets replaced by a reschedule or cancellation are reported as not valid." />
      <QrScanner timezone={settings.timezone} canComplete />
    </>
  );
}
