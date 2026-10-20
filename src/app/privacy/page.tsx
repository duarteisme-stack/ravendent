// TEMPLATE: summarizes how this app handles data. Have the clinic's Data Protection Officer or counsel review and complete it
// (controller identity, retention periods, DPO contact, NPC registration) before going live.
export const metadata = { title: "Privacy Notice" };

const SECTIONS = [
  ["What we collect", "Account details (name, email, mobile number), patient details (date of birth, contact and emergency contact, optional address, reason for visit), and health information you choose to share (allergies, conditions, medications, previous dental concerns). We also keep appointment records and a history of changes to them."],
  ["Your photo","A photo is optional. If you add one (an upload or a selfie), only you and authorized clinic staff can see it, and it is used to confirm your identity at reception. You can replace or remove it from your profile at any time."],
  ["Why we collect it", "To treat you safely, to schedule and confirm appointments, to contact you about them, and to run the clinic. We do not collect more than the clinic needs for these purposes."],
  ["Who can see it", "Your health information is visible only to you and to authorized dentists and administrators. Receptionists see what they need to manage appointments, not your medical history. Your appointment QR code holds only a random reference and never personal or medical details. The public calendar shows open times only."],
  ["Your rights", "Under the Data Privacy Act of 2012 (RA 10173) you may access, correct, and request deletion of your personal data, object to processing, and complain to the National Privacy Commission. You can review and update most details yourself from your dashboard; contact the clinic for anything else."],
  ["Keeping it safe", "Passwords are hashed by our authentication provider, connections are encrypted, access is controlled by role, and access to protected records is logged."],
  ["Service providers", "We use Supabase to store data, Vercel to host the website, and Brevo to send emails such as account confirmations and appointment notices. They process data on the clinic's behalf."],
  ["Retention", "We keep patient records only as long as needed for care and as required by law. Ask the clinic for the current retention periods."],
];

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-5 py-16 sm:px-8 sm:py-24">
      <h1 className="text-5xl">Privacy notice</h1>
      <p className="mt-4 text-muted">How RavenDent collects, uses, and protects your information.</p>
      <div className="mt-10 space-y-9">
        {SECTIONS.map(([h, p]) => (
          <section key={h}>
            <h2 className="text-3xl">{h}</h2>
            <p className="mt-2 text-silver">{p}</p>
          </section>
        ))}
      </div>
    </article>
  );
}
