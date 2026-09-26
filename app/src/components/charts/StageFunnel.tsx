import { useEffect, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { chartColors } from "./chartColors";
import type { FunnelStageDatum } from "@/mock/pipeline";

/**
 * A cohort sales-stage funnel — deals CREATED in the selected period, how
 * many reached each forward stage, and where they exited. Row grammar is
 * CRM's own validated "funnel-as-stacked-rows" pattern (see
 * docs/crm-analysis.md §9.3: label + count, full-width track, fill %, an
 * inline attrition caption), rebuilt in this app's gold/obsidian tokens —
 * deliberately NOT the smooth journey-shape of LifecycleRibbon (Customers'
 * lifecycle isn't a shrinking cohort; this is), and not LeaderboardRows'
 * target-tick bar (there's no external target here, only the stage above).
 * Stages are LS's real physical, showroom-driven sales journey — LS sells
 * exclusively in person, so online sources only ever produce an enquiry,
 * never a transaction (see CLAUDE.md "Business model — physical retail
 * only"). Won/Lost are the funnel's two exits, shown as their own footer
 * cells rather than forced into the progression rows.
 */
export function StageFunnel({
  stages,
  lost,
  valueFormatter,
}: {
  /** Ordered: Enquiries, Product Interest, Showroom Visit, Quotation, Follow-up, Won. */
  stages: FunnelStageDatum[];
  lost: { count: number; valueAED: number };
  valueFormatter: (v: number) => string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const progressionStages = stages.slice(0, 5); // Enquiries / Product Interest / Showroom Visit / Quotation / Follow-up
  const won = stages[5];
  const topCount = progressionStages[0]?.count || 1;

  return (
    <div>
      <div className="flex flex-col gap-4">
        {progressionStages.map((s, i) => {
          const widthPct = (s.count / topCount) * 100;
          const prev = i > 0 ? progressionStages[i - 1] : null;
          const convertedPct = prev && prev.count ? (s.count / prev.count) * 100 : 100;
          const droppedCount = prev ? prev.count - s.count : 0;

          return (
            <div key={s.key}>
              <div className="mb-1.5 flex items-baseline justify-between gap-3">
                <span className="text-[12.5px] font-medium text-[var(--color-ink)]">{s.label}</span>
                <div className="flex items-baseline gap-2">
                  <span className="tabular text-[12.5px] font-semibold text-[var(--color-ink)]">{valueFormatter(s.valueAED)}</span>
                  <span className="font-label text-[11px] text-[var(--color-ink-muted)]">{s.count} deals</span>
                </div>
              </div>
              <div className="h-[9px] w-full rounded-full bg-[var(--color-surface-sunken)]">
                <div
                  className="h-[9px] rounded-full bg-[linear-gradient(180deg,#f0d9a8_0%,var(--color-accent)_55%,var(--color-accent-dark)_100%)] shadow-[0_1px_0_rgba(255,255,255,0.35)_inset]"
                  style={{ width: mounted ? `${widthPct}%` : 0, transition: `width .7s cubic-bezier(.16,1,.3,1) ${i * 110}ms` }}
                />
              </div>
              {prev && (
                <p className="mt-1.5 font-label text-[11px] text-[var(--color-ink-muted)]">
                  <span className="font-semibold text-[var(--color-accent-dark)]">{convertedPct.toFixed(0)}% advanced</span> from{" "}
                  {prev.label}
                  {droppedCount > 0 && <span className="text-[#a12626]"> · {droppedCount} dropped off</span>}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 border-t border-[var(--color-hairline)] pt-4">
        <div className="flex items-center gap-3 rounded-xl bg-[var(--color-accent-light)] px-3.5 py-3">
          <CheckCircle2 size={18} strokeWidth={1.8} className="shrink-0 text-[var(--color-accent-dark)]" />
          <div className="min-w-0">
            <div className="font-label text-[10px] font-semibold uppercase tracking-wide text-[var(--color-accent-dark)]">Won</div>
            <div className="tabular text-[14px] font-semibold text-[var(--color-ink)]">
              {won ? valueFormatter(won.valueAED) : valueFormatter(0)}
              <span className="ml-1.5 font-label text-[11px] font-normal text-[var(--color-ink-muted)]">{won?.count ?? 0} deals</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-[var(--color-critical-tint)] px-3.5 py-3">
          <XCircle size={18} strokeWidth={1.8} className="shrink-0" style={{ color: chartColors.critical }} />
          <div className="min-w-0">
            <div className="font-label text-[10px] font-semibold uppercase tracking-wide" style={{ color: chartColors.critical }}>
              Lost
            </div>
            <div className="tabular text-[14px] font-semibold text-[var(--color-ink)]">
              {valueFormatter(lost.valueAED)}
              <span className="ml-1.5 font-label text-[11px] font-normal text-[var(--color-ink-muted)]">{lost.count} deals</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
