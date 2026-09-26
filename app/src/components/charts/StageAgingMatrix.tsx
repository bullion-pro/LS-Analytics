import { useState } from "react";
import { X, AlertTriangle, ShieldCheck, Clock, Sparkles } from "lucide-react";
import { formatAEDCompact, formatNumber } from "@/lib/format";
import type { StageAgingMatrixData } from "@/mock/pipeline";

interface StageAgingMatrixProps {
  data: StageAgingMatrixData;
  valueFormatter?: (v: number) => string;
}

export function StageAgingMatrix({ data, valueFormatter = formatAEDCompact }: StageAgingMatrixProps) {
  const [selectedStageKey, setSelectedStageKey] = useState<string | null>(null);
  const [showStalledModal, setShowStalledModal] = useState(false);

  const { rows, summary } = data;

  // Selected row or active overview
  const activeRow = selectedStageKey ? rows.find((r) => r.stageKey === selectedStageKey) : null;

  return (
    <div className="flex flex-col justify-between h-full">
      {/* ── Top Level: Executive Macro Telemetry ── */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-[var(--color-border)] gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-[15px] font-bold text-[var(--color-ink)]">Stage Velocity &amp; Aging Distribution</h3>
              <span className="text-[9.5px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--color-obsidian)] text-[var(--color-accent-on-obsidian)]">
                2D Thermal Matrix
              </span>
            </div>
            <p className="text-[11.5px] text-[var(--color-ink-muted)] mt-0.5">
              Open capital cross-referenced across 5 conversion gates and 4 aging horizons
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="font-label text-[9px] font-bold uppercase tracking-wider text-[var(--color-ink-muted)]">Active Pool</p>
              <p className="tabular text-[13.5px] font-black text-[var(--color-ink)]">
                {valueFormatter(summary.totalValueAED)}{" "}
                <span className="font-normal text-[11px] text-[var(--color-ink-muted)]">({formatNumber(summary.totalCount)} deals)</span>
              </p>
            </div>
            <div className="w-px h-6 bg-[var(--color-hairline)]" />
            <div className="text-right">
              <p className="font-label text-[9px] font-bold uppercase tracking-wider text-[#168544]">Healthy Velocity</p>
              <p className="tabular text-[13.5px] font-black text-[#168544]">
                {Math.round(summary.freshPct + summary.maturingPct)}%{" "}
                <span className="font-normal text-[10.5px] text-[var(--color-ink-muted)]">&lt;60d</span>
              </p>
            </div>
            <div className="w-px h-6 bg-[var(--color-hairline)]" />
            <div className="text-right">
              <p className="font-label text-[9px] font-bold uppercase tracking-wider text-[#b86d52]">Stalled Capital</p>
              <p className="tabular text-[13.5px] font-black text-[#b86d52]">
                {valueFormatter(summary.stalledValueAED)}{" "}
                <span className="font-normal text-[10.5px] text-[var(--color-ink-muted)]">({summary.stalledCount} deals)</span>
              </p>
            </div>
          </div>
        </div>

        {/* ── Mid Level: Continuous Capital Fluidity Stream ── */}
        <div className="mt-3.5 mb-4">
          <div className="flex items-center justify-between text-[10.5px] font-bold text-[#8a6c38] mb-1.5 uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Sparkles size={13} className="text-[#b08d4f]" />
              Aggregate Capital Fluidity Stream
            </span>
            <span className="text-[var(--color-ink-secondary)] font-medium normal-case">
              {Math.round(summary.freshPct)}% fresh &lt;30d · {Math.round(summary.maturingPct)}% maturing ·{" "}
              {Math.round(summary.stagnantPct)}% stagnant · {Math.round(summary.criticalPct)}% critical
            </span>
          </div>

          <div className="h-2.5 w-full rounded-full bg-[var(--color-surface-sunken)] p-0.5 flex gap-1 shadow-inner border border-[var(--color-hairline)]">
            <div
              className="h-full rounded-full transition-all duration-700 shadow-sm"
              style={{
                width: `${Math.max(summary.freshPct, 4)}%`,
                background: "linear-gradient(90deg, #dfc394 0%, #b08d4f 100%)",
              }}
              title={`0–30 Days: ${valueFormatter(summary.freshValueAED)} (${Math.round(summary.freshPct)}%)`}
            />
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.max(summary.maturingPct, 2)}%`,
                background: "#c8963e",
              }}
              title={`31–60 Days: ${valueFormatter(summary.maturingValueAED)} (${Math.round(summary.maturingPct)}%)`}
            />
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.max(summary.stagnantPct, 2)}%`,
                background: "#b86d52",
              }}
              title={`61–90 Days: ${valueFormatter(summary.stagnantValueAED)} (${Math.round(summary.stagnantPct)}%)`}
            />
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.max(summary.criticalPct, 2)}%`,
                background: "#8b2e2e",
              }}
              title={`90+ Days: ${valueFormatter(summary.criticalValueAED)} (${Math.round(summary.criticalPct)}%)`}
            />
          </div>
        </div>

        {/* ── Core Table: 2D Stage x Aging Thermal Matrix ── */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="font-label text-[9.5px] font-extrabold uppercase tracking-wider text-[#8a6c38] border-b border-[var(--color-border)]">
                <th className="pb-2 font-bold">Conversion Gate</th>
                <th className="pb-2 px-2 text-center">0–30 Days (Fresh)</th>
                <th className="pb-2 px-2 text-center">31–60 Days (Maturing)</th>
                <th className="pb-2 px-2 text-center">61–90 Days (Stagnant)</th>
                <th className="pb-2 px-2 text-center">90+ Days (Critical)</th>
                <th className="pb-2 text-right">Stage Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-hairline)]/50">
              {rows.map((row) => {
                const isSelected = selectedStageKey === row.stageKey;
                const b0 = row.buckets[0];
                const b1 = row.buckets[1];
                const b2 = row.buckets[2];
                const b3 = row.buckets[3];

                return (
                  <tr
                    key={row.stageKey}
                    onClick={() => setSelectedStageKey(isSelected ? null : row.stageKey)}
                    className={`transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-[#dfc394]/[0.15]"
                        : row.hasCritical
                        ? "bg-[#fff7f7]/60 hover:bg-[#fff0f0]"
                        : row.hasStalled
                        ? "bg-[#fff9f6]/60 hover:bg-[#fff2ec]"
                        : "hover:bg-[var(--color-surface-sunken)]/60"
                    }`}
                  >
                    {/* Stage Label */}
                    <td className="py-2 font-medium text-[var(--color-ink)] flex items-center gap-2">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          row.hasCritical
                            ? "bg-[#8b2e2e]"
                            : row.hasStalled
                            ? "bg-[#b86d52]"
                            : "bg-[#b08d4f]"
                        }`}
                      />
                      <span className="font-semibold">{row.stageLabel}</span>
                      {row.hasCritical && (
                        <span className="font-label text-[8.5px] px-1.5 py-0.2 rounded font-black bg-[#8b2e2e]/15 text-[#8b2e2e]">
                          CRITICAL
                        </span>
                      )}
                      {!row.hasCritical && row.hasStalled && (
                        <span className="font-label text-[8.5px] px-1.5 py-0.2 rounded font-black bg-[#b86d52]/15 text-[#b86d52]">
                          STALLED
                        </span>
                      )}
                    </td>

                    {/* Cell 0-30d: Fresh Volume (Champagne Silk) */}
                    <td className="py-2 px-2 text-center">
                      {b0 && b0.valueAED > 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-[#dfc394]/20 text-[var(--color-ink)] font-bold text-[11px] border border-[#dfc394]/35 shadow-xs transition-transform hover:scale-105">
                          <span className="tabular">{valueFormatter(b0.valueAED)}</span>
                          <span className="font-label text-[9.5px] font-normal text-[#8a6c38]">({b0.count})</span>
                        </span>
                      ) : (
                        <span className="text-[var(--color-ink-muted)] text-[11px]">—</span>
                      )}
                    </td>

                    {/* Cell 31-60d: Maturing Volume (Burnished Amber) */}
                    <td className="py-2 px-2 text-center">
                      {b1 && b1.valueAED > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[var(--color-surface-sunken)] text-[var(--color-ink-secondary)] font-semibold text-[11px] border border-[var(--color-border)] shadow-xs transition-transform hover:scale-105">
                          <span className="tabular">{valueFormatter(b1.valueAED)}</span>
                          <span className="font-label text-[9.5px] font-normal text-[var(--color-ink-muted)]">({b1.count})</span>
                        </span>
                      ) : (
                        <span className="text-[var(--color-ink-muted)] text-[11px]">—</span>
                      )}
                    </td>

                    {/* Cell 61-90d: Stagnant Volume (Smoked Topaz Alert) */}
                    <td className="py-2 px-2 text-center">
                      {b2 && b2.valueAED > 0 ? (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowStalledModal(true);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#b86d52]/20 text-[#b86d52] font-black text-[11px] border border-[#b86d52]/40 shadow-xs cursor-pointer transition-transform hover:scale-105"
                          title="Click to inspect stalled opportunities in this stage"
                        >
                          <span className="tabular">{valueFormatter(b2.valueAED)}</span>
                          <span className="font-label text-[9.5px]">({b2.count}) ⚠</span>
                        </span>
                      ) : (
                        <span className="text-[var(--color-ink-muted)] text-[11px]">—</span>
                      )}
                    </td>

                    {/* Cell 90+d: Critical Volume (Deep Garnet Alert) */}
                    <td className="py-2 px-2 text-center">
                      {b3 && b3.valueAED > 0 ? (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowStalledModal(true);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#8b2e2e]/20 text-[#8b2e2e] font-black text-[11px] border border-[#8b2e2e]/40 shadow-xs cursor-pointer transition-transform hover:scale-105"
                          title="Click to inspect critical 90+ day deals"
                        >
                          <span className="tabular">{valueFormatter(b3.valueAED)}</span>
                          <span className="font-label text-[9.5px]">({b3.count}) ⛔</span>
                        </span>
                      ) : (
                        <span className="text-[var(--color-ink-muted)] text-[11px]">—</span>
                      )}
                    </td>

                    {/* Stage Total */}
                    <td className="py-2 text-right tabular font-black text-[var(--color-ink)] text-[12px]">
                      {valueFormatter(row.totalValueAED)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Bottom Level: Executive Diagnostic & Action Bar ── */}
      <div className="mt-3 pt-3 border-t border-[var(--color-hairline)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          {summary.stalledCount > 0 ? (
            <AlertTriangle size={15} className="shrink-0 text-[#b86d52]" />
          ) : (
            <ShieldCheck size={15} className="shrink-0 text-[#168544]" />
          )}
          <p className="text-[var(--color-ink-secondary)] leading-relaxed text-[11.5px]">
            {activeRow ? (
              <>
                <strong className="text-[var(--color-ink)]">{activeRow.stageLabel}:</strong> Holds{" "}
                <strong className="text-[var(--color-ink)]">{valueFormatter(activeRow.totalValueAED)}</strong> across{" "}
                {activeRow.totalCount} deals.{" "}
                {activeRow.hasCritical || activeRow.hasStalled
                  ? "Requires manager intervention on stalled VIP files."
                  : "All deals progressing on standard velocity."}
              </>
            ) : summary.stalledCount > 0 ? (
              <>
                <strong className="text-[var(--color-ink)]">Bottleneck Diagnostic:</strong> Stagnation is pinpointed in{" "}
                <strong className="text-[var(--color-ink)]">
                  {rows.filter((r) => r.hasStalled || r.hasCritical).map((r) => r.stageLabel).join(" & ")}
                </strong>
                . Initial inflow stages maintain 100% turnover.
              </>
            ) : (
              "All active deals are moving at a healthy pace with zero deals exceeding the 60-day stagnation threshold."
            )}
          </p>
        </div>

        {summary.stalledCount > 0 && (
          <button
            type="button"
            onClick={() => setShowStalledModal(true)}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--color-obsidian)] text-[var(--color-accent-on-obsidian)] font-bold text-[11px] hover:bg-[var(--color-obsidian-raised)] transition-all border border-[var(--color-accent-on-obsidian)]/30 shadow-xs cursor-pointer active:scale-95"
          >
            <span>Inspect Stalled Deals ({summary.stalledCount})</span>
            <span>→</span>
          </button>
        )}
      </div>

      {/* ── Modal / Dossier: Stalled Opportunities Review ── */}
      {showStalledModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-hairline)]">
              <div>
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-[#b86d52]" />
                  <h4 className="text-base font-bold text-[var(--color-ink)]">Stalled Pipeline Dossier (60+ Days)</h4>
                </div>
                <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">
                  {summary.stalledCount} high-leverage deals requiring immediate manager requalification
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowStalledModal(false)}
                className="rounded-lg p-1.5 text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-ink)] transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-2.5 max-h-80 overflow-y-auto pr-1">
              {summary.stalledDeals.map((deal) => (
                <div
                  key={deal.id}
                  className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-sunken)] p-3 text-xs"
                >
                  <div>
                    <p className="font-bold text-[var(--color-ink)]">{deal.title}</p>
                    <p className="text-[10.5px] text-[var(--color-ink-muted)]">
                      {deal.accountName} · <span className="font-semibold text-[#8a6c38]">{deal.stage}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="tabular font-black text-[var(--color-ink)] text-sm">{valueFormatter(deal.valueAED)}</p>
                    <p
                      className={`text-[10.5px] font-bold ${
                        deal.daysInStage >= 90 ? "text-[#8b2e2e]" : "text-[#b86d52]"
                      }`}
                    >
                      {deal.daysInStage}d in stage {deal.daysInStage >= 90 ? "⛔" : "⚠"}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 flex items-center justify-between pt-3 border-t border-[var(--color-hairline)]">
              <span className="text-[11px] text-[var(--color-ink-muted)]">
                Total Stalled Capital:{" "}
                <strong className="text-[var(--color-ink)]">{valueFormatter(summary.stalledValueAED)}</strong>
              </span>
              <button
                type="button"
                onClick={() => setShowStalledModal(false)}
                className="px-4 py-1.5 rounded-xl bg-[var(--color-ink)] text-white text-xs font-bold hover:bg-black transition-colors cursor-pointer"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
