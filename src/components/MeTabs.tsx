import Link from "next/link";

const TABS = [
  { href: "/dashboard/profile", label: "Personal" },
  { href: "/dashboard/medical", label: "Medical" },
  { href: "/dashboard/settings", label: "Account" },
];

export function Segmented({ items, current }: { items: { href: string; label: string }[]; current: string }) {
  return (
    <div role="tablist" className="inline-flex rounded-full border border-silver/20 bg-charcoal/80 p-1">
      {items.map((t) => (
        <Link key={t.href} href={t.href} role="tab" aria-selected={t.href === current}
          className={`rounded-full px-4 py-1.5 text-sm transition-colors ${t.href === current ? "bg-crimson text-snow" : "text-silver hover:text-snow"}`}>
          {t.label}
        </Link>
      ))}
    </div>
  );
}

export default function MeTabs({ current }: { current: string }) {
  return <Segmented items={TABS} current={current} />;
}
