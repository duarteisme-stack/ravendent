"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/appointments", label: "Upcoming Appointments" },
  { href: "/dashboard/history", label: "Appointment History" },
  { href: "/dashboard/profile", label: "Patient Profile" },
  { href: "/dashboard/medical", label: "Medical Information" },
  { href: "/dashboard/notifications", label: "Notifications" },
  { href: "/dashboard/settings", label: "Account Settings" },
];

export default function DashboardNav({ unread, children }: { unread: number; children: React.ReactNode }) {
  const path = usePathname();
  return (
    <nav aria-label="Dashboard" className="lg:sticky lg:top-24">
      <ul className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
        {ITEMS.map((i) => {
          const active = i.href === "/dashboard" ? path === i.href : path.startsWith(i.href);
          return (
            <li key={i.href} className="shrink-0">
              <Link
                href={i.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center justify-between gap-3 whitespace-nowrap rounded-md border-l-2 px-3 py-2 text-[0.95rem] transition-colors ${
                  active ? "border-crimson-light bg-white/5 text-snow" : "border-transparent text-silver hover:bg-white/5 hover:text-snow"}`}
              >
                {i.label}
                {i.href.endsWith("notifications") && unread > 0 && (
                  <span className="rounded-full bg-crimson px-2 text-xs text-snow" aria-label={`${unread} unread`}>{unread}</span>
                )}
              </Link>
            </li>
          );
        })}
        <li className="shrink-0 lg:mt-3 lg:border-t lg:border-silver/15 lg:pt-3">{children}</li>
      </ul>
    </nav>
  );
}
