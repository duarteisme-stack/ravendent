import Link from "next/link";
import Logo from "./Logo";
import type { ClinicSettings } from "@/lib/clinic";

export default function Footer({ settings }: { settings: ClinicSettings }) {
  return (
    <footer className="border-t border-silver/15 bg-charcoal">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1.3fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <Logo />
            <span className="font-display text-2xl">{settings.clinic_name}</span>
          </div>
          <p className="mt-4 max-w-sm text-sm text-muted">
            Comfortable, reliable dental care with a precise, unhurried approach.
          </p>
        </div>

        <div>
          <h2 className="font-sans text-sm font-semibold text-silver">Contact</h2>
          <address className="mt-3 space-y-1.5 text-sm not-italic text-muted">
            {settings.address && <p>{settings.address}</p>}
            {settings.phone && (
              <p><a className="hover:text-snow" href={`tel:${settings.phone.replace(/\s/g, "")}`}>{settings.phone}</a></p>
            )}
            {settings.email && (
              <p><a className="hover:text-snow" href={`mailto:${settings.email}`}>{settings.email}</a></p>
            )}
          </address>
        </div>

        <div>
          <h2 className="font-sans text-sm font-semibold text-silver">Privacy</h2>
          <p className="mt-3 text-sm text-muted">
            We collect personal and health information only to provide safe dental care and run the clinic. It is
            handled under the Data Privacy Act of 2012 (RA 10173) and visible only to authorized clinic staff.
          </p>
          <p className="mt-3 flex gap-5 text-sm">
            <Link href="/privacy" className="text-crimson-light hover:text-snow">Privacy notice</Link>
            <Link href="/terms" className="text-crimson-light hover:text-snow">Terms of service</Link>
          </p>
        </div>
      </div>
      <div className="border-t border-silver/10 py-5 text-center text-xs text-muted">
        © {new Date().getFullYear()} {settings.clinic_name}. All rights reserved.
      </div>
    </footer>
  );
}
