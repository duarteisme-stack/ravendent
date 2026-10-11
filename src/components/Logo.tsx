export default function Logo({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden="true">
      {/* tooth */}
      <path
        d="M24 7c-4.6-3-11.5-2.4-14.4 2.6-2 3.6-1.2 7.6.8 11.4 1.4 2.8 1.2 5.8 2.2 9.6.6 2.6 1.8 5.4 3.8 5.4 2.4 0 2-4.6 3.4-8.6.6-1.6 1.4-2.4 2.2-2.4s1.6.8 2.2 2.4c1.4 4 1 8.6 3.4 8.6 2 0 3.2-2.8 3.8-5.4 1-3.8.8-6.8 2.2-9.6 2-3.8 2.8-7.8.8-11.4C35.5 4.6 28.6 4 24 7z"
        stroke="#C4C7D0"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* feather */}
      <path d="M31 12c-5 1.2-9.5 5-11 12.5 4.6-1.4 9.4-5.6 11-12.5z" fill="#8B1E2D" />
      <path d="M20 24.5 29 15" stroke="#F5F5F7" strokeOpacity=".55" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}
