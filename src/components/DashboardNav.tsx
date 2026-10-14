"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const icon = (d: string) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

const ITEMS = [
  { href: "/dashboard", label: "Home", match: (p: string) => p === "/dashboard", icon: icon("M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z") },
  { href: "/dashboard/appointments", label: "Visits", match: (p: string) => p.startsWith("/dashboard/appointments"), icon: icon("M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM4 10h16M9 3v4M15 3v4") },
  { href: "/book", label: "Book", match: () => false, accent: true, icon: icon("M12 5v14M5 12h14") },
  { href: "/dashboard/notifications", label: "Alerts", match: (p: string) => p.startsWith("/dashboard/notifications"), badge: true, icon: icon("M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20a2 2 0 0 0 4 0") },
  { href: "/dashboard/profile", label: "Me", match: (p: string) => ["/dashboard/profile", "/dashboard/medical", "/dashboard/settings"].some((x) => p.startsWith(x)), icon: icon("M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20a8 8 0 0 1 16 0") },
];

export default function DashboardNav({ unread, children }: { unread: number; children: React.ReactNode }) {
  const path = usePathname();
  return (
    <>
      {/* Phone and tablet: bottom tab bar */}
      <nav aria-label="Dashboard" className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-silver/15 bg-ink/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <ul className="mx-auto flex max-w-md items-end justify-around px-2">
          {ITEMS.map((i) => {
            const active = i.match(path);
            return (
              <li key={i.href} className="flex-1">
                <Link href={i.href} aria-current={active ? "page" : undefined}
                  className={`relative flex flex-col items-center gap-0.5 py-2 text-[0.7rem] ${i.accent ? "" : active ? "text-snow" : "text-muted"}`}>
                  {i.accent ? (
                    <span className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-crimson text-snow shadow-glow ring-4 ring-ink">{i.icon}</span>
                  ) : (
                    <span className="relative">
                      {i.icon}
                      {i.badge && unread > 0 && <span className="absolute -right-1.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-crimson px-1 text-[0.6rem] text-snow" aria-label={`${unread} unread`}>{unread}</span>}
                    </span>
                  )}
                  <span className={i.accent ? "text-silver" : ""}>{i.label}</span>
                  {active && !i.accent && <span className="absolute inset-x-6 top-0 h-0.5 rounded-full bg-crimson-light" />}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Desktop: slim side rail */}
      <nav aria-label="Dashboard" className="no-print hidden lg:sticky lg:top-24 lg:block lg:self-start">
        <ul className="space-y-1">
          {ITEMS.map((i) => {
            const active = i.match(path);
            return (
              <li key={i.href}>
                <Link href={i.href} aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${i.accent ? "bg-crimson text-snow hover:bg-[#a22436]" : active ? "bg-white/8 text-snow" : "text-silver hover:bg-white/5 hover:text-snow"}`}>
                  {i.icon}
                  <span className="flex-1">{i.label === "Book" ? "Book a visit" : i.label === "Me" ? "My details" : i.label}</span>
                  {i.badge && unread > 0 && <span className="rounded-full bg-crimson px-2 text-xs text-snow">{unread}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="mt-4 border-t border-silver/15 pt-4">{children}</div>
      </nav>
    </>
  );
}
