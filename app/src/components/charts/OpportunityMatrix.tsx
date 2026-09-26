import { useId, useMemo, useState } from "react";
import { chartColors } from "./chartColors";
import { TooltipCard } from "./ChartTooltip";

export interface MatrixPoint {
  id: string;
  name: string;
  type: string;
  recencyMonths: number;
  valueAED: number;
  frequency: number;
  segmentLabel: string;
  segmentColor: string;
}

interface LaidOutPoint extends MatrixPoint {
  cx: number;
  cy: number;
  r: number;
}

const W = 640;
const H = 380;
const PAD_L = 66;
const PAD_R = 20;
const PAD_TOP = 44;
const PAD_BOTTOM = 44;
const PLOT_W = W - PAD_L - PAD_R;
const PLOT_H = H - PAD_TOP - PAD_BOTTOM;
const MAX_DRIFT = 15; // px a mark is allowed to move off its true data position to resolve overlap

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

/**
 * Value (Y) vs. recency (X, months since last purchase — further right is
 * staler) with bubble size carrying visit frequency: the single view that
 * answers "who's valuable AND engaged, and who's valuable but going quiet."
 *
 * Hand-rolled SVG, not Recharts' ScatterChart — because recency is a small
 * integer (0, 1, 2mo…), dozens of customers legitimately share a month, and
 * any two-axis scatter this dense needs real 2D collision resolution, not a
 * fixed data-space jitter (which only works at whatever pixel width the
 * chart happens to render at, and silently collapses back into an
 * overlapping mess on a narrower card or screen). Layout is computed once in
 * a fixed 640×380 coordinate space — separation is correct by construction,
 * not by hoping the container is wide enough — then the SVG scales
 * responsively via viewBox, so the relative spacing never degrades.
 */
export function OpportunityMatrix({
  points,
  valueFormatter,
  highValueThreshold,
  staleThresholdMonths = 6,
  height = 380,
}: {
  points: MatrixPoint[];
  valueFormatter: (v: number) => string;
  highValueThreshold: number;
  staleThresholdMonths?: number;
  height?: number;
}) {
  const filterId = useId();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const maxFreq = Math.max(...points.map((p) => p.frequency), 1);
  const radiusFor = (freq: number) => 3.5 + Math.sqrt(freq / maxFreq) * 7.5;

  const xDomainMax = Math.max(...points.map((p) => p.recencyMonths), staleThresholdMonths + 1) * 1.04;
  const yDomainMax = Math.max(...points.map((p) => p.valueAED), highValueThreshold) * 1.06;
  const xScale = (v: number) => PAD_L + (v / xDomainMax) * PLOT_W;
  const yScale = (v: number) => PAD_TOP + PLOT_H - (v / yDomainMax) * PLOT_H;

  const laidOut = useMemo<LaidOutPoint[]>(() => {
    const base: LaidOutPoint[] = points.map((p) => ({
      ...p,
      cx: xScale(p.recencyMonths),
      cy: yScale(p.valueAED),
      r: radiusFor(p.frequency),
    }));
    const ox = base.map((p) => p.cx);
    const oy = base.map((p) => p.cy);

    // Iterative pairwise collision relaxation (a lightweight beeswarm pass) — each overlapping
    // pair pushes apart along the line between their centers; drift from the true data position
    // is capped, so dense clusters fan out locally without drifting into a materially wrong
    // month or value. Cheap enough to run at this N (a few hundred points, a few hundred passes).
    for (let iter = 0; iter < 260; iter++) {
      let moved = false;
      for (let i = 0; i < base.length; i++) {
        for (let j = i + 1; j < base.length; j++) {
          const a = base[i];
          const b = base[j];
          const dx = b.cx - a.cx;
          const dy = b.cy - a.cy;
          const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
          const minDist = a.r + b.r + 1.25;
          if (dist < minDist) {
            moved = true;
            const push = (minDist - dist) / 2;
            const ux = dx / dist;
            const uy = dy / dist;
            a.cx = clamp(a.cx - ux * push, ox[i] - MAX_DRIFT, ox[i] + MAX_DRIFT);
            a.cy = clamp(a.cy - uy * push, oy[i] - MAX_DRIFT, oy[i] + MAX_DRIFT);
            b.cx = clamp(b.cx + ux * push, ox[j] - MAX_DRIFT, ox[j] + MAX_DRIFT);
            b.cy = clamp(b.cy + uy * push, oy[j] - MAX_DRIFT, oy[j] + MAX_DRIFT);
          }
        }
      }
      if (!moved) break;
    }
    // Keep every mark inside the plot bounds regardless of how far relaxation pushed it.
    base.forEach((p) => {
      p.cx = clamp(p.cx, PAD_L + p.r, PAD_L + PLOT_W - p.r);
      p.cy = clamp(p.cy, PAD_TOP + p.r, PAD_TOP + PLOT_H - p.r);
    });
    // Emphasis marks paint last (on top) so the busiest low-value cluster doesn't bury them.
    return base.sort((a, b) => {
      const rank = (l: string) => (l === "Champion" || l === "At Risk" ? 1 : 0);
      return rank(a.segmentLabel) - rank(b.segmentLabel);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, xDomainMax, yDomainMax]);

  const xTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(xDomainMax * f));
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => yDomainMax * f);
  const highValueY = yScale(highValueThreshold);
  const staleX = xScale(staleThresholdMonths);
  const hovered = laidOut.find((p) => p.id === hoveredId);

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={height} className="overflow-visible">
        <defs>
          <filter id={`${filterId}-glow`} x="-140%" y="-140%" width="380%" height="380%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id={`${filterId}-shadow`} x="-60%" y="-60%" width="220%" height="220%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor={chartColors.ink} floodOpacity="0.16" />
          </filter>
        </defs>

        {yTicks.map((v) => (
          <g key={v}>
            <line x1={PAD_L} x2={W - PAD_R} y1={yScale(v)} y2={yScale(v)} stroke={chartColors.hairline} strokeWidth={1} />
            <text x={PAD_L - 10} y={yScale(v) + 4} textAnchor="end" fontSize={11} fill={chartColors.inkMuted} fontFamily="Inter, sans-serif">
              {valueFormatter(v)}
            </text>
          </g>
        ))}
        {xTicks.map((v) => (
          <text key={v} x={xScale(v)} y={PAD_TOP + PLOT_H + 20} textAnchor="middle" fontSize={11} fill={chartColors.inkMuted} fontFamily="Inter, sans-serif">
            {v}mo
          </text>
        ))}
        <line x1={PAD_L} x2={W - PAD_R} y1={PAD_TOP + PLOT_H} y2={PAD_TOP + PLOT_H} stroke={chartColors.baseline} strokeWidth={1} />
        <text
          x={(PAD_L + W - PAD_R) / 2}
          y={PAD_TOP + PLOT_H + 36}
          textAnchor="middle"
          fontSize={10.5}
          fill={chartColors.inkMuted}
          fontFamily="Inter, sans-serif"
        >
          Months since last purchase →
        </text>

        {/* Reference thresholds */}
        <line x1={PAD_L} x2={W - PAD_R} y1={highValueY} y2={highValueY} stroke={chartColors.accent} strokeWidth={1} strokeDasharray="4 4" />
        <line x1={staleX} x2={staleX} y1={PAD_TOP} y2={PAD_TOP + PLOT_H} stroke={chartColors.critical} strokeWidth={1} strokeDasharray="4 4" opacity={0.65} />
        <ChipLabel x={W - PAD_R} y={highValueY - 9} text="HIGH VALUE" tone="accent" align="right" />
        <ChipLabel x={staleX} y={PAD_TOP - 10} text={`STALE ${staleThresholdMonths}MO+`} tone="critical" align="left" />

        {laidOut.map((p, i) => {
          const emphasis = p.segmentLabel === "Champion" || p.segmentLabel === "At Risk";
          return (
            <circle
              key={p.id}
              cx={p.cx}
              cy={p.cy}
              r={p.r}
              fill={p.segmentColor}
              fillOpacity={emphasis ? 0.92 : 0.8}
              stroke={chartColors.surface}
              strokeWidth={1.4}
              filter={`url(#${filterId}-${emphasis ? "glow" : "shadow"})`}
              style={{
                cursor: "default",
                opacity: 1,
                animation: `opm-in .35s cubic-bezier(.16,1,.3,1) ${Math.min(i * 3.5, 420)}ms both`,
              }}
              onMouseEnter={() => setHoveredId(p.id)}
              onMouseLeave={() => setHoveredId((cur) => (cur === p.id ? null : cur))}
            />
          );
        })}
      </svg>
      <style>{`@keyframes opm-in { from { opacity: 0; transform: scale(0.4); transform-box: fill-box; transform-origin: center; } to { opacity: 1; transform: scale(1); } }`}</style>

      {hovered && (
        <div
          className="pointer-events-none absolute z-20"
          style={{
            left: `${(hovered.cx / W) * 100}%`,
            top: `${(hovered.cy / H) * 100}%`,
            transform: `translate(${hovered.cx > W * 0.72 ? "-100%" : hovered.cx < W * 0.18 ? "0%" : "-50%"}, calc(-100% - 14px))`,
          }}
        >
          <TooltipCard
            heading={hovered.name}
            rows={[
              { key: "segment", label: "Segment", value: hovered.segmentLabel, color: hovered.segmentColor, shape: "dot" },
              { key: "value", label: "Lifetime value", value: valueFormatter(hovered.valueAED), color: chartColors.accent },
              { key: "recency", label: "Last purchase", value: `${hovered.recencyMonths} mo ago`, color: chartColors.baseline },
              { key: "freq", label: "Lifetime visits", value: String(hovered.frequency), color: chartColors.baseline },
            ]}
          />
        </div>
      )}
    </div>
  );
}

function ChipLabel({ x, y, text, tone, align }: { x: number; y: number; text: string; tone: "accent" | "critical"; align: "left" | "right" }) {
  const color = tone === "accent" ? chartColors.accentDark : chartColors.critical;
  const bg = tone === "accent" ? chartColors.accentLight : chartColors.criticalTint;
  const w = text.length * 5.6 + 14;
  const tx = align === "right" ? x - w : x;
  return (
    <g transform={`translate(${tx}, ${y - 8})`}>
      <rect width={w} height={16} rx={8} fill={bg} />
      <text x={w / 2} y={11} textAnchor="middle" fontSize={9.5} fontWeight={700} fontFamily="Inter, sans-serif" letterSpacing={0.4} fill={color}>
        {text}
      </text>
    </g>
  );
}
