import { useEffect, useState } from "react";
import { chartColors } from "./chartColors";
import { TooltipCard } from "./ChartTooltip";

export interface ChannelDatum {
  key: string;
  label: string;
  avgValueAED: number;
  count: number;
  countSharePct: number;
}

/**
 * A Cleveland dot plot — one row per channel, dot position = average customer value, dot size =
 * volume. Deliberately not another segmented bar (this page already uses CompositionBar twice
 * above it): position-on-a-shared-scale is the more precise way to compare a value metric across
 * few categories, and size-encoding volume in the same mark shows "big channel, modest value" vs.
 * "small channel, high value" in one glance, which a stacked bar's single length can't.
 */
export function ChannelQualityDots({
  data,
  valueFormatter,
  height,
}: {
  data: ChannelDatum[];
  valueFormatter: (v: number) => string;
  height?: number;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const [hovered, setHovered] = useState<string | null>(null);

  const sorted = [...data].sort((a, b) => b.avgValueAED - a.avgValueAED);
  const maxValue = Math.max(...sorted.map((d) => d.avgValueAED), 1);
  const domainMax = maxValue * 1.12;
  const avgOfAvgs = sorted.reduce((a, d) => a + d.avgValueAED, 0) / (sorted.length || 1);
  const maxCount = Math.max(...sorted.map((d) => d.count), 1);
  const rowH = 34;
  const chartHeight = height ?? sorted.length * rowH + 28;

  const radiusFor = (count: number) => 4.5 + Math.sqrt(count / maxCount) * 8;
  const xPct = (v: number) => (v / domainMax) * 100;

  return (
    <div>
      <div className="relative" style={{ height: chartHeight }}>
        {/* Average reference line */}
        <div
          className="absolute top-0 bottom-6 w-px border-l border-dashed"
          style={{ left: `${xPct(avgOfAvgs)}%`, borderColor: chartColors.baseline, opacity: mounted ? 1 : 0, transition: "opacity .4s ease .5s" }}
        />
        <span
          className="absolute -top-0.5 -translate-x-1/2 whitespace-nowrap font-label text-[9.5px] text-[var(--color-ink-muted)]"
          style={{ left: `${xPct(avgOfAvgs)}%`, opacity: mounted ? 1 : 0, transition: "opacity .4s ease .5s" }}
        >
          avg
        </span>

        {sorted.map((d, i) => {
          const isHovered = hovered === d.key;
          const r = radiusFor(d.count);
          const isAbove = d.avgValueAED >= avgOfAvgs;
          // A channel with only a handful of accounts can swing on one or two outliers — shown
          // honestly (position and size are real), but visually receded so it doesn't compete
          // with well-sampled channels for the eye's first read.
          const lowConfidence = d.count < 15;
          return (
            <div key={d.key} className="absolute left-0 right-0 flex items-center" style={{ top: 20 + i * rowH, height: rowH }}>
              <div className="flex w-[132px] shrink-0 flex-col pr-3">
                <span className="truncate text-[12px] font-medium text-[var(--color-ink)]">{d.label}</span>
                <span className="font-label text-[10px] text-[var(--color-ink-muted)]">{Math.round(d.countSharePct * 100)}% of accounts</span>
              </div>
              <div className="relative h-full min-w-0 flex-1">
                <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-[var(--color-hairline)]" />
                <div
                  className="group absolute top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-default rounded-full"
                  style={{
                    left: mounted ? `${xPct(d.avgValueAED)}%` : "0%",
                    width: r * 2,
                    height: r * 2,
                    backgroundColor: isAbove ? chartColors.accent : chartColors.seq[400],
                    backgroundImage: "linear-gradient(155deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0) 55%)",
                    boxShadow: isHovered
                      ? `inset 0 -3px 4px rgba(0,0,0,0.16), inset 0 2px 3px rgba(255,255,255,0.55), 0 0 0 4px ${isAbove ? "rgba(176,141,79,0.18)" : "rgba(57,135,229,0.16)"}`
                      : "inset 0 -3px 4px rgba(0,0,0,0.16), inset 0 2px 3px rgba(255,255,255,0.55), 0 2px 4px rgba(22,19,15,0.14)",
                    opacity: lowConfidence ? 0.45 : 1,
                    transition: `left .8s cubic-bezier(.16,1,.3,1) ${i * 60}ms, box-shadow .2s ease, opacity .2s ease`,
                  }}
                  onMouseEnter={() => setHovered(d.key)}
                  onMouseLeave={() => setHovered(null)}
                >
                  {isHovered && (
                    <div className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-20 -translate-x-1/2">
                      <TooltipCard
                        heading={d.label}
                        rows={[
                          { key: "value", label: "Avg. value / customer", value: valueFormatter(d.avgValueAED), color: chartColors.accent },
                          {
                            key: "count",
                            label: "Accounts",
                            value: `${d.count} (${Math.round(d.countSharePct * 100)}%)${lowConfidence ? " — small sample" : ""}`,
                            color: chartColors.baseline,
                          },
                        ]}
                      />
                    </div>
                  )}
                </div>
              </div>
              <span className="w-16 shrink-0 pl-2 text-right tabular text-[11.5px] font-medium text-[var(--color-ink-secondary)]">
                {valueFormatter(d.avgValueAED)}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-4 border-t border-[var(--color-border)] pt-2.5">
        <span className="flex items-center gap-1.5 font-label text-[10.5px] text-[var(--color-ink-muted)]">
          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: chartColors.accent }} />
          Above-average value
        </span>
        <span className="flex items-center gap-1.5 font-label text-[10.5px] text-[var(--color-ink-muted)]">
          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: chartColors.seq[400] }} />
          Below average
        </span>
        <span className="font-label text-[10.5px] text-[var(--color-ink-muted)]">Dot size = number of accounts</span>
      </div>
    </div>
  );
}
