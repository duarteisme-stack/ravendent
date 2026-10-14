"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Logo from "./Logo";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/#about", label: "About Us" },
  { href: "/#services", label: "Dental Services" },
  { href: "/#availability", label: "Available Appointments" },
  { href: "/#contact", label: "Contact Us" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const close = () => setOpen(false);

  // Static pages stay cached; the navbar learns about the session in the browser.
  useEffect(() => {
    const sb = getSupabaseBrowser();
    if (!sb) return;
    const apply = async (uid: string | null) => {
      setSignedIn(Boolean(uid));
      if (!uid) return setIsStaff(false);
      const { data } = await sb.from("profiles").select("role").eq("id", uid).maybeSingle();
      setIsStaff(Boolean(data && data.role !== "customer"));
    };
    void sb.auth.getSession().then(({ data }) => apply(data.session?.user.id ?? null));
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => { void apply(session?.user.id ?? null); });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-silver/15 bg-ink/85 backdrop-blur">
      <nav aria-label="Main" className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5" onClick={close}>
          <Logo />
          <span className="font-display text-2xl tracking-tight">RavenDent</span>
        </Link>

        <ul className="hidden items-center gap-7 text-[0.95rem] text-silver lg:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="transition-colors hover:text-snow">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-3 lg:flex">
          {signedIn ? (
            <Link href={isStaff ? "/admin" : "/dashboard"} className="btn-primary !py-2 !px-4 !text-[0.95rem]">{isStaff ? "Admin Dashboard" : "My Dashboard"}</Link>
          ) : (
            <>
              <Link href="/login" className="btn-ghost !py-2 !px-4 !text-[0.95rem]">Log In</Link>
              <Link href="/register" className="btn-primary !py-2 !px-4 !text-[0.95rem]">Create Account</Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="rounded-md border border-silver/30 p-2 lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </nav>

      {open && (
        <div id="mobile-menu" className="border-t border-silver/15 bg-charcoal lg:hidden">
          <ul className="mx-auto flex max-w-6xl flex-col px-5 py-3 sm:px-8">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} onClick={close} className="block border-b border-silver/10 py-3 text-silver hover:text-snow">
                  {l.label}
                </Link>
              </li>
            ))}
            <li className="flex gap-3 py-4">
              {signedIn ? (
                <Link href={isStaff ? "/admin" : "/dashboard"} onClick={close} className="btn-primary flex-1">{isStaff ? "Admin Dashboard" : "My Dashboard"}</Link>
              ) : (
                <>
                  <Link href="/login" onClick={close} className="btn-ghost flex-1">Log In</Link>
                  <Link href="/register" onClick={close} className="btn-primary flex-1">Create Account</Link>
                </>
              )}
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
