"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Logo from "../Logo";

type Group = { label: string; items: { href: string; label: string; badge?: boolean }[] };

export default function AdminNav({ groups, pending, name, role, logout }: { groups: Group[]; pending: number; name: string; role: string; logout: React.ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  const list = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 py-6">
        <Logo className="h-8 w-8" />
        <div>
          <p className="font-display text-2xl leading-none">RavenDent</p>
          <p className="mt-1 text-xs text-muted">Admin dashboard</p>
        </div>
      </div>
      <nav aria-label="Admin" className="flex-1 overflow-y-auto px-3 pb-4">
        {groups.map((g) => (
          <div key={g.label} className="mb-5">
            <p className="px-3 pb-1.5 text-xs text-[#a78bfa]">{g.label}</p>
            <ul className="space-y-0.5">
              {g.items.map((i) => {
                const active = i.href === "/admin" ? path === "/admin" : path.startsWith(i.href);
                return (
                  <li key={i.href}>
                    <Link href={i.href} onClick={() => setOpen(false)} aria-current={active ? "page" : undefined}
                      className={`flex items-center justify-between rounded-lg border-l-2 px-3 py-2 text-[0.95rem] transition-colors ${active ? "border-[#8b5cf6] bg-white/[0.07] text-snow" : "border-transparent text-silver hover:bg-white/5 hover:text-snow"}`}>
                      {i.label}
                      {i.badge && pending > 0 && <span className="rounded-full bg-[#d946ef] px-2 text-xs font-medium text-white">{pending}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-night-line px-5 py-4 text-sm">
        <p className="truncate text-snow">{name}</p>
        <p className="mb-3 text-xs capitalize text-muted">{role}</p>
        <div className="flex flex-wrap gap-2">
          <Link href="/" className="adm-btn-ghost !px-3 !py-1.5">Website</Link>
          {logout}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-night-line bg-night/95 px-4 py-3 backdrop-blur lg:hidden">
        <span className="flex items-center gap-2"><Logo className="h-7 w-7" /><span className="font-display text-xl">RavenDent Admin</span></span>
        <button type="button" onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open} className="rounded-md border border-night-line p-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin menu">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} />
          <div className="relative h-full w-72 max-w-[85vw] bg-night-panel">{list}</div>
        </div>
      )}

      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-night-line bg-night-panel/80 lg:block">{list}</aside>
    </>
  );
}
