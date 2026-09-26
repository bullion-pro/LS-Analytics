import { useState } from "react";
import { TooltipCard } from "./ChartTooltip";

export interface SeverityBucket {
  key: string;
  label: string;
  value: number;
  color: string;
}

/**
 * A fixed-order 100%-stacked bar for ordinal severity data (aging buckets) —
 * order is the story (escalating risk), never resorted by magnitude. Reuses
 * the status ramp so color always means the same thing across the product.
 */
export function SeverityCompositionBar({
  buckets,
  valueFormatter,
  height = 34,
  compact = false,
}: {
  buckets: SeverityBucket[];
  valueFormatter: (v: number) => string;
  height?: number;
  compact?: boolean;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const total = buckets.reduce((a, b) => a + b.value, 0) || 1;

  return (
    <div className="flex w-full gap-[2px]" style={{ height }}>
      {buckets.map((b) => {
        const share = b.value / total;
        const widthPct = share * 100;
        if (widthPct <= 0) return null;
        const isHovered = hovered === b.key;
        return (
          <div
            key={b.key}
            className="group relative flex min-w-[4px] items-center justify-center overflow-hidden rounded-[3px] transition-opacity"
            style={{
              width: `${widthPct}%`,
              backgroundColor: b.color,
              backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 45%)",
              boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)",
              opacity: hovered && !isHovered ? 0.55 : 1,
            }}
            onMouseEnter={() => setHovered(b.key)}
            onMouseLeave={() => setHovered(null)}
          >
            {!compact && widthPct > 12 && (
              <span className="px-1 text-center font-label text-[10.5px] font-semibold leading-tight text-white/95">
                {Math.round(share * 100)}%
              </span>
            )}
            {isHovered && (
              <div className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-20 -translate-x-1/2">
                <TooltipCard
                  rows={[{ key: b.key, label: b.label, value: valueFormatter(b.value), color: b.color, shape: "rect" }]}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
