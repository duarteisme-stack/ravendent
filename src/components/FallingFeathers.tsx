/** Slowly falling black feathers behind every page. Pure CSS transforms, no JS, hidden for reduced motion. */
const FEATHERS = Array.from({ length: 16 }, (_, i) => {
  const r = (n: number) => { const x = Math.sin((i + 1) * 12.9898 + n * 78.233) * 43758.5453; return x - Math.floor(x); };
  return {
    x: Math.round(r(1) * 96),            // % from left
    s: Math.round(20 + r(2) * 34),        // width px
    d: Math.round(26 + r(3) * 30),        // fall seconds
    delay: -Math.round(r(4) * 56),        // negative = already mid-air on load
    sway: Math.round(14 + r(5) * 34),     // px
    rot: Math.round(10 + r(6) * 28),      // deg
    sd: Math.round(5 + r(7) * 5),         // sway seconds
    crimson: i % 5 === 0,
  };
});

export default function FallingFeathers() {
  return (
    <div className="feathers" aria-hidden="true">
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="vane" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#2b2b3a" />
            <stop offset="1" stopColor="#0c0c11" />
          </linearGradient>
          <linearGradient id="vane-red" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#4a1420" />
            <stop offset="1" stopColor="#0c0c11" />
          </linearGradient>
        </defs>
      </svg>
      {FEATHERS.map((f, i) => (
        <span
          key={i}
          className="feather"
          style={{ "--x": `${f.x}%`, "--s": `${f.s}px`, "--d": `${f.d}s`, "--delay": `${f.delay}s`, "--sway": `${f.sway}px`, "--rot": `${f.rot}deg`, "--sd": `${f.sd}s` } as React.CSSProperties}
        >
          <svg viewBox="0 0 40 120" fill="none">
            <path d="M20 2C35 22 37 64 20 118C3 64 5 22 20 2Z" fill={f.crimson ? "url(#vane-red)" : "url(#vane)"} stroke="#C4C7D0" strokeOpacity=".32" strokeWidth=".8" />
            <path d="M20 6V118" stroke="#C4C7D0" strokeOpacity=".4" strokeWidth=".8" strokeLinecap="round" />
            <path d="M20 26l-9-7M20 40l-12-8M20 56l-13-8M20 72l-12-8M20 88l-9-7M20 26l9-7M20 40l12-8M20 56l13-8M20 72l12-8M20 88l9-7" stroke="#C4C7D0" strokeOpacity=".16" strokeWidth=".7" strokeLinecap="round" />
          </svg>
        </span>
      ))}
    </div>
  );
}
