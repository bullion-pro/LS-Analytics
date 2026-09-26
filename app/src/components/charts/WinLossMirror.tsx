import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { chartColors } from "./chartColors";
import type { WinLossSide } from "@/mock/pipeline";

function MetricRow({
  label,
  value,
  sharePct,
  tone,
  mounted,
  delayMs,
}: {
  label: string;
  value: string;
  sharePct: number;
  tone: "good" | "critical";
  mounted: boolean;
  delayMs: number;
}) {
  const color = tone === "good" ? chartColors.good : chartColors.critical;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-label text-[11px] text-[var(--color-ink-secondary)]">{label}</span>
        <span className="tabular text-[12.5px] font-semibold text-[var(--color-ink)]">{value}</span>
      </div>
      <div className="mt-1 h-[5px] w-full rounded-full bg-[var(--color-surface-sunken)]">
        <div
          className="h-[5px] rounded-full"
          style={{ width: mounted ? `${sharePct}%` : 0, backgroundColor: color, transition: `width .6s cubic-bezier(.16,1,.3,1) ${delayMs}ms` }}
        />
      </div>
    </div>
  );
}

/**
 * Won vs. Lost this period — a mirrored two-panel comparison, the same
 * grammar as CRM's own Consignment In/Out dashboard card (icon chip, title,
 * big headline figure, then metric rows each with their own progress track;
 * see docs/crm-analysis.md §9.7, explicitly flagged there as reusable for
 * "two sides of a flow"). Deliberately not BalanceSheetMirror's stacked-
 * column form — Won and Lost aren't equal by construction, they're the two
 * independent outcomes of the deals that closed this period, so height
 * isn't shared and each side scales to its own total.
 */
export function WinLossMirror({
  won,
  lost,
  valueFormatter,
}: {
  won: WinLossSide;
  lost: WinLossSide;
  valueFormatter: (v: number) => string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const totalCount = won.count + lost.count || 1;
  const totalValue = won.valueAED + lost.valueAED || 1;
  const maxAvgCycle = Math.max(won.avgCycleDays, lost.avgCycleDays, 1);

  return (
    <div className="grid grid-cols-2 gap-4">
      {[
        { side: won, label: "Won", tone: "good" as const, Icon: TrendingUp },
        { side: lost, label: "Lost", tone: "critical" as const, Icon: TrendingDown },
      ].map(({ side, label, tone, Icon }, colIdx) => {
        const color = tone === "good" ? chartColors.good : chartColors.critical;
        const tint = tone === "good" ? "var(--color-good-tint)" : "var(--color-critical-tint)";
        return (
          <div key={label} className="rounded-xl border border-[var(--color-border)] p-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: tint, color }}>
                <Icon size={15} strokeWidth={2} />
              </span>
              <div>
                <div className="text-[13px] font-semibold text-[var(--color-ink)]">{label}</div>
                <div className="font-label text-[10.5px] text-[var(--color-ink-muted)]">{side.count} deals closed</div>
              </div>
            </div>
            <div className="mt-3.5 flex flex-col gap-3">
              <MetricRow
                label="Deal value"
                value={valueFormatter(side.valueAED)}
                sharePct={(side.valueAED / totalValue) * 100}
                tone={tone}
                mounted={mounted}
                delayMs={colIdx * 120}
              />
              <MetricRow
                label="Share of closed deals"
                value={`${Math.round((side.count / totalCount) * 100)}%`}
                sharePct={(side.count / totalCount) * 100}
                tone={tone}
                mounted={mounted}
                delayMs={colIdx * 120 + 80}
              />
              <MetricRow
                label="Avg. sales cycle"
                value={`${side.avgCycleDays}d`}
                sharePct={(side.avgCycleDays / maxAvgCycle) * 100}
                tone={tone}
                mounted={mounted}
                delayMs={colIdx * 120 + 160}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
