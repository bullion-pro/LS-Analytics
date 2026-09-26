import { useEffect, useState } from "react";
import { chartColors } from "./chartColors";
import { TooltipCard } from "./ChartTooltip";

export interface ShareIndexDatum {
  key: string;
  label: string;
  countSharePct: number; // 0..1
  valueSharePct: number; // 0..1
  /** The category's own identity color (row label dot) — independent of the over/under-index encoding on the moving dot. */
  color: string;
}

/**
 * A dumbbell, not a second stacked bar: the story is "how does this
 * category's share of revenue compare to its share of headcount," and a
 * dumbbell puts that comparison directly on one shared scale — the line's
 * length and direction *is* the over/under-index, instead of asking the
 * reader to cross-reference two separate bars' same-colored segments.
 */
export function ShareIndexDumbbell({
  data,
  countLabel = "Share of customers",
  valueLabel = "Share of revenue",
}: {
  data: ShareIndexDatum[];
  countLabel?: string;
  valueLabel?: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const [hovered, setHovered] = useState<string | null>(null);

  const sorted = [...data].sort((a, b) => b.valueSharePct - a.valueSharePct);
  const domainMax = Math.max(...sorted.flatMap((d) => [d.countSharePct, d.valueSharePct]), 0.01) * 1.25;
  const xPct = (v: number) => (v / domainMax) * 100;
  const rowH = 54;

  return (
    <div>
      <div className="relative" style={{ height: sorted.length * rowH + 4 }}>
        {sorted.map((d, i) => {
          const index = d.countSharePct > 0 ? d.valueSharePct / d.countSharePct : 0;
          const overIndexed = index >= 1;
          const isHovered = hovered === d.key;
          const from = Math.min(xPct(d.countSharePct), xPct(d.valueSharePct));
          const span = Math.abs(xPct(d.valueSharePct) - xPct(d.countSharePct));
          return (
            <div
              key={d.key}
              className="absolute left-0 right-0 flex items-center gap-3"
              style={{ top: i * rowH, height: rowH }}
              onMouseEnter={() => setHovered(d.key)}
              onMouseLeave={() => setHovered(null)}
            >
              <div className="flex w-[86px] shrink-0 items-center gap-1.5">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="truncate text-[12.5px] font-medium text-[var(--color-ink)]">{d.label}</span>
              </div>

              <div className="relative h-full min-w-0 flex-1 cursor-default">
                <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-[var(--color-hairline)]" />

                <div
                  className="absolute top-1/2 h-[3px] -translate-y-1/2 rounded-full transition-[left,width] duration-700 ease-out"
                  style={{
                    left: `${mounted ? from : 0}%`,
                    width: mounted ? `${span}%` : 0,
                    background: overIndexed
                      ? "linear-gradient(90deg, rgba(176,141,79,0.28), var(--color-accent))"
                      : "linear-gradient(90deg, var(--color-baseline), rgba(57,135,229,0.4))",
                  }}
                />

                {/* customer-share dot — neutral, the baseline */}
                <div
                  className="absolute top-1/2 h-[11px] w-[11px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white transition-[left] duration-700 ease-out"
                  style={{
                    left: `${mounted ? xPct(d.countSharePct) : 0}%`,
                    backgroundColor: chartColors.baseline,
                    boxShadow: "0 1px 3px rgba(22,19,15,0.2)",
                  }}
                />

                {/* revenue-share dot — glass, colored by over/under index */}
                <div
                  className="group absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-[left] duration-700 ease-out"
                  style={{
                    left: `${mounted ? xPct(d.valueSharePct) : 0}%`,
                    width: 19,
                    height: 19,
                    backgroundColor: overIndexed ? chartColors.accent : chartColors.seq[400],
                    backgroundImage: "linear-gradient(155deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0) 55%)",
                    boxShadow: isHovered
                      ? `inset 0 -3px 4px rgba(0,0,0,0.16), inset 0 2px 3px rgba(255,255,255,0.55), 0 0 0 5px ${overIndexed ? "rgba(176,141,79,0.18)" : "rgba(57,135,229,0.16)"}`
                      : "inset 0 -3px 4px rgba(0,0,0,0.16), inset 0 2px 3px rgba(255,255,255,0.55), 0 2px 5px rgba(22,19,15,0.18)",
                  }}
                >
                  {isHovered && (
                    <div className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-20 -translate-x-1/2">
                      <TooltipCard
                        heading={d.label}
                        rows={[
                          { key: "count", label: countLabel, value: `${(d.countSharePct * 100).toFixed(1)}%`, color: chartColors.baseline },
                          {
                            key: "value",
                            label: valueLabel,
                            value: `${(d.valueSharePct * 100).toFixed(1)}%`,
                            color: overIndexed ? chartColors.accent : chartColors.seq[400],
                          },
                          { key: "index", label: "Index", value: `${index.toFixed(2)}×`, color: chartColors.ink },
                        ]}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="w-14 shrink-0 text-right">
                <span className={`tabular text-[13px] font-semibold ${overIndexed ? "text-[var(--color-accent-dark)]" : "text-[var(--color-ink-secondary)]"}`}>
                  {index.toFixed(1)}×
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-2.5">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 font-label text-[10.5px] text-[var(--color-ink-muted)]">
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: chartColors.baseline }} />
            {countLabel}
          </span>
          <span className="flex items-center gap-1.5 font-label text-[10.5px] text-[var(--color-ink-muted)]">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: chartColors.accent }} />
            {valueLabel}
          </span>
        </div>
        <span className="font-label text-[10.5px] text-[var(--color-ink-muted)]">× = revenue share ÷ customer share</span>
      </div>
    </div>
  );
}
