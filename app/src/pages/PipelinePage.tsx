import { createColumnHelper } from "@tanstack/react-table";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardHeader } from "@/components/ui/Card";
import { ChartSkeleton } from "@/components/ui/ChartSkeleton";
import { InsightCallout } from "@/components/ui/InsightCallout";
import { DataTable } from "@/components/ui/DataTable";
import { OpportunityAttentionList } from "@/components/ui/OpportunityAttentionList";
import { HorizonCascade } from "@/components/charts/HorizonCascade";
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

  const { data, isPlaceholderData } = useMockQuery(["pipeline", period, branch], () => buildPipeline(period, branch));

  return (
    <>
      <TopBar title="Pipeline" subtitle={`${branchLabel} · ${periodLabel}`} />
      <main className={`flex-1 space-y-6 p-7 transition-opacity ${isPlaceholderData ? "opacity-60" : ""}`}>
        {/* ── Tier 1: Horizon Cascade — Executive Deal Stream Command Deck ── */}
        {!data ? (
          <ChartSkeleton height={260} />
        ) : (
          <HorizonCascade
            hero={data.hero}
            weightedDelta={data.weightedDelta}
            countDelta={data.countDelta}
            avgDealDelta={data.avgDealDelta}
            winRate={data.winRate}
            winRateDelta={data.winRateDelta}
            stages={data.funnel.stages}
            cohortSize={data.funnel.cohortSize}
            cohortWinPct={data.cohortWinPct}
            periodLabel={periodLabel}
            biggestDrop={data.biggestDrop}
          />
        )}

        {/* ── Tier 2: Pipeline Velocity & Concentration — Time in stage & Top opportunities ── */}
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

        {/* ── Tier 3: Channels & Team — What's driving deal flow ── */}
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

        {/* ── Tier 4: Immediate Decisions & Risk — Deals needing attention ── */}
        <section className="grid grid-cols-1 gap-5">
          <Card>
            <CardHeader title="Needs attention" subtitle="Overdue past expected close, stalled 45+ days in-stage, or on hold" />
            {!data ? <ChartSkeleton height={220} /> : <OpportunityAttentionList items={data.attention} valueFormatter={formatAEDCompact} />}
          </Card>
        </section>

        {/* ── Tier 5: Conversion Outcomes & Trajectory — Closed deals mirror & YoY win rate ── */}
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card className="flex flex-col justify-between">
            <div>
              <CardHeader title="Won vs. Lost outcomes" subtitle={`Deals closed ${periodLabel.toLowerCase()} · Volume, value & sales velocity`} />
              {!data ? <ChartSkeleton height={220} /> : <WinLossMirror won={data.wonLost.won} lost={data.wonLost.lost} valueFormatter={formatAEDCompact} />}
            </div>
            {data && (
              <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-sunken)] p-3.5 font-label text-[11.5px] text-[var(--color-ink-secondary)] leading-relaxed">
                <span className="font-semibold text-[var(--color-ink)]">{formatNumber(data.hero.openCount)}</span> deals currently in active pipeline with a <span className="font-semibold text-[var(--color-ink)]">{formatPct(data.winRate, 0)}</span> historical conversion rate.
              </div>
            )}
          </Card>
          <Card>
            <CardHeader title="Win rate trend YoY" subtitle="Monthly conversion percentage vs. prior year" />
            {!data ? <ChartSkeleton height={220} /> : <TrendLine data={data.winTrend} currentLabel="This year" priorLabel="Last year" valueFormatter={(v) => `${v}%`} height={220} />}
          </Card>
        </section>

        {/* ── Tier 6: Full Opportunity Ledger — Uncramped sortable table ── */}
        <section className="grid grid-cols-1 gap-5">
          <Card>
            <CardHeader title="Open pipeline opportunities" subtitle="Comprehensive ledger of every active deal · sortable by value, stage, and salesperson" />
            {!data ? <ChartSkeleton height={280} /> : <DataTable data={data.table} columns={openPipelineColumns} pageSize={8} />}
          </Card>
        </section>
      </main>
    </>
  );
}
