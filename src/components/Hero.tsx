import Link from "next/link";
import FeatherArt from "./FeatherArt";

export default function Hero({ clinicName }: { clinicName: string }) {
  return (
    <section className="hero-bg relative isolate overflow-hidden border-b border-silver/15">
      <FeatherArt className="pointer-events-none absolute -right-10 top-0 -z-10 hidden h-full max-h-[720px] w-auto opacity-90 md:block" />
      <div className="mx-auto flex min-h-[min(88vh,760px)] max-w-6xl flex-col justify-center px-5 py-24 sm:px-8">
        <div className="hero-reveal max-w-2xl">
          <p className="text-silver">{clinicName} Dental Clinic</p>
          <h1 className="mt-4 text-[clamp(3.1rem,8vw,6rem)]">Your Smile. Our Precision.</h1>
          <p className="mt-6 max-w-xl text-lg text-silver">
            {clinicName} is a dental clinic built around calm, careful treatment. Every visit is planned with the time
            it actually needs, so you are never rushed and never kept waiting.
          </p>
          <p className="mt-4 max-w-xl text-muted">
            Check open times without an account. Create one when you are ready to book, reschedule, or keep your
            appointment ticket on your phone.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/book" className="btn-primary">Book an Appointment</Link>
            <Link href="/#availability" className="btn-ghost">View Available Dates</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
