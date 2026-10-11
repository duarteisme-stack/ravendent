/** Large decorative feather drawn procedurally: one spine plus swept barbs. Purely decorative. */
export default function FeatherArt({ className = "" }: { className?: string }) {
  const P0 = { x: 90, y: 600 }, C = { x: 130, y: 250 }, P1 = { x: 430, y: 30 };
  const at = (t: number) => ({
    x: (1 - t) ** 2 * P0.x + 2 * (1 - t) * t * C.x + t ** 2 * P1.x,
    y: (1 - t) ** 2 * P0.y + 2 * (1 - t) * t * C.y + t ** 2 * P1.y,
  });
  const tan = (t: number) => {
    const x = 2 * (1 - t) * (C.x - P0.x) + 2 * t * (P1.x - C.x);
    const y = 2 * (1 - t) * (C.y - P0.y) + 2 * t * (P1.y - C.y);
    const l = Math.hypot(x, y);
    return { x: x / l, y: y / l };
  };

  const barbs: string[] = [];
  const N = 46;
  for (let i = 2; i < N; i++) {
    const t = i / N;
    const p = at(t), T = tan(t);
    const n = { x: -T.y, y: T.x };
    const len = 150 * Math.pow(Math.sin(Math.PI * Math.min(t * 1.05, 1)), 0.75) * (1 - t * 0.35);
    for (const side of [-1, 1]) {
      const end = { x: p.x + n.x * len * side + T.x * len * 0.7, y: p.y + n.y * len * side + T.y * len * 0.7 };
      const mid = { x: p.x + n.x * len * 0.55 * side + T.x * len * 0.15, y: p.y + n.y * len * 0.55 * side + T.y * len * 0.15 };
      barbs.push(`M${p.x.toFixed(1)} ${p.y.toFixed(1)} Q${mid.x.toFixed(1)} ${mid.y.toFixed(1)} ${end.x.toFixed(1)} ${end.y.toFixed(1)}`);
    }
  }

  return (
    <svg viewBox="0 0 520 640" className={className} fill="none" aria-hidden="true">
      <path d={barbs.join(" ")} stroke="#C4C7D0" strokeOpacity="0.22" strokeWidth="0.8" strokeLinecap="round" />
      <path
        className="feather-line"
        d={`M${P0.x} ${P0.y} Q${C.x} ${C.y} ${P1.x} ${P1.y}`}
        stroke="#D4596B"
        strokeOpacity="0.8"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
