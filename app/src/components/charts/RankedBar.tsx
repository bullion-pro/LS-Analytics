import { useState } from "react";
import { chartColors } from "./chartColors";

export interface RankedBarDatum {
  key: string;
  label: string;
  sublabel?: string;
  value: number;
  secondaryValue?: string;
}

/**
 * Hand-built horizontal ranked bar — magnitude comparison with the leader in
 * accent and the field in a neutral tone (emphasis form), never a generated
 * hue per row. 24px cap, 4px rounded data-end, value at the tip.
 */
export function RankedBar({
  data,
  valueFormatter,
  highlightTop = true,
}: {
  data: RankedBarDatum[];
  valueFormatter: (v: number) => string;
  highlightTop?: boolean;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="flex flex-col gap-3.5">
      {data.map((d, i) => {
        const isLeader = highlightTop && i === 0;
        const widthPct = Math.max(3, (d.value / max) * 100);
        const isHovered = hovered === d.key;
        return (
          <div
            key={d.key}
            className="group cursor-default"
            onMouseEnter={() => setHovered(d.key)}
            onMouseLeave={() => setHovered(null)}
          >
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <div className="flex min-w-0 items-baseline gap-1.5">
                <span className="font-label text-[10px] font-semibold tabular text-[var(--color-ink-muted)]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="truncate text-[12.5px] font-medium text-[var(--color-ink)]">{d.label}</span>
                {d.sublabel && (
                  <span className="shrink-0 font-label text-[11px] text-[var(--color-ink-muted)]">{d.sublabel}</span>
                )}
              </div>
              <div className="flex shrink-0 items-baseline gap-1.5">
                {d.secondaryValue && (
                  <span className="font-label text-[11px] text-[var(--color-ink-muted)]">{d.secondaryValue}</span>
                )}
                <span className="tabular text-[12.5px] font-semibold text-[var(--color-ink)]">
                  {valueFormatter(d.value)}
                </span>
              </div>
            </div>
            <div className="h-2 w-full rounded-full bg-[var(--color-surface-sunken)]">
              <div
                className="h-2 rounded-full transition-[width,opacity] duration-300"
                style={{
                  width: `${widthPct}%`,
                  backgroundImage: isLeader
                    ? "linear-gradient(180deg, #f0d9a8 0%, var(--color-accent) 55%, var(--color-accent-dark) 100%)"
                    : `linear-gradient(180deg, color-mix(in srgb, ${chartColors.baseline} 100%, white 25%), ${chartColors.baseline})`,
                  opacity: isHovered ? 1 : isLeader ? 0.95 : 0.75,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
