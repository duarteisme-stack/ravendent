import Link from "next/link";
import Hero from "@/components/Hero";
import Hours from "@/components/Hours";
import Faq from "@/components/Faq";
import AvailabilityCalendar from "@/components/AvailabilityCalendar";
import { getClinicData } from "@/lib/clinic";
import { durationLabel, pesoRange } from "@/lib/format";

export const revalidate = 60;

export default async function HomePage() {
  const { settings, hours, services, dentists } = await getClinicData();

  return (
    <>
      <Hero clinicName={settings.clinic_name} />

      {/* About + hours */}
      <section id="about" className="section grid gap-14 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <h2 className="text-4xl sm:text-5xl">A quieter kind of dental care</h2>
          <div className="mt-6 max-w-prose space-y-4 text-silver">
            <p>
              {settings.clinic_name} was set up around one idea: good dentistry is unhurried. We plan each treatment
              with the time it needs, explain what we are doing, and keep the clinic calm, clean, and private.
            </p>
            <p>
              Our dentists work with modern equipment and clear pricing. You will always know your estimated duration
              and any preparation before you arrive.
            </p>
          </div>
          <dl className="mt-8 grid gap-5 sm:grid-cols-2">
            {settings.address && (
              <div>
                <dt className="text-sm text-muted">Address</dt>
                <dd>{settings.address}</dd>
              </div>
            )}
            {settings.phone && (
              <div>
                <dt className="text-sm text-muted">Phone</dt>
                <dd><a className="hover:text-crimson-light" href={`tel:${settings.phone.replace(/\s/g, "")}`}>{settings.phone}</a></dd>
              </div>
            )}
          </dl>
        </div>

        <div className="panel p-6 sm:p-8">
          <h3 className="text-3xl">Opening hours</h3>
          <div className="mt-3"><Hours hours={hours} /></div>
        </div>
      </section>

      {/* Services: a ruled list, not a card grid */}
      <section id="services" className="border-y border-silver/15 bg-charcoal">
        <div className="section">
          <h2 className="text-4xl sm:text-5xl">Dental services</h2>
          <p className="mt-4 max-w-xl text-muted">
            Durations are estimates. Your dentist decides the time actually needed, and we reserve it in full.
          </p>

          {services.length === 0 ? (
            <p className="mt-10 text-muted">Services will be listed here soon.</p>
          ) : (
            <ul className="mt-10 divide-y divide-silver/15 border-y border-silver/15">
              {services.map((s) => {
                const price = pesoRange(s.price_min, s.price_max);
                return (
                  <li key={s.id} className="grid gap-x-10 gap-y-2 py-6 md:grid-cols-[1.3fr_1.6fr_auto]">
                    <h3 className="text-2xl">{s.name}</h3>
                    <div>
                      {s.description && <p className="text-silver">{s.description}</p>}
                      {s.prep_instructions && (
                        <p className="mt-1 text-sm text-muted">Before your visit: {s.prep_instructions}</p>
                      )}
                    </div>
                    <div className="text-sm text-muted md:text-right">
                      <p className="text-snow">{durationLabel(s.duration_minutes)}</p>
                      {price && <p>{price}</p>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {/* Availability: the memorable element */}
      <section id="availability" className="section">
        <h2 className="text-4xl sm:text-5xl">Available appointments</h2>
        <p className="mt-4 max-w-xl text-muted">
          Live openings, updated as patients book. Pick a service to see times that fit its full duration.
        </p>
        <div className="mt-10">
          <AvailabilityCalendar
            services={services}
            dentists={dentists}
            timezone={settings.timezone}
            horizonDays={settings.booking_horizon_days}
          />
        </div>
      </section>

      {/* Dentists */}
      {dentists.length > 0 && (
        <section id="dentists" className="border-t border-silver/15 bg-charcoal">
          <div className="section">
            <h2 className="text-4xl sm:text-5xl">Our dentists</h2>
            <ul className="mt-10 grid gap-8 md:grid-cols-3">
              {dentists.map((d) => (
                <li key={d.id} className="flex gap-4">
                  {d.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={d.photo_url} alt={d.display_name} className="h-16 w-16 shrink-0 rounded-full border border-silver/30 object-cover" />
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-silver/30 bg-slate font-display text-2xl text-silver" aria-hidden="true">
                      {d.display_name.replace(/^Dr\.?\s*/i, "").split(" ").map((p) => p[0]).slice(0, 2).join("")}
                    </div>
                  )}
                  <div>
                    <h3 className="text-2xl">{d.display_name}</h3>
                    {d.qualifications && <p className="text-sm text-silver">{d.qualifications}</p>}
                    {d.bio && <p className="mt-1 text-sm text-muted">{d.bio}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section id="faq" className="section">
        <h2 className="text-4xl sm:text-5xl">Questions, answered</h2>
        <div className="mt-10 max-w-3xl"><Faq /></div>
      </section>

      {/* Contact */}
      <section id="contact" className="border-t border-silver/15 bg-charcoal">
        <div className="section grid gap-10 md:grid-cols-[1fr_1.2fr]">
          <div>
            <h2 className="text-4xl sm:text-5xl">Contact us</h2>
            <p className="mt-4 max-w-sm text-muted">
              For urgent dental pain or questions about treatment, call the clinic during opening hours.
            </p>
          </div>
          <address className="panel space-y-4 p-6 not-italic sm:p-8">
            {settings.address ? <p>{settings.address}</p> : <p className="text-muted">Address to be announced.</p>}
            {settings.phone && <p><a className="hover:text-crimson-light" href={`tel:${settings.phone.replace(/\s/g, "")}`}>{settings.phone}</a></p>}
            {settings.email && <p><a className="hover:text-crimson-light" href={`mailto:${settings.email}`}>{settings.email}</a></p>}
            <div className="pt-2">
              <Link href="/book" className="btn-primary">Book an Appointment</Link>
            </div>
          </address>
        </div>
      </section>
    </>
  );
}
