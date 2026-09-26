import { useState } from "react";
import { DeltaPill } from "@/components/ui/DeltaPill";
import { formatAEDCompact, formatNumber, formatPct, type Delta } from "@/lib/format";
import type { FunnelStageDatum, PipelineHeroTotals } from "@/mock/pipeline";

export interface HorizonCascadeProps {
  hero: PipelineHeroTotals;
  weightedDelta?: Delta;
  countDelta?: Delta;
  avgDealDelta?: Delta;
  winRate: number;
  winRateDelta?: Delta;
  stages: FunnelStageDatum[];
  cohortSize?: number;
  cohortWinPct?: number;
  periodLabel?: string;
}

const STAGE_METADATA: {
  tag: string;
  vipBadge?: string;
  insight: string;
  conversionFactor: string;
}[] = [
  {
    tag: "01 · Inflow",
    insight: "Top-of-funnel acquisition: Initial enquiries qualified through boutique concierge & high-intent campaigns.",
    conversionFactor: "10% baseline",
  },
  {
    tag: "02 · Intent",
    insight: "Intent verification: 90% retention rate indicates strong product resonance and qualified buyer profile.",
    conversionFactor: "25% factor",
  },
  {
    tag: "03 · High VIP",
    vipBadge: "VIP GATE",
    insight: "Highest leverage conversion checkpoint: In-person showroom visits unlock over 85% forward momentum.",
    conversionFactor: "50% factor",
  },
  {
    tag: "04 · Pricing",
    insight: "Proposal & commercial negotiation: High-ticket custom commissions and investment pieces in review.",
    conversionFactor: "70% factor",
  },
  {
    tag: "05 · Closing",
    vipBadge: "SETTLEMENT",
    insight: "Final contract execution and settlement pipeline commanding immediate near-term cash realization.",
    conversionFactor: "85% factor",
  },
];

export function HorizonCascade({
  hero,
  weightedDelta,
  countDelta,
  avgDealDelta,
  winRate,
  winRateDelta,
  stages,
  cohortWinPct = 0.48,
  periodLabel = "last 30 days",
}: HorizonCascadeProps) {
  const [selectedStageIdx, setSelectedStageIdx] = useState<number | null>(null);

  // Take the 5 progression stages
  const activeStages = stages.slice(0, 5);
  const baseCount = activeStages[0]?.count || 1;

  // Selected stage or default macro view
  const selectedStage = selectedStageIdx !== null ? activeStages[selectedStageIdx] : null;
  const selectedMeta = selectedStageIdx !== null ? STAGE_METADATA[selectedStageIdx] : null;

  return (
    <div
      className="relative overflow-hidden rounded-[26px] p-6 lg:p-8"
      style={{
        background: "linear-gradient(135deg, #f5ebd5 0%, #eee1cb 35%, #e9ddd8 70%, #ded6e0 100%)",
        border: "1px solid rgba(217, 185, 120, 0.5)",
        boxShadow:
          "0 20px 50px rgba(176, 141, 79, 0.16), inset 0 2px 0 rgba(255, 255, 255, 0.9), inset 0 -1px 0 rgba(22, 19, 15, 0.04)",
      }}
    >
      {/* Specular Ambient Light Sheen */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(55% 60% at 12% -6%, rgba(255,255,255,0.85), transparent 60%), radial-gradient(40% 45% at 88% 105%, rgba(217,185,120,0.22), transparent 50%), linear-gradient(115deg, rgba(255,255,255,0.35) 0%, transparent 40%)",
        }}
      />

      <style>{`
        @keyframes streamWave {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        .stream-shimmer {
          background: linear-gradient(90deg, #b08d4f 0%, #e2be7e 50%, #b08d4f 100%);
          background-size: 200% 100%;
          animation: streamWave 3s linear infinite;
        }
      `}</style>

      <div className="relative z-10 flex flex-col gap-6">
        {/* ── Top Level: Executive Headline & Micro-Telemetry Capsules ── */}
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-[#8a6c38]">
                {selectedStage ? `Stage Telemetry · ${selectedStage.label}` : "Weighted Realizable Capital · Active Velocity"}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-[rgba(176,141,79,0.35)] bg-[rgba(176,141,79,0.15)] px-2.5 py-0.5 font-label text-[9.5px] font-bold tracking-wider text-[#705322]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#168544] animate-pulse" />
                {selectedStage ? selectedMeta?.conversionFactor : "LIVE HORIZON"}
              </span>
              {selectedStage && (
                <button
                  type="button"
                  onClick={() => setSelectedStageIdx(null)}
                  className="rounded-md border border-[rgba(176,141,79,0.3)] bg-white/70 px-2 py-0.5 text-[10px] font-bold text-[#8a6c38] transition hover:bg-white hover:text-[#16130f]"
                >
                  Reset to Macro
                </button>
              )}
            </div>

            <div className="mt-2 flex flex-wrap items-baseline gap-3.5">
              <span className="text-[38px] font-black leading-none tracking-[-0.04em] text-[#16130f] lg:text-[46px]">
                {selectedStage ? formatAEDCompact(selectedStage.valueAED) : formatAEDCompact(hero.weightedValueAED)}
              </span>
              {!selectedStage && weightedDelta && <DeltaPill delta={weightedDelta} />}
              {selectedStage && (
                <span className="rounded-lg border border-[rgba(22,133,68,0.25)] bg-[rgba(22,133,68,0.12)] px-2.5 py-1 text-[11.5px] font-bold text-[#168544]">
                  {formatNumber(selectedStage.count)} deals ({Math.round((selectedStage.count / baseCount) * 100)}% volume)
                </span>
              )}
            </div>

            <p className="mt-2 max-w-xl text-[12.5px] text-[#6b6254] leading-relaxed">
              {selectedStage ? (
                <>
                  <strong className="text-[#16130f]">{selectedStage.label}</strong> currently commands{" "}
                  <strong className="text-[#16130f]">{formatAEDCompact(selectedStage.valueAED)}</strong> across{" "}
                  <strong className="text-[#16130f]">{formatNumber(selectedStage.count)}</strong> opportunities with an
                  estimated realizable discount factor of <strong className="text-[#16130f]">{selectedMeta?.conversionFactor}</strong>.
                </>
              ) : (
                <>
                  <strong className="text-[#16130f]">{formatAEDCompact(hero.openValueAED)}</strong> unweighted pool
                  across <strong className="text-[#16130f]">{formatNumber(hero.openCount)}</strong> active opportunities
                  discount-weighted through 5 conversion stages into liquid forecast.
                </>
              )}
            </p>
          </div>

          {/* 3 Executive Satellite Micro-Capsules */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5">
            <div className="rounded-2xl border border-[rgba(217,185,120,0.45)] bg-white/85 p-3 text-right shadow-[0_4px_14px_rgba(176,141,79,0.08)] backdrop-blur-sm sm:p-4">
              <div className="font-label text-[9px] font-bold uppercase tracking-[0.08em] text-[#857c6d] sm:text-[10px]">
                Active Deals
              </div>
              <div className="mt-1 text-[20px] font-black text-[#16130f] sm:text-[24px]">
                {formatNumber(hero.openCount)}
              </div>
              <div className="mt-0.5 text-[9.5px] font-bold text-[#168544] sm:text-[10.5px]">
                {countDelta ? `↗ ${countDelta.value >= 0 ? "+" : ""}${Math.round(countDelta.value * 100)}% active` : "In flight"}
              </div>
            </div>

            <div className="rounded-2xl border border-[rgba(217,185,120,0.45)] bg-white/85 p-3 text-right shadow-[0_4px_14px_rgba(176,141,79,0.08)] backdrop-blur-sm sm:p-4">
              <div className="font-label text-[9px] font-bold uppercase tracking-[0.08em] text-[#857c6d] sm:text-[10px]">
                Avg Deal Size
              </div>
              <div className="mt-1 text-[20px] font-black text-[#16130f] sm:text-[24px]">
                {formatAEDCompact(hero.avgDealSizeAED)}
              </div>
              <div className="mt-0.5 text-[9.5px] font-bold text-[#168544] sm:text-[10.5px]">
                {avgDealDelta ? `↗ ${avgDealDelta.value >= 0 ? "+" : ""}${Math.round(avgDealDelta.value * 100)}% size` : "Per opportunity"}
              </div>
            </div>

            <div className="rounded-2xl border border-[rgba(217,185,120,0.45)] bg-white/85 p-3 text-right shadow-[0_4px_14px_rgba(176,141,79,0.08)] backdrop-blur-sm sm:p-4">
              <div className="font-label text-[9px] font-bold uppercase tracking-[0.08em] text-[#857c6d] sm:text-[10px]">
                Win Velocity
              </div>
              <div className="mt-1 text-[20px] font-black text-[#16130f] sm:text-[24px]">
                {formatPct(winRate, 0)}
              </div>
              <div className="mt-0.5 text-[9.5px] font-bold text-[#168544] sm:text-[10.5px]">
                {winRateDelta ? `↗ ${winRateDelta.value >= 0 ? "+" : ""}${Math.round(winRateDelta.value * 100)}% win` : `${periodLabel} closed`}
              </div>
            </div>
          </div>
        </div>

        {/* ── Mid Level: Interactive Stage Stream Horizon ── */}
        <div>
          <div className="mb-2.5 flex items-center justify-between">
            <span className="font-label text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#8a6c38]">
              Deal Flow Progression · 5 Conversion Gates
            </span>
            <span className="font-label text-[11px] text-[#7a7263]">
              Click any stage node to inspect weight &amp; velocity
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {activeStages.map((stage, idx) => {
              const meta = STAGE_METADATA[idx] || { tag: `0${idx + 1}`, insight: "", conversionFactor: "" };
              const isSelected = selectedStageIdx === idx;
              const prevStage = idx > 0 ? activeStages[idx - 1] : null;
              const stepRetentionPct = prevStage?.count
                ? Math.round((stage.count / prevStage.count) * 100)
                : 100;
              const volumePct = Math.round((stage.count / baseCount) * 100);

              return (
                <button
                  key={stage.key}
                  type="button"
                  onClick={() => setSelectedStageIdx(isSelected ? null : idx)}
                  className={`group relative flex flex-col justify-between overflow-hidden rounded-[18px] p-4 text-left transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? "border-[#b08d4f] bg-white ring-2 ring-[#b08d4f] shadow-[0_12px_32px_rgba(176,141,79,0.26)]"
                      : "border border-[rgba(217,185,120,0.42)] bg-white/80 hover:-translate-y-1 hover:border-[#b08d4f] hover:bg-white hover:shadow-[0_10px_26px_rgba(176,141,79,0.18)]"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-label text-[9.5px] font-bold uppercase tracking-wider text-[#8a6c38]">
                        {meta.tag}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 font-label text-[9px] font-bold ${
                          idx === 0
                            ? "bg-[rgba(176,141,79,0.15)] text-[#8a6c38]"
                            : stepRetentionPct >= 85
                            ? "bg-[rgba(22,133,68,0.12)] text-[#168544]"
                            : "bg-[rgba(176,141,79,0.15)] text-[#705322]"
                        }`}
                      >
                        {idx === 0 ? "100% Vol" : `${stepRetentionPct}% Ret`}
                      </span>
                    </div>

                    <div className="mt-2 text-[13.5px] font-bold text-[#16130f] group-hover:text-[#8a6c38] transition-colors">
                      {stage.label}
                    </div>
                    <div className="mt-1 text-[18px] font-black tracking-tight text-[#16130f]">
                      {formatAEDCompact(stage.valueAED)}
                    </div>
                    <div className="font-label text-[10px] text-[#857c6d]">
                      {formatNumber(stage.count)} opportunities
                    </div>
                  </div>

                  {/* Flow Fill Progress Bar */}
                  <div className="mt-3">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[rgba(22,19,15,0.07)]">
                      <div
                        className="h-full rounded-full stream-shimmer transition-all duration-700"
                        style={{ width: `${Math.max(volumePct, 8)}%` }}
                      />
                    </div>
                    <div className="mt-1 flex justify-between font-label text-[9px] text-[#857c6d]">
                      <span>{volumePct}% retained</span>
                      <span className="font-semibold text-[#8a6c38]">{meta.conversionFactor}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Bottom Level: Dynamic Insight Intelligence Strip ── */}
        <div className="flex flex-col justify-between gap-3 rounded-xl border border-[rgba(176,141,79,0.28)] bg-white/65 px-4 py-3 text-[12px] text-[#705322] backdrop-blur-sm sm:flex-row sm:items-center">
          <div className="flex items-center gap-2.5">
            <span className="text-[15px]">✨</span>
            <span>
              <strong className="text-[#16130f]">
                {selectedStage ? `Selected Gate (${selectedStage.label}):` : "Pipeline Health Insight:"}
              </strong>{" "}
              {selectedStage
                ? selectedMeta?.insight
                : "90% of enquiries progress to product interest with zero drop-off in showroom velocity. Showroom Visit represents the highest value retention threshold."}
            </span>
          </div>
          <div className="font-label text-[11.5px] font-bold text-[#16130f] whitespace-nowrap">
            Overall Cohort Win Rate: {formatPct(cohortWinPct, 0)}
          </div>
        </div>
      </div>
    </div>
  );
}
