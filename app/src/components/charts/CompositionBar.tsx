import { useState } from "react";
import { chartColors } from "./chartColors";
import { ChartLegend } from "./ChartLegend";
import { TooltipCard } from "./ChartTooltip";

export interface CompositionDatum {
  key: string;
  label: string;
  value: number;
}

const OTHER_COLOR = "#a39c8c";

/**
 * A single 100%-stacked horizontal bar — the part-to-whole form for many/
 * long-named categories (never a donut). Categorical hues, fixed order,
 * capped at 7 + "Other"; 2px surface gaps between segments; direct labels
 * only where they fit.
 */
export function CompositionBar({
  data,
  valueFormatter,
  height = 40,
  colorOverrides,
  showLegend = true,
}: {
  data: CompositionDatum[];
  valueFormatter: (v: number) => string;
  height?: number;
  /** Pin specific keys to specific hexes — for when the same categories appear in more than
   *  one CompositionBar on a page (e.g. "share of customers" vs "share of revenue") and must
   *  read as the same color in both, regardless of which segment sorts largest in each. */
  colorOverrides?: Record<string, string>;
  showLegend?: boolean;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const top = sorted.slice(0, 7);
  const rest = sorted.slice(7);
  const otherValue = rest.reduce((a, d) => a + d.value, 0);
  const segments = otherValue > 0 ? [...top, { key: "__other", label: "Other", value: otherValue }] : top;

  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  const colored = segments.map((s, i) => ({
    ...s,
    color: s.key === "__other" ? OTHER_COLOR : (colorOverrides?.[s.key] ?? chartColors.cat[i % chartColors.cat.length]),
    share: s.value / total,
  }));

  return (
    <div>
      <div className="flex w-full gap-[2px]" style={{ height }}>
        {colored.map((s) => {
          const widthPct = s.share * 100;
          const showLabel = widthPct > 9;
          const isHovered = hovered === s.key;
          return (
            <div
              key={s.key}
              className="group relative flex min-w-[6px] items-center justify-center overflow-hidden rounded-[4px] transition-opacity"
              style={{
                width: `${widthPct}%`,
                backgroundColor: s.color,
                backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 45%)",
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08), inset 0 -3px 6px rgba(0,0,0,0.08)",
                opacity: hovered && !isHovered ? 0.55 : 1,
              }}
              onMouseEnter={() => setHovered(s.key)}
              onMouseLeave={() => setHovered(null)}
            >
              {showLabel && (
                <span className="px-1.5 text-center font-label text-[11px] font-semibold leading-tight text-white/95">
                  {Math.round(s.share * 100)}%
                </span>
              )}
              {isHovered && (
                <div className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-10 -translate-x-1/2">
                  <TooltipCard
                    rows={[
                      {
                        key: s.key,
                        label: s.label,
                        value: `${valueFormatter(s.value)} · ${(s.share * 100).toFixed(1)}%`,
                        color: s.color,
                        shape: "rect",
                      },
                    ]}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
      {showLegend && (
        <div className="mt-3.5">
          <ChartLegend items={colored.map((s) => ({ key: s.key, label: s.label, color: s.color, shape: "rect" }))} />
        </div>
      )}
    </div>
  );
}
