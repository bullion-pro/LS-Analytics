import { useState } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import type { LucideIcon } from "lucide-react";
import { Percent, Receipt, Gem, Watch, ShoppingBag, Sparkles } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { ChartSkeleton } from "@/components/ui/ChartSkeleton";
import { DataTable } from "@/components/ui/DataTable";
import { ActivityFeed } from "@/components/ui/ActivityFeed";
import { TrendLine } from "@/components/charts/TrendLine";
import { CompositionBar } from "@/components/charts/CompositionBar";
import { TargetMeter } from "@/components/charts/TargetMeter";
import { ContributionWaterfall } from "@/components/charts/ContributionWaterfall";
import { LeaderboardRows, type LeaderboardRowDatum } from "@/components/charts/LeaderboardRows";
import { useFilters } from "@/store/filters";
import { useMockQuery } from "@/lib/useMockQuery";
import { PERIOD_PRESETS } from "@/mock/calendar";
import { BRANCHES } from "@/mock/dimensions";
import {
  brandContribution,
  categoryContribution,
  classifyArchetype,
  currentAndPriorTotals,
  discountTrendSeries,
  divisionMixForMonths,
  median,
  priorComparableMonths,
  revenueTrendYoY,
  salesmanLeaderboardForMonths,
  salesmanMomentum,
} from "@/mock/derive";
import { recentSalesActivity } from "@/mock/sales";
import { computeDelta, formatAEDCompact, formatAEDFull, formatNumber, formatPct } from "@/lib/format";

const CATEGORY_ICON: Record<string, LucideIcon> = {
  "cat-watches": Watch,
  "cat-bags": ShoppingBag,
  "cat-perfume": Sparkles,
};

function buildSales(period: Parameters<typeof currentAndPriorTotals>[0], branch: Parameters<typeof currentAndPriorTotals>[1]) {
  const { months, current, prior, priorLabel } = currentAndPriorTotals(period, branch);
  const priorMonths = priorComparableMonths(months);
  const salesmanTable = salesmanLeaderboardForMonths(months, branch, 999);
  const revenueTrend = revenueTrendYoY(branch);

  const medianDeals = median(salesmanTable.map((r) => r.dealsCount));
  const medianBasket = median(salesmanTable.map((r) => r.avgBasketAED));
  const momentum = salesmanMomentum(3);
  const leaderboard: LeaderboardRowDatum[] = salesmanTable.slice(0, 8).map((r) => ({
    key: r.key,
    label: r.label,
    sublabel: r.sublabel,
    value: r.value,
    target: r.target,
    attainment: r.attainment,
    momentum: momentum.get(r.key),
    archetype: classifyArchetype(r, medianDeals, medianBasket),
  }));

  const categoryPerf = categoryContribution(months, priorMonths, branch);
  const brandPerf = brandContribution(months, priorMonths, branch);
  const divisionMix = divisionMixForMonths(months, branch);
  const discountTrend = discountTrendSeries();

  const totalTarget = salesmanTable.reduce((a, r) => a + r.target, 0);
  const totalRevenue = salesmanTable.reduce((a, r) => a + r.value, 0);
  const totalDeals = salesmanTable.reduce((a, r) => a + r.dealsCount, 0);

  const discountDelta = prior ? computeDelta(current.discountPct, prior.discountPct, priorLabel, false) : undefined;
  const unitsDelta = prior ? computeDelta(current.invoiceCount, prior.invoiceCount, priorLabel) : undefined;

  const recentSales = recentSalesActivity(7).map((s) => ({
    id: s.id,
    icon: CATEGORY_ICON[s.categoryId] ?? Gem,
    description: s.description,
    meta: `${s.salesman} · ${s.branch} · ${s.invoiceNo} · ${s.date}`,
    amountAED: s.amountAED,
    direction: "in" as const,
  }));

  return { months, current, priorLabel, salesmanTable, leaderboard, categoryPerf, brandPerf, divisionMix, discountTrend, revenueTrend, totalTarget, totalRevenue, totalDeals, discountDelta, unitsDelta, recentSales };
}

interface SalesmanRow {
  key: string;
  label: string;
  sublabel?: string;
  value: number;
  target: number;
  attainment: number;
  dealsCount: number;
  avgBasketAED: number;
}

const columnHelper = createColumnHelper<SalesmanRow>();
const columns = [
  columnHelper.accessor("label", { header: "Salesman", cell: (c) => <span className="font-medium">{c.getValue()}</span> }),
  columnHelper.accessor("sublabel", { header: "Branch" }),
  columnHelper.accessor("value", {
    header: "Revenue",
    cell: (c) => <span className="tabular">{formatAEDCompact(c.getValue())}</span>,
  }),
  columnHelper.accessor("attainment", {
    header: "Attainment",
    cell: (c) => (
      <span className={`tabular font-medium ${c.getValue() >= 1 ? "text-[#0a6b0a]" : "text-[var(--color-ink)]"}`}>
        {formatPct(c.getValue())}
      </span>
    ),
  }),
  columnHelper.accessor("dealsCount", { header: "Deals", cell: (c) => <span className="tabular">{formatNumber(c.getValue())}</span> }),
  columnHelper.accessor("avgBasketAED", {
    header: "Avg Basket",
    cell: (c) => <span className="tabular">{formatAEDCompact(c.getValue())}</span>,
  }),
];

const PERF_DIMENSIONS = [
  { id: "category", label: "By Category" },
  { id: "brand", label: "By Brand" },
] as const;
type PerfDimension = (typeof PERF_DIMENSIONS)[number]["id"];

export function SalesPage() {
  const period = useFilters((s) => s.period);
  const branch = useFilters((s) => s.branch);
  const periodLabel = PERIOD_PRESETS.find((p) => p.id === period)?.label ?? "";
  const branchLabel = branch === "all" ? "All Branches" : (BRANCHES.find((b) => b.id === branch)?.name ?? "All Branches");
  const [perfDimension, setPerfDimension] = useState<PerfDimension>("category");

  const { data, isPending, isPlaceholderData } = useMockQuery(["sales", period, branch], () => buildSales(period, branch));

  return (
    <>
      <TopBar title="Sales Performance" subtitle={`${branchLabel} · ${periodLabel}`} />
      <main className={`flex-1 space-y-6 p-7 transition-opacity ${isPlaceholderData ? "opacity-60" : ""}`}>
        <Card>
          <CardHeader title="Revenue trend" subtitle="Last 12 months, indexed against the same months last year" />
          {!data ? (
            <ChartSkeleton />
          ) : (
            <TrendLine
              data={data.revenueTrend}
              currentLabel="This year"
              priorLabel="Last year"
              annotations={[{ key: data.revenueTrend.find((t) => t.label === "Nov")?.key ?? "", label: "Wedding season" }]}
              valueFormatter={formatAEDCompact}
            />
          )}
        </Card>

        <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader title="Target attainment" subtitle={`Company revenue vs. team target · ${periodLabel}`} />
            {!data ? (
              <ChartSkeleton height={90} />
            ) : (
              <TargetMeter
                achievedLabel="Achieved revenue"
                targetLabel="Team target"
                achievedValue={data.totalRevenue}
                targetValue={data.totalTarget}
              />
            )}
          </Card>
          <div className="grid min-w-0 grid-cols-2 gap-3">
            {!data || isPending ? (
              <>
                <ChartSkeleton height={110} />
                <ChartSkeleton height={110} />
              </>
            ) : (
              <>
                <StatTile
                  label="Discount rate"
                  value={formatPct(data.current.discountPct)}
                  numeric={{ raw: data.current.discountPct, format: (v) => formatPct(v) }}
                  delta={data.discountDelta}
                  deltaCaption={data.priorLabel}
                  icon={Percent}
                />
                <StatTile
                  label="Invoices"
                  value={formatNumber(data.current.invoiceCount)}
                  numeric={{ raw: data.current.invoiceCount, format: formatNumber }}
                  delta={data.unitsDelta}
                  deltaCaption={data.priorLabel}
                  icon={Receipt}
                />
              </>
            )}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader
              title="Salesman leaderboard"
              subtitle={`Rank · target attainment · momentum vs 3mo ago · ${periodLabel}`}
            />
            {!data ? <ChartSkeleton height={280} /> : (
              <LeaderboardRows data={data.leaderboard} valueFormatter={formatAEDCompact} />
            )}
          </Card>
          <Card>
            <CardHeader
              title="Category performance"
              subtitle={`What drove the change vs. prior period · ${periodLabel}`}
              action={
                <div className="flex shrink-0 rounded-full border border-[var(--color-border)] p-0.5">
                  {PERF_DIMENSIONS.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setPerfDimension(d.id)}
                      className={`rounded-full px-2.5 py-1 font-label text-[10.5px] font-semibold uppercase tracking-wide transition-colors ${
                        perfDimension === d.id
                          ? "bg-[var(--color-accent-light)] text-[var(--color-accent-dark)]"
                          : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              }
            />
            {!data ? <ChartSkeleton height={280} /> : (
              <ContributionWaterfall
                key={perfDimension}
                data={perfDimension === "category" ? data.categoryPerf : data.brandPerf}
                priorLabel="Prior period"
                currentLabel="This period"
                valueFormatter={formatAEDCompact}
              />
            )}
          </Card>
        </section>

        <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader title="Discount rate trend" subtitle="Last 12 months — deeper discounting in slower months funds footfall" />
            {!data ? <ChartSkeleton /> : (
              <TrendLine data={data.discountTrend} currentLabel="Discount rate" valueFormatter={(v) => formatPct(v)} showLegend={false} />
            )}
          </Card>
          <Card>
            <CardHeader title="Division mix" subtitle={periodLabel} />
            {!data ? <ChartSkeleton height={160} /> : <CompositionBar data={data.divisionMix} valueFormatter={formatAEDCompact} />}
          </Card>
        </section>

        <Card>
          <CardHeader title="Recent large sales" subtitle="Illustrative individual invoices, most recent first" />
          {!data ? <ChartSkeleton height={280} /> : <ActivityFeed entries={data.recentSales} valueFormatter={formatAEDFull} />}
        </Card>

        <Card>
          <CardHeader title="Salesman performance" subtitle={`Full team · ${periodLabel} · sortable`} />
          {!data ? <ChartSkeleton height={260} /> : <DataTable data={data.salesmanTable} columns={columns} />}
        </Card>
      </main>
    </>
  );
}
