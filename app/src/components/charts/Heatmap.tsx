import { Fragment, useState } from "react";
import { chartColors } from "./chartColors";
import { TooltipCard } from "./ChartTooltip";

export interface HeatmapCell {
  rowKey: string;
  colKey: string;
  value: number;
}

/**
 * Floating glass tiles over a faint graph-paper backdrop, intensity read as a
 * continuous white -> sequential-blue mix (still the dataviz skill's
 * validated sequential ramp — only the tile material changed, not the hue).
 */
function tileBackground(share: number): string {
  return `color-mix(in oklab, ${chartColors.seq[700]} ${Math.round(share * 100)}%, white)`;
}

export function Heatmap({
  rows,
  cols,
  cells,
  valueFormatter,
  labelWidth = 104,
  valueLabel = "Revenue",
}: {
  rows: { key: string; label: string }[];
  cols: { key: string; label: string }[];
  cells: HeatmapCell[];
  valueFormatter: (v: number) => string;
  /** Width reserved for row labels — widen for longer names (e.g. expense categories vs. branch names). */
  labelWidth?: number;
  /** Tooltip row label — defaults to "Revenue" (this component's original, only use to date).
   *  Any non-revenue heatmap (expense, count, etc.) must pass its own label explicitly. */
  valueLabel?: string;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const byKey = new Map(cells.map((c) => [`${c.rowKey}:${c.colKey}`, c.value]));
  const max = Math.max(...cells.map((c) => c.value), 1);
  const min = Math.min(...cells.map((c) => c.value), 0);

  return (
    <div>
      <div
        className="rounded-2xl p-3"
        style={{
          backgroundImage:
            "linear-gradient(var(--color-hairline) 1px, transparent 1px), linear-gradient(90deg, var(--color-hairline) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
          backgroundColor: "var(--color-surface-sunken)",
        }}
      >
        <div className="grid gap-[7px]" style={{ gridTemplateColumns: `${labelWidth}px repeat(${cols.length}, 1fr)` }}>
          <div />
          {cols.map((c) => (
            <div key={c.key} className="pb-1.5 text-center font-label text-[10px] font-medium text-[var(--color-ink-muted)]">
              {c.label}
            </div>
          ))}
          {rows.map((r) => (
            <Fragment key={r.key}>
              <div className="flex items-center truncate pr-2 text-[11.5px] font-medium text-[var(--color-ink-secondary)]">
                {r.label}
              </div>
              {cols.map((c) => {
                const value = byKey.get(`${r.key}:${c.key}`) ?? 0;
                const share = max === min ? 0.5 : (value - min) / (max - min);
                const cellId = `${r.key}:${c.key}`;
                const isHovered = hovered === cellId;
                const glow = 0.08 + share * 0.3;
                return (
                  <div
                    key={cellId}
                    className="group relative aspect-[1.3] cursor-default rounded-[12px] border border-white/70 backdrop-blur-[2px] transition-[transform,box-shadow] duration-200 ease-out"
                    style={{
                      background: `linear-gradient(135deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.05) 45%, rgba(255,255,255,0) 65%), ${tileBackground(share)}`,
                      boxShadow: isHovered
                        ? `inset 0 1px 0 rgba(255,255,255,0.85), inset 0 -8px 12px -8px rgba(13,54,107,0.22), 0 10px 18px -8px rgba(37,106,191,${glow + 0.18})`
                        : `inset 0 1px 0 rgba(255,255,255,0.75), inset 0 -6px 10px -8px rgba(13,54,107,0.16), 0 4px 10px -6px rgba(37,106,191,${glow})`,
                      transform: isHovered ? "translateY(-2px) scale(1.03)" : "none",
                    }}
                    onMouseEnter={() => setHovered(cellId)}
                    onMouseLeave={() => setHovered(null)}
                  >
                    {isHovered && (
                      <div className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-20 -translate-x-1/2">
                        <TooltipCard
                          heading={`${r.label} · ${c.label}`}
                          rows={[{ key: cellId, label: valueLabel, value: valueFormatter(value), color: chartColors.seq[500] }]}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-end gap-2">
        <span className="font-label text-[10.5px] text-[var(--color-ink-muted)]">Lower</span>
        <div className="h-2 w-28 rounded-full" style={{ background: `linear-gradient(90deg, white, ${chartColors.seq[700]})` }} />
        <span className="font-label text-[10.5px] text-[var(--color-ink-muted)]">Higher</span>
      </div>
    </div>
  );
}
