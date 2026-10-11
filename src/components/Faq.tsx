const FAQS = [
  {
    q: "Do I need an account to see available times?",
    a: "No. Anyone can browse open dates and times. You need an account and a completed patient profile to reserve one, so the dentist has your details before you arrive.",
  },
  {
    q: "How long will my appointment take?",
    a: "It depends on the service. We reserve the full time a procedure usually needs, and your dentist may adjust the plan after examining you. Estimated durations are shown next to every service.",
  },
  {
    q: "Can I reschedule or cancel?",
    a: "Yes, from your dashboard, up to the clinic's deadline before your visit. Your old time is released for other patients and your ticket is replaced with a new one.",
  },
  {
    q: "What is the appointment QR code?",
    a: "A personal ticket you show at reception. It holds only a random reference, never your medical information, and it stops working if you cancel or reschedule.",
  },
  {
    q: "Who can see my medical information?",
    a: "Only authorized clinic staff who need it for your care. We collect only what is necessary for safe treatment, with your consent, in line with the Data Privacy Act of 2012.",
  },
  {
    q: "Why do some treatments need approval?",
    a: "Longer or more involved treatments may need a dentist's review before they are confirmed. You will see a pending status and get a notification once staff respond.",
  },
];

export default function Faq() {
  return (
    <div className="divide-y divide-silver/15 border-y border-silver/15">
      {FAQS.map((f) => (
        <details key={f.q} className="group py-1">
          <summary className="flex cursor-pointer items-center justify-between gap-6 py-4 text-lg hover:text-silver">
            {f.q}
            <span className="faq-plus shrink-0 text-2xl leading-none text-crimson-light transition-transform duration-200" aria-hidden="true">+</span>
          </summary>
          <p className="max-w-2xl pb-5 text-muted">{f.a}</p>
        </details>
      ))}
    </div>
  );
}
