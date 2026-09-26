import { useEffect, useId, useState } from "react";
import { chartColors } from "./chartColors";

export interface JourneyStage {
  key: string;
  label: string;
  value: number;
  color: string;
}

function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return "";
  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const dx = (p1.x - p0.x) / 2.4;
    d += ` C${(p0.x + dx).toFixed(1)},${p0.y.toFixed(1)} ${(p1.x - dx).toFixed(1)},${p1.y.toFixed(1)} ${p1.x.toFixed(1)},${p1.y.toFixed(1)}`;
  }
  return d;
}

/**
 * The relationship lifecycle isn't a conversion funnel — these stages partition the *same*
 * active base by where each account currently sits, not a subset that shrinks stage by stage.
 * A ribbon reads that correctly: its silhouette is the *shape* of the base's maturity — where
 * accounts cluster, where they thin out — which a segmented bar or a funnel can't show. The
 * off-path exit (Disengaged / Dormant) is deliberately NOT part of the ribbon — it's rendered
 * as its own compact panel, because it isn't further progress, it's where the journey ends.
 */
export function LifecycleRibbon({
  stages,
  offPath,
  valueFormatter,
  height = 220,
}: {
  stages: JourneyStage[];
  offPath: JourneyStage;
  valueFormatter: (v: number) => string;
  height?: number;
}) {
  const gradientId = useId();
  const [mounted, setMounted] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const W = 560;
  const H = height;
  const padL = 8;
  const padR = 8;
  const padTop = 44;
  const padBottom = 40;
  const plotW = W - padL - padR;
  const plotH = H - padTop - padBottom;
  const n = stages.length;
  const stepX = plotW / (n - 1);
  const maxValue = Math.max(...stages.map((s) => s.value), 1);

  const xFor = (i: number) => padL + i * stepX;
  const yFor = (v: number) => padTop + plotH - (v / maxValue) * plotH;

  const peakPoints = stages.map((s, i) => ({ x: xFor(i), y: yFor(s.value) }));
  const linePath = smoothPath(peakPoints);
  const areaPath = `${linePath} L${xFor(n - 1)},${padTop + plotH} L${xFor(0)},${padTop + plotH} Z`;

  return (
    <div className="flex items-stretch gap-5">
      <div className="min-w-0 flex-1">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} className="overflow-visible">
          <defs>
            <linearGradient id={`${gradientId}-fill`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={chartColors.accent} stopOpacity={0.32} />
              <stop offset="100%" stopColor={chartColors.accent} stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id={`${gradientId}-stroke`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={chartColors.seq[300]} />
              <stop offset="55%" stopColor={chartColors.accent} />
              <stop offset="100%" stopColor={chartColors.accentDark} />
            </linearGradient>
          </defs>

          {/* baseline */}
          <line x1={padL} y1={padTop + plotH} x2={W - padR} y2={padTop + plotH} stroke={chartColors.hairline} strokeWidth={1} />

          <path
            d={areaPath}
            fill={`url(#${gradientId}-fill)`}
            opacity={mounted ? 1 : 0}
            style={{ transition: "opacity .7s ease .15s" }}
          />
          <path
            d={linePath}
            fill="none"
            stroke={`url(#${gradientId}-stroke)`}
            strokeWidth={2.5}
            strokeLinecap="round"
            pathLength={1}
            style={{
              strokeDasharray: 1,
              strokeDashoffset: mounted ? 0 : 1,
              transition: "stroke-dashoffset 1s cubic-bezier(.16,1,.3,1)",
            }}
          />

          {stages.map((s, i) => {
            const { x, y } = peakPoints[i];
            const isHovered = hovered === i;
            return (
              <g
                key={s.key}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  cursor: "default",
                  opacity: mounted ? 1 : 0,
                  transition: `opacity .4s ease ${220 + i * 90}ms`,
                }}
              >
                <line x1={x} y1={y} x2={x} y2={padTop + plotH} stroke={chartColors.accent} strokeWidth={1} strokeDasharray="2 3" opacity={isHovered ? 0.4 : 0} style={{ transition: "opacity .15s ease" }} />
                <circle cx={x} cy={y} r={isHovered ? 5.5 : 4} fill={chartColors.surface} stroke={chartColors.accentDark} strokeWidth={2} style={{ transition: "r .15s ease" }} />
                <text x={x} y={y - 14} textAnchor="middle" fontSize={12} fontWeight={700} fontFamily="Outfit, sans-serif" fill={chartColors.ink}>
                  {valueFormatter(s.value)}
                </text>
                <text
                  x={x}
                  y={padTop + plotH + 20}
                  textAnchor="middle"
                  fontSize={10.5}
                  fontWeight={isHovered ? 700 : 500}
                  fontFamily="Inter, sans-serif"
                  fill={isHovered ? chartColors.ink : chartColors.inkMuted}
                  style={{ transition: "fill .15s ease" }}
                >
                  {s.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Off-path exit — its own panel, not a node on the ribbon */}
      <div
        className="flex w-[132px] shrink-0 flex-col justify-center rounded-xl px-3.5 py-4 text-center"
        style={{ backgroundColor: chartColors.criticalTint, opacity: mounted ? 1 : 0, transition: "opacity .4s ease .5s" }}
      >
        <span className="font-label text-[9.5px] font-semibold uppercase tracking-wide" style={{ color: chartColors.critical }}>
          Exits the journey
        </span>
        <span className="mt-2 text-[26px] font-semibold leading-none" style={{ color: chartColors.critical }}>
          {valueFormatter(offPath.value)}
        </span>
        <span className="mt-1.5 text-[11px] font-medium leading-tight" style={{ color: chartColors.critical, opacity: 0.85 }}>
          {offPath.label}
        </span>
      </div>
    </div>
  );
}
