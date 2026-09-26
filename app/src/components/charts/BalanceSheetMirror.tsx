import { useState } from "react";
import { chartColors } from "./chartColors";
import { ChartLegend } from "./ChartLegend";
import { TooltipCard } from "./ChartTooltip";

export interface MirrorSegment {
  key: string;
  label: string;
  value: number;
}

export interface MirrorColumn {
  title: string;
  segments: MirrorSegment[];
}

function MirrorBarColumn({
  col,
  side,
  total,
  scale,
  height,
  valueFormatter,
  hovered,
  onHover,
}: {
  col: MirrorColumn;
  side: "left" | "right";
  total: number;
  scale: number;
  height: number;
  valueFormatter: (v: number) => string;
  hovered: string | null;
  onHover: (id: string | null) => void;
}) {
  return (
    <div className="flex w-full max-w-[160px] flex-col items-center">
      <span className="mb-2 tabular text-[13px] font-semibold text-[var(--color-ink)]">{valueFormatter(total)}</span>
      <div className="flex w-full flex-col-reverse gap-[2px]" style={{ height }}>
        {col.segments.map((s, i) => {
          const heightPct = (s.value / scale) * 100;
          if (heightPct <= 0) return null;
          const color = chartColors.cat[i % chartColors.cat.length];
          const id = `${side}-${s.key}`;
          const isHovered = hovered === id;
          const share = s.value / total;
          return (
            <div
              key={s.key}
              className="group relative flex min-h-[4px] items-center justify-center overflow-hidden rounded-[4px] transition-opacity"
              style={{
                height: `${heightPct}%`,
                backgroundColor: color,
                backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 45%)",
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)",
                opacity: hovered && !isHovered ? 0.55 : 1,
              }}
              onMouseEnter={() => onHover(id)}
              onMouseLeave={() => onHover(null)}
            >
              {heightPct > 11 && (
                <span className="px-1 text-center font-label text-[10.5px] font-semibold leading-tight text-white/95">
                  {Math.round(share * 100)}%
                </span>
              )}
              {isHovered && (
                <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 ml-3 -translate-y-1/2">
                  <TooltipCard
                    rows={[{ key: s.key, label: s.label, value: `${valueFormatter(s.value)} · ${(share * 100).toFixed(1)}%`, color, shape: "rect" }]}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <span className="mt-2.5 font-label text-[10.5px] font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
        {col.title}
      </span>
    </div>
  );
}

/**
 * The balance sheet's own canonical form — two stacked columns of equal
 * height, because assets and liabilities+equity are equal by construction.
 * Distinct from CompositionBar (single horizontal bar, one whole) on
 * purpose: this is two wholes shown side by side specifically to make the
 * "assets = how they're financed" identity visible, not just another
 * part-to-whole read.
 */
export function BalanceSheetMirror({
  left,
  right,
  valueFormatter,
  height = 260,
}: {
  left: MirrorColumn;
  right: MirrorColumn;
  valueFormatter: (v: number) => string;
  height?: number;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const leftTotal = left.segments.reduce((a, s) => a + s.value, 0) || 1;
  const rightTotal = right.segments.reduce((a, s) => a + s.value, 0) || 1;
  const scale = Math.max(leftTotal, rightTotal);

  const legendItems = [
    ...left.segments.map((s, i) => ({ key: `left-${s.key}`, label: s.label, color: chartColors.cat[i % chartColors.cat.length], shape: "rect" as const })),
    ...right.segments.map((s, i) => ({ key: `right-${s.key}`, label: s.label, color: chartColors.cat[i % chartColors.cat.length], shape: "rect" as const })),
  ];

  return (
    <div>
      <div className="flex items-center justify-center gap-8">
        <MirrorBarColumn col={left} side="left" total={leftTotal} scale={scale} height={height} valueFormatter={valueFormatter} hovered={hovered} onHover={setHovered} />
        <span className="text-[15px] font-semibold text-[var(--color-ink-muted)]">=</span>
        <MirrorBarColumn col={right} side="right" total={rightTotal} scale={scale} height={height} valueFormatter={valueFormatter} hovered={hovered} onHover={setHovered} />
      </div>
      <div className="mt-4 flex justify-center">
        <ChartLegend items={legendItems} />
      </div>
    </div>
  );
}
