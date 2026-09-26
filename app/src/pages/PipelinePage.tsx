import { createColumnHelper } from "@tanstack/react-table";
import { Layers, Percent, Coins } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { HeroBand } from "@/components/layout/HeroBand";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { DeltaPill } from "@/components/ui/DeltaPill";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { ChartSkeleton } from "@/components/ui/ChartSkeleton";
import { InsightCallout } from "@/components/ui/InsightCallout";
import { DataTable } from "@/components/ui/DataTable";
import { OpportunityAttentionList } from "@/components/ui/OpportunityAttentionList";
import { StageFunnel } from "@/components/charts/StageFunnel";
import { WinLossMirror } from "@/components/charts/WinLossMirror";
import { SeverityCompositionBar } from "@/components/charts/SeverityCompositionBar";
import { RankedBar } from "@/components/charts/RankedBar";
import { SourceQuadrant } from "@/components/charts/SourceQuadrant";
import { TrendLine } from "@/components/charts/TrendLine";
import { AGING_STATUS_RAMP } from "@/components/charts/chartColors";
import { useFilters, type BranchFilter } from "@/store/filters";
import { useMockQuery } from "@/lib/useMockQuery";
import { PERIOD_PRESETS, monthsForPeriod, type PeriodPreset } from "@/mock/calendar";
import { BRANCHES } from "@/mock/dimensions";
import { priorComparableMonths } from "@/mock/derive";
import {
  pipelineHeroTotals,
  pipelineHeroTotalsAsOfDaysAgo,
  periodWinRate,
  stageFunnelData,
  wonLostMirror,
  winRateTrendYoY,
  stageAgingBuckets,
  stalledPipelineValue,
  topOpenOpportunities,
  sourceQuadrantData,
  salesmanPipelineRanked,
  attentionOpportunities,
  openPipelineTable,
  type OpenPipelineRow,
} from "@/mock/pipeline";
import { computeDelta, formatAEDCompact, formatNumber, formatPct } from "@/lib/format";

function buildPipeline(period: PeriodPreset, branch: BranchFilter) {
  const months = monthsForPeriod(period);
  const priorMonths = priorComparableMonths(months);
  const priorLabel = months.length === 1 ? "last month" : "prior period";

  const hero = pipelineHeroTotals(branch);
  const heroPrior = pipelineHeroTotalsAsOfDaysAgo(branch, 30);
  const weightedDelta = computeDelta(hero.weightedValueAED, heroPrior.weightedValueAED, "30 days ago");
  const countDelta = computeDelta(hero.openCount, heroPrior.openCount, "30 days ago");
  const avgDealDelta = computeDelta(hero.avgDealSizeAED, heroPrior.avgDealSizeAED, "30 days ago");

  const winRate = periodWinRate(months, branch);
  const priorWinRate = priorMonths.length ? periodWinRate(priorMonths, branch) : undefined;
  const winRateDelta = priorMonths.length && priorWinRate !== undefined ? computeDelta(winRate, priorWinRate, priorLabel) : undefined;

  const funnel = stageFunnelData(months, branch);
  const wonLost = wonLostMirror(months, branch);
  const winTrend = winRateTrendYoY(branch);

  const aging = stageAgingBuckets(branch, AGING_STATUS_RAMP);
  const stalled = stalledPipelineValue(branch);
  const topOpps = topOpenOpportunities(branch, 8);

  const quadrant = sourceQuadrantData(branch);
  const salesmen = salesmanPipelineRanked(branch, 6);

  const attention = attentionOpportunities(branch, 6);
  const table = openPipelineTable(branch);

  const progression = funnel.stages.slice(0, 5);
  let biggestDrop = { fromLabel: "", toLabel: "", dropped: 0, pct: 0 };
  for (let i = 1; i < progression.length; i++) {
    const dropped = progression[i - 1].count - progression[i].count;
    if (dropped > biggestDrop.dropped) {
      biggestDrop = {
        fromLabel: progression[i - 1].label,
        toLabel: progression[i].label,
        dropped,
        pct: progression[i - 1].count ? dropped / progression[i - 1].count : 0,
      };
    }
  }
  const cohortWinPct = funnel.cohortSize ? funnel.stages[5].count / funnel.cohortSize : 0;

  const bestSource =
    quadrant.points.filter((p) => p.winRatePct >= quadrant.avgWinRatePct && p.avgValueAED >= quadrant.avgValueAED).sort((a, b) => b.count - a.count)[0] ??
    [...quadrant.points].sort((a, b) => b.winRatePct - a.winRatePct)[0];

  return {
    periodMonths: months,
    priorLabel,
    hero,
    weightedDelta,
    countDelta,
    avgDealDelta,
    winRate,
    winRateDelta,
    funnel,
    wonLost,
    winTrend,
    aging,
    stalled,
    topOpps,
    quadrant,
    salesmen,
    attention,
    table,
    biggestDrop,
    cohortWinPct,
    bestSource,
  };
}

const columnHelper = createColumnHelper<OpenPipelineRow>();
const openPipelineColumns = [
  columnHelper.accessor("title", {
    header: "Deal",
    cell: (c) => (
      <span className="font-medium">
        {c.getValue()}
        <span className="ml-1.5 font-label text-[11px] text-[var(--color-ink-muted)]">{c.row.original.archetype}</span>
      </span>
    ),
  }),
  columnHelper.accessor("stageLabel", { header: "Stage" }),
  columnHelper.accessor("valueAED", {
    header: "Value",
    cell: (c) => <span className="tabular font-medium">{formatAEDCompact(c.getValue())}</span>,
  }),
  columnHelper.accessor("source", { header: "Source" }),
  columnHelper.accessor("salesmanName", { header: "Salesperson" }),
  columnHelper.accessor("branchName", { header: "Branch" }),
  columnHelper.accessor("daysInStage", { header: "Days in stage", cell: (c) => <span className="tabular">{c.getValue()}d</span> }),
  columnHelper.accessor("expectedCloseLabel", { header: "Expected close" }),
];

export function PipelinePage() {
  const period = useFilters((s) => s.period);
  const branch = useFilters((s) => s.branch);
  const periodLabel = PERIOD_PRESETS.find((p) => p.id === period)?.label ?? "";
  const branchLabel = branch === "all" ? "All Branches" : (BRANCHES.find((b) => b.id === branch)?.name ?? "All Branches");

  const { data, isPending, isPlaceholderData } = useMockQuery(["pipeline", period, branch], () => buildPipeline(period, branch));

  return (
    <>
      <TopBar title="Pipeline" subtitle={`${branchLabel} · ${periodLabel}`} />
      <main className={`flex-1 space-y-6 p-7 transition-opacity ${isPlaceholderData ? "opacity-60" : ""}`}>
        {/* ── Tier 1: what's in the pipeline right now ── */}
        <HeroBand>
          {isPending || !data ? (
            <div className="h-40 animate-pulse rounded-xl bg-white/5" />
          ) : (
            <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-xl">
                <div className="font-label text-[11px] font-semibold uppercase tracking-wider text-[var(--color-accent-on-obsidian)]">
                  Weighted Pipeline Value &middot; as of today
                </div>
                <div className="mt-2 flex items-baseline gap-3">
                  <AnimatedNumber
                    value={data.hero.weightedValueAED}
                    format={formatAEDCompact}
                    className="text-[50px] font-semibold leading-none tracking-[-0.02em] text-white"
                  />
                  <DeltaPill delta={data.weightedDelta} tone="dark" />
                </div>
                <p className="mt-1.5 font-label text-[12px] text-[var(--color-on-obsidian-muted)]">{data.weightedDelta.label}</p>

                <p className="mt-5 max-w-md text-[13px] leading-relaxed text-[var(--color-on-obsidian-secondary)]">
                  <span className="font-semibold text-white">{formatAEDCompact(data.hero.openValueAED)}</span> sits across{" "}
                  <span className="font-semibold text-white">{formatNumber(data.hero.openCount)}</span> open opportunities, weighted by
                  stage to a realizable{" "}
                  <span className="font-semibold text-white">{formatAEDCompact(data.hero.weightedValueAED)}</span>. Win rate is{" "}
                  <span className="font-semibold text-white">{formatPct(data.winRate, 0)}</span> {periodLabel.toLowerCase()}.
                </p>
              </div>

              <div className="grid w-full grid-cols-3 gap-3 lg:w-auto lg:min-w-[420px]">
                <StatTile
                  tone="dark"
                  label="Open Opportunities"
                  value={formatNumber(data.hero.openCount)}
                  numeric={{ raw: data.hero.openCount, format: formatNumber }}
                  delta={data.countDelta}
                  icon={Layers}
                />
                <StatTile
                  tone="dark"
                  label="Avg. Deal Size"
                  value={formatAEDCompact(data.hero.avgDealSizeAED)}
                  numeric={{ raw: data.hero.avgDealSizeAED, format: formatAEDCompact }}
                  delta={data.avgDealDelta}
                  icon={Coins}
                />
                <StatTile
                  tone="dark"
                  label="Win Rate"
                  value={formatPct(data.winRate, 0)}
                  numeric={{ raw: data.winRate, format: (v) => formatPct(v, 0) }}
                  delta={data.winRateDelta}
                  deltaCaption={!data.winRateDelta ? periodLabel : undefined}
                  icon={Percent}
                />
              </div>
            </div>
          )}
        </HeroBand>

        {/* ── Tier 2: pipeline movement — cohort funnel + what happened to closed deals ── */}
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader
              title="Stage funnel"
              subtitle={`Opportunities created ${periodLabel.toLowerCase()} — how far they progressed`}
            />
            {!data ? (
              <ChartSkeleton height={280} />
            ) : (
              <>
                <StageFunnel stages={data.funnel.stages} lost={data.funnel.lost} valueFormatter={formatAEDCompact} />
                <div className="mt-4">
                  <InsightCallout
                    tone={data.biggestDrop.pct > 0.4 ? "warning" : "accent"}
                    text={
                      data.biggestDrop.dropped > 0
                        ? `The steepest drop-off is between ${data.biggestDrop.fromLabel} and ${data.biggestDrop.toLabel} — ${formatPct(data.biggestDrop.pct, 0)} of deals that reach ${data.biggestDrop.fromLabel} don't make it to ${data.biggestDrop.toLabel}. Of the full cohort, ${formatPct(data.cohortWinPct, 0)} eventually close won.`
                        : `Every stage is converting cleanly this period — ${formatPct(data.cohortWinPct, 0)} of the cohort closes won.`
                    }
                  />
                </div>
              </>
            )}
          </Card>
          <Card>
            <CardHeader title="Won vs. Lost" subtitle={`Deals closed ${periodLabel.toLowerCase()}`} />
            {!data ? <ChartSkeleton height={220} /> : <WinLossMirror won={data.wonLost.won} lost={data.wonLost.lost} valueFormatter={formatAEDCompact} />}
          </Card>
        </section>

        {/* ── Tier 3: where the pipeline is healthy, and where value is concentrated ── */}
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader title="Time in current stage" subtitle="Open pipeline value, by days since last stage change" />
            {!data ? (
              <ChartSkeleton height={80} />
            ) : (
              <>
                <SeverityCompositionBar buckets={data.aging} valueFormatter={formatAEDCompact} height={40} />
                <div className="mt-4">
                  <InsightCallout
                    tone={data.stalled.valueAED > data.hero.openValueAED * 0.2 ? "warning" : "accent"}
                    text={
                      data.stalled.count > 0
                        ? `${formatAEDCompact(data.stalled.valueAED)} across ${formatNumber(data.stalled.count)} deals has sat in the same stage for 60+ days without progressing — the highest-leverage list to push forward or requalify.`
                        : "No open deals have been sitting in the same stage for more than 60 days — the pipeline is moving at a healthy pace."
                    }
                  />
                </div>
              </>
            )}
          </Card>
          <Card>
            <CardHeader title="Top open opportunities" subtitle="By deal value" />
            {!data ? <ChartSkeleton height={260} /> : <RankedBar data={data.topOpps} valueFormatter={formatAEDCompact} />}
          </Card>
        </section>

        {/* ── Tier 4: what's driving the pipeline — channels and people ── */}
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader title="Channel performance" subtitle="Win rate vs. average deal value, by lead source — bubble size = deal volume" />
            {!data ? (
              <ChartSkeleton height={340} />
            ) : (
              <>
                <SourceQuadrant
                  points={data.quadrant.points}
                  avgWinRatePct={data.quadrant.avgWinRatePct}
                  avgValueAED={data.quadrant.avgValueAED}
                  valueFormatter={formatAEDCompact}
                />
                {data.bestSource && (
                  <div className="mt-4">
                    <InsightCallout
                      text={`${data.bestSource.label} converts at ${data.bestSource.winRatePct}% — against a ${formatPct(data.quadrant.avgWinRatePct / 100, 0)} team average — while carrying an average deal value of ${formatAEDCompact(data.bestSource.avgValueAED)}, the strongest combination of quality and size in the current pipeline.`}
                    />
                  </div>
                )}
              </>
            )}
          </Card>
          <Card>
            <CardHeader title="Pipeline by salesperson" subtitle="Open value currently carried" />
            {!data ? <ChartSkeleton height={220} /> : <RankedBar data={data.salesmen} valueFormatter={formatAEDCompact} />}
          </Card>
        </section>

        {/* ── Tier 5: what needs a decision this week ── */}
        <section className="grid grid-cols-1 gap-5">
          <Card>
            <CardHeader title="Needs attention" subtitle="Overdue past expected close, stalled 45+ days in-stage, or on hold" />
            {!data ? <ChartSkeleton height={220} /> : <OpportunityAttentionList items={data.attention} valueFormatter={formatAEDCompact} />}
          </Card>
        </section>

        {/* ── Tier 6: is conversion quality improving, and the full detail underneath ── */}
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Card>
            <CardHeader title="Win rate trend" subtitle="Last 12 months, vs. the same months last year" />
            {!data ? <ChartSkeleton height={220} /> : <TrendLine data={data.winTrend} currentLabel="This year" priorLabel="Last year" valueFormatter={(v) => `${v}%`} height={220} />}
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader title="Open pipeline" subtitle="Every open opportunity · sortable" />
            {!data ? <ChartSkeleton height={260} /> : <DataTable data={data.table} columns={openPipelineColumns} pageSize={5} />}
          </Card>
        </section>
      </main>
    </>
  );
}
