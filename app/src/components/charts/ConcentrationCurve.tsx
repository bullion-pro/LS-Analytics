import { useEffect, useState } from "react";
import { chartColors } from "./chartColors";

export interface ConcentrationPoint {
  cumCustomerPct: number;
  cumRevenuePct: number;
}

/**
 * A Lorenz/Pareto concentration curve — how much of trailing-12-month
 * revenue sits with how few customers, ranked by value. The dashed diagonal
 * is the "everyone contributes equally" baseline; the further the accent
 * curve bows above it, the more concentrated the revenue base is. Purpose-
 * built for the "how much does this business depend on a handful of
 * accounts" question — a plain ranked bar can't show that shape.
 */
export function ConcentrationCurve({
  points,
  highlightPct = 20,
  height = 260,
}: {
  points: ConcentrationPoint[];
  highlightPct?: number;
  height?: number;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const W = 560;
  const H = height;
  const padL = 44;
  const padB = 26;
  const padT = 14;
  const padR = 12;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const x = (pct: number) => padL + (pct / 100) * plotW;
  const y = (pct: number) => padT + (1 - pct / 100) * plotH;

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.cumCustomerPct).toFixed(1)},${y(p.cumRevenuePct).toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${x(100).toFixed(1)},${y(0).toFixed(1)} L${x(0).toFixed(1)},${y(0).toFixed(1)} Z`;

  const highlight = points.reduce(
    (best, p) => (Math.abs(p.cumCustomerPct - highlightPct) < Math.abs(best.cumCustomerPct - highlightPct) ? p : best),
    points[0] ?? { cumCustomerPct: 0, cumRevenuePct: 0 },
  );

  const ticks = [0, 25, 50, 75, 100];

  return (
    <div>
      <div className="mb-3 flex items-center gap-4">
        <span className="flex items-center gap-1.5 font-label text-[11.5px] text-[var(--color-ink-secondary)]">
          <span className="inline-block h-[2px] w-4 rounded-full" style={{ backgroundColor: chartColors.accent }} />
          Actual revenue share
        </span>
        <span className="flex items-center gap-1.5 font-label text-[11.5px] text-[var(--color-ink-secondary)]">
          <span
            className="inline-block h-0 w-4 border-t-[1.5px] border-dashed"
            style={{ borderColor: chartColors.baseline }}
          />
          Equal distribution
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} className="overflow-visible">
        <defs>
          <linearGradient id="concentrationFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={chartColors.accent} stopOpacity={0.22} />
            <stop offset="100%" stopColor={chartColors.accent} stopOpacity={0} />
          </linearGradient>
        </defs>

        {ticks.map((v) => (
          <g key={`h-${v}`}>
            <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke={chartColors.hairline} strokeWidth={1} />
            <text x={padL - 8} y={y(v) + 3} textAnchor="end" fontSize={10} fill={chartColors.inkMuted} fontFamily="Inter, sans-serif">
              {v}%
            </text>
          </g>
        ))}
        {ticks.map((v) => (
          <text key={`v-${v}`} x={x(v)} y={H - 8} textAnchor="middle" fontSize={10} fill={chartColors.inkMuted} fontFamily="Inter, sans-serif">
            {v}%
          </text>
        ))}

        <line x1={x(0)} y1={y(0)} x2={x(100)} y2={y(100)} stroke={chartColors.baseline} strokeDasharray="3 3" strokeWidth={1} />

        <path d={areaPath} fill="url(#concentrationFill)" opacity={mounted ? 1 : 0} style={{ transition: "opacity .7s ease .2s" }} />
        <path
          d={linePath}
          fill="none"
          stroke={chartColors.accent}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          style={{
            strokeDasharray: 1,
            strokeDashoffset: mounted ? 0 : 1,
            transition: "stroke-dashoffset 1.1s cubic-bezier(.16,1,.3,1)",
          }}
        />

        <line
          x1={x(highlight.cumCustomerPct)}
          y1={y(highlight.cumRevenuePct)}
          x2={x(highlight.cumCustomerPct)}
          y2={y(0)}
          stroke={chartColors.accent}
          strokeDasharray="2 3"
          strokeWidth={1}
          opacity={mounted ? 0.5 : 0}
          style={{ transition: "opacity .4s ease 1s" }}
        />
        <circle
          cx={x(highlight.cumCustomerPct)}
          cy={y(highlight.cumRevenuePct)}
          r={mounted ? 4.5 : 0}
          fill={chartColors.accent}
          stroke="white"
          strokeWidth={2}
          style={{ transition: "r .3s ease 1s" }}
        />
      </svg>
      <p className="mt-1 text-center font-label text-[10.5px] text-[var(--color-ink-muted)]">Share of active customers, ranked by value →</p>
    </div>
  );
}
