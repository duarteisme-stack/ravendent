// TEMPLATE: have the clinic's counsel review before going live.
export const metadata = { title: "Terms of Service" };

const SECTIONS = [
  ["Your account", "Keep your login details private and give accurate information. You are responsible for activity on your account. Tell us if you suspect someone else has used it."],
  ["Booking and changes", "Online bookings reserve a time for the estimated duration of your treatment. Some treatments need staff approval and stay pending until confirmed. You can reschedule or cancel from your dashboard up to the deadline shown by the clinic. Later changes must be made by contacting the clinic."],
  ["Estimates", "Durations and prices shown on the website are estimates. Your dentist decides the actual time and treatment needed, and the final fee depends on what is done."],
  ["Medical information", "Provide complete and truthful health information. Leaving out allergies or conditions can make treatment unsafe. This website does not give medical advice or handle emergencies; for urgent dental or medical problems, call the clinic or your local emergency number."],
  ["Acceptable use", "Do not attempt to access other people's accounts or appointments, interfere with the website, or book appointments you do not intend to attend."],
  ["Changes", "We may update these terms and the website. Continued use after an update means you accept it."],
];

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl px-5 py-16 sm:px-8 sm:py-24">
      <h1 className="text-5xl">Terms of service</h1>
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
