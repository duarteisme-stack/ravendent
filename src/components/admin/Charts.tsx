/** Dependency-free SVG charts in the mockup's hues. Server-rendered, responsive via viewBox. */
export const HUES = { cyan: "#22d3ee", blue: "#3b82f6", magenta: "#d946ef", violet: "#8b5cf6", pink: "#e0529c" };
const GRID = "#262a4d";
const AXIS = "#8c90b5";

function niceMax(v: number): number {
  if (v <= 4) return 4;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

function smooth(pts: [number, number][]): string {
  if (pts.length < 2) return pts.length ? `M${pts[0][0]} ${pts[0][1]}` : "";
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const dayLabel = (ymd: string) => `${MONTHS[Number(ymd.slice(5, 7)) - 1]} ${Number(ymd.slice(8, 10))}`;

type Series = { name: string; color: string; values: number[] };

export function LineChart({ labels, series, fill = false, height = 230, id }: { labels: string[]; series: Series[]; fill?: boolean; height?: number; id: string }) {
  const W = 640, H = height, L = 34, R = 12, T = 12, B = 26;
  const max = niceMax(Math.max(1, ...series.flatMap((s) => s.values)));
  const x = (i: number) => L + (labels.length <= 1 ? 0 : (i * (W - L - R)) / (labels.length - 1));
  const y = (v: number) => T + (1 - v / max) * (H - T - B);
  const ticks = [0, 1, 2, 3, 4].map((k) => (max * k) / 4);
  const every = Math.max(1, Math.ceil(labels.length / 6));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={series.map((s) => s.name).join(" and ")}>
      <defs>
        {series.map((s, i) => (
          <linearGradient key={i} id={`${id}-f${i}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={s.color} stopOpacity=".35" />
            <stop offset="1" stopColor={s.color} stopOpacity="0" />
          </linearGradient>
        ))}
      </defs>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth="1" />
          <text x={L - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill={AXIS}>{Number.isInteger(t) ? t : t.toFixed(1)}</text>
        </g>
      ))}
      {labels.map((l, i) => (i % every === 0 ? <text key={i} x={x(i)} y={H - 6} textAnchor="middle" fontSize="11" fill={AXIS}>{l}</text> : null))}
      {series.map((s, i) => {
        const pts = s.values.map((v, k) => [x(k), y(v)] as [number, number]);
        const line = smooth(pts);
        return (
          <g key={s.name}>
            {(fill || i === 0) && fill && <path d={`${line} L${x(s.values.length - 1)} ${y(0)} L${x(0)} ${y(0)} Z`} fill={`url(#${id}-f${i})`} />}
            <path d={line} fill="none" stroke={s.color} strokeWidth="2.2" strokeLinecap="round" />
          </g>
        );
      })}
    </svg>
  );
}

export function BarChart({ items, height = 210, id }: { items: { label: string; value: number }[]; height?: number; id: string }) {
  const W = 360, H = height, L = 8, R = 8, T = 22, B = 24;
  const max = niceMax(Math.max(1, ...items.map((i) => i.value)));
  const bw = (W - L - R) / items.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Appointments by weekday">
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={HUES.cyan} />
          <stop offset="1" stopColor={HUES.blue} stopOpacity=".55" />
        </linearGradient>
      </defs>
      {items.map((it, i) => {
        const h = (it.value / max) * (H - T - B);
        const x = L + i * bw + bw * 0.2;
        return (
          <g key={it.label}>
            <rect x={x} y={H - B - h} width={bw * 0.6} height={Math.max(h, 1)} rx="4" fill={`url(#${id}-g)`} />
            <text x={x + bw * 0.3} y={H - B - h - 6} textAnchor="middle" fontSize="11" fill="#cfd3f5">{it.value}</text>
            <text x={x + bw * 0.3} y={H - 6} textAnchor="middle" fontSize="11" fill={AXIS}>{it.label}</text>
          </g>
        );
      })}
      <line x1={L} x2={W - R} y1={H - B} y2={H - B} stroke={GRID} />
    </svg>
  );
}

export function Donut({ items, colors, centerLabel }: { items: { name: string; count: number }[]; colors?: string[]; centerLabel: string }) {
  const palette = colors ?? [HUES.cyan, HUES.blue, HUES.violet, HUES.magenta, HUES.pink, "#34d399", "#f59e0b", "#94a3b8"];
  const total = items.reduce((a, b) => a + b.count, 0);
  const R = 52, C = 2 * Math.PI * R;
  let offset = 0;
  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg viewBox="0 0 140 140" className="h-40 w-40 shrink-0" role="img" aria-label={`${centerLabel}: ${total}`}>
        <circle cx="70" cy="70" r={R} fill="none" stroke={GRID} strokeWidth="16" />
        {total > 0 && items.map((it, i) => {
          const len = (it.count / total) * C;
          const el = <circle key={it.name} cx="70" cy="70" r={R} fill="none" stroke={palette[i % palette.length]} strokeWidth="16"
            strokeDasharray={`${Math.max(len - 2, 0)} ${C}`} strokeDashoffset={-offset} transform="rotate(-90 70 70)" />;
          offset += len;
          return el;
        })}
        <text x="70" y="68" textAnchor="middle" fontSize="11" fill={AXIS}>{centerLabel}</text>
        <text x="70" y="88" textAnchor="middle" fontSize="22" fill="#fff" fontFamily="serif">{total}</text>
      </svg>
      <ul className="min-w-0 flex-1 space-y-2 text-sm">
        {items.length === 0 && <li className="text-muted">No data yet.</li>}
        {items.map((it, i) => (
          <li key={it.name} className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: palette[i % palette.length] }} />
            <span className="min-w-0 flex-1 truncate text-silver">{it.name}</span>
            <span className="text-snow">{it.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
