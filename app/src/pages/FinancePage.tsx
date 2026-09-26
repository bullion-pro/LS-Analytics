import { createColumnHelper } from "@tanstack/react-table";
import { Landmark, Wallet, Receipt } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { HeroBand } from "@/components/layout/HeroBand";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { DeltaPill } from "@/components/ui/DeltaPill";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { ChartSkeleton } from "@/components/ui/ChartSkeleton";
import { InsightCallout } from "@/components/ui/InsightCallout";
import { DataTable } from "@/components/ui/DataTable";
import { JournalActivityFeed } from "@/components/ui/JournalActivityFeed";
import { TrendLine } from "@/components/charts/TrendLine";
import { CompositionBar } from "@/components/charts/CompositionBar";
import { ContributionWaterfall } from "@/components/charts/ContributionWaterfall";
import { RankedBar } from "@/components/charts/RankedBar";
import { CashFlowBars } from "@/components/charts/CashFlowBars";
import { RadialGauge } from "@/components/charts/RadialGauge";
import { BalanceSheetMirror } from "@/components/charts/BalanceSheetMirror";
import { Heatmap } from "@/components/charts/Heatmap";
import { useFilters, type BranchFilter } from "@/store/filters";
import { useMockQuery } from "@/lib/useMockQuery";
import { PERIOD_PRESETS, monthsForPeriod, type PeriodPreset } from "@/mock/calendar";
import { BRANCHES } from "@/mock/dimensions";
import { priorComparableMonths } from "@/mock/derive";
import {
  financeTotalsForMonths,
  netProfitTrendYoY,
  opexCompositionForMonths,
  profitBridge,
  cashFlowTrend,
  opexHeatmapData,
  branchFinanceForMonths,
  balanceSheetSnapshot,
  recentJournalActivity,
  type BranchFinanceTotals,
} from "@/mock/finance";
import { computeDelta, formatAEDCompact, formatPct } from "@/lib/format";

function buildFinance(period: PeriodPreset, branch: BranchFilter) {
  const months = monthsForPeriod(period);
  const priorMonths = priorComparableMonths(months);
  const priorLabel = months.length === 1 ? "last month" : "prior period";

  const current = financeTotalsForMonths(months, branch);
  const prior = priorMonths.length ? financeTotalsForMonths(priorMonths, branch) : undefined;

  const netProfitDelta = prior ? computeDelta(current.netProfit, prior.netProfit, priorLabel) : undefined;
  const ebitdaDelta = prior ? computeDelta(current.ebitda, prior.ebitda, priorLabel) : undefined;

  const trend = netProfitTrendYoY(branch);
  const opexMix = opexCompositionForMonths(months, branch);
  const bridge = profitBridge(months, priorMonths, branch);
  const opexHeatmap = opexHeatmapData(8);

  const cashFlow = cashFlowTrend();
  const latestCash = cashFlow[cashFlow.length - 1]?.balance ?? 0;
  const priorCash = cashFlow[cashFlow.length - 2]?.balance ?? latestCash;
  const cashDelta = computeDelta(latestCash, priorCash, "last month");

  const branchPLUnsorted = branchFinanceForMonths(months);
  const branchProfit = [...branchPLUnsorted].sort((a, b) => b.netProfit - a.netProfit);
  const bestMargin = [...branchPLUnsorted].sort((a, b) => b.netMarginPct - a.netMarginPct)[0];
  const topRevenueBranch = [...branchPLUnsorted].sort((a, b) => b.revenue - a.revenue)[0];
  const branchPL = [...branchPLUnsorted].sort((a, b) => b.revenue - a.revenue);

  const balanceSheet = balanceSheetSnapshot();
  const assetsColumn = {
    title: "Assets",
    segments: [
      { key: "inventory", label: "Inventory at valuation", value: balanceSheet.inventory },
      { key: "cash", label: "Cash & bank", value: balanceSheet.cash },
      { key: "receivables", label: "Trade receivables", value: balanceSheet.receivables },
      { key: "fixed", label: "Fixed assets, net", value: balanceSheet.fixedAssets },
    ],
  };
  const financingColumn = {
    title: "Liabilities & equity",
    segments: [
      { key: "equity", label: "Equity", value: balanceSheet.equity },
      { key: "bullion", label: "Bullion financing", value: balanceSheet.bullionFinancing },
      { key: "payables", label: "Trade payables", value: balanceSheet.tradePayables },
      { key: "other", label: "Other current liabilities", value: balanceSheet.otherCurrentLiabilities },
      { key: "vat", label: "VAT payable", value: balanceSheet.vatPayable },
    ],
  };

  const facilityUtilization = balanceSheet.bullionFacilityLimit ? balanceSheet.bullionFinancing / balanceSheet.bullionFacilityLimit : 0;
  const facilityHeadroom = balanceSheet.bullionFacilityLimit - balanceSheet.bullionFinancing;

  const journalEntries = recentJournalActivity();

  return {
    months,
    priorLabel,
    current,
    netProfitDelta,
    ebitdaDelta,
    trend,
    opexMix,
    bridge,
    opexHeatmap,
    cashFlow,
    latestCash,
    cashDelta,
    branchProfit,
    bestMargin,
    topRevenueBranch,
    branchPL,
    balanceSheet,
    assetsColumn,
    financingColumn,
    facilityUtilization,
    facilityHeadroom,
    journalEntries,
  };
}

const columnHelper = createColumnHelper<BranchFinanceTotals>();
const branchPLColumns = [
  columnHelper.accessor("label", {
    header: "Branch",
    cell: (c) => (
      <span className="font-medium">
        {c.getValue()}
        <span className="ml-1.5 font-label text-[11px] text-[var(--color-ink-muted)]">{c.row.original.city}</span>
      </span>
    ),
  }),
  columnHelper.accessor("revenue", { header: "Revenue", cell: (c) => <span className="tabular">{formatAEDCompact(c.getValue())}</span> }),
  columnHelper.accessor("grossMarginPct", {
    header: "Gross margin",
    cell: (c) => <span className="tabular">{formatPct(c.getValue())}</span>,
  }),
  columnHelper.accessor("opex", { header: "Opex", cell: (c) => <span className="tabular">{formatAEDCompact(c.getValue())}</span> }),
  columnHelper.accessor("ebitda", { header: "EBITDA", cell: (c) => <span className="tabular">{formatAEDCompact(c.getValue())}</span> }),
  columnHelper.accessor("netProfit", {
    header: "Net profit (pre-tax)",
    cell: (c) => <span className="tabular font-medium">{formatAEDCompact(c.getValue())}</span>,
  }),
  columnHelper.accessor("netMarginPct", {
    header: "Net margin",
    cell: (c) => <span className="tabular font-medium">{formatPct(c.getValue())}</span>,
  }),
];

export function FinancePage() {
  const period = useFilters((s) => s.period);
  const branch = useFilters((s) => s.branch);
  const periodLabel = PERIOD_PRESETS.find((p) => p.id === period)?.label ?? "";
  const branchLabel = branch === "all" ? "All Branches" : (BRANCHES.find((b) => b.id === branch)?.name ?? "All Branches");

  const { data, isPending, isPlaceholderData } = useMockQuery(["finance", period, branch], () => buildFinance(period, branch));

  return (
    <>
      <TopBar title="Finance & Accounting" subtitle={`${branchLabel} · ${periodLabel}`} />
      <main className={`flex-1 space-y-6 p-7 transition-opacity ${isPlaceholderData ? "opacity-60" : ""}`}>
        {/* ── Tier 1: the hero moment ── */}
        <HeroBand>
          {isPending || !data ? (
            <div className="h-40 animate-pulse rounded-xl bg-white/5" />
          ) : (
              <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-xl">
                  <div className="font-label text-[11px] font-semibold uppercase tracking-wider text-[var(--color-accent-on-obsidian)]">
                    Net Profit &middot; {periodLabel}
                  </div>
                  <div className="mt-2 flex items-baseline gap-3">
                    <AnimatedNumber
                      value={data.current.netProfit}
                      format={formatAEDCompact}
                      className="text-[50px] font-semibold leading-none tracking-[-0.02em] text-white"
                    />
                    {data.netProfitDelta && <DeltaPill delta={data.netProfitDelta} tone="dark" />}
                  </div>
                  {data.netProfitDelta && (
                    <p className="mt-1.5 font-label text-[12px] text-[var(--color-on-obsidian-muted)]">{data.netProfitDelta.label}</p>
                  )}

                  <p className="mt-5 max-w-md text-[13px] leading-relaxed text-[var(--color-on-obsidian-secondary)]">
                    Net margin of <span className="font-semibold text-white">{formatPct(data.current.netMarginPct)}</span> this
                    period, after 9% UAE corporate tax.
                    {data.bestMargin && data.topRevenueBranch && data.bestMargin.key !== data.topRevenueBranch.key && (
                      <>
                        {" "}
                        <span className="font-semibold text-white">{data.bestMargin.label}</span> runs the tightest cost base
                        at <span className="font-semibold text-white">{formatPct(data.bestMargin.netMarginPct)}</span> margin.
                      </>
                    )}
                  </p>
                </div>

                <div className="grid w-full grid-cols-3 gap-3 lg:w-auto lg:min-w-[420px]">
                  <StatTile
                    tone="dark"
                    label="EBITDA"
                    value={formatAEDCompact(data.current.ebitda)}
                    numeric={{ raw: data.current.ebitda, format: formatAEDCompact }}
                    delta={data.ebitdaDelta}
                    icon={Landmark}
                  />
                  <StatTile
                    tone="dark"
                    label="Operating Expenses"
                    value={formatAEDCompact(data.current.totalOpex)}
                    numeric={{ raw: data.current.totalOpex, format: formatAEDCompact }}
                    deltaCaption={`${formatPct(data.current.totalOpex / data.current.revenue)} of revenue`}
                    icon={Receipt}
                  />
                  <StatTile
                    tone="dark"
                    label="Cash & Bank"
                    value={formatAEDCompact(data.latestCash)}
                    numeric={{ raw: data.latestCash, format: formatAEDCompact }}
                    delta={data.cashDelta}
                    icon={Wallet}
                  />
                </div>
              </div>
          )}
        </HeroBand>

        {/* ── Tier 2: the shape of the P&L ── */}
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader title="Net profit trend" subtitle="Last 12 months, indexed against the same months last year" />
            {!data ? <ChartSkeleton /> : (
              <TrendLine data={data.trend} currentLabel="This year" priorLabel="Last year" valueFormatter={formatAEDCompact} />
            )}
          </Card>
          <Card>
            <CardHeader title="Operating expense mix" subtitle={periodLabel} />
            {!data ? <ChartSkeleton height={160} /> : <CompositionBar data={data.opexMix} valueFormatter={formatAEDCompact} />}
          </Card>
        </section>

        {/* ── Tier 3: what moved, and the bank position ── */}
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader title="Profit bridge" subtitle={`What drove net profit vs. prior period · ${periodLabel}`} />
            {!data ? <ChartSkeleton height={300} /> : data.bridge.length === 0 ? (
              <p className="py-10 text-center text-[13px] text-[var(--color-ink-muted)]">
                No prior comparable period available for this selection.
              </p>
            ) : (
              <ContributionWaterfall data={data.bridge} priorLabel="Prior period" currentLabel="This period" valueFormatter={formatAEDCompact} />
            )}
          </Card>
          <Card>
            <CardHeader title="Cash & bank position" subtitle="Last 12 months, all branches" />
            {!data ? <ChartSkeleton height={280} /> : (
              <CashFlowBars data={data.cashFlow} valueFormatter={formatAEDCompact} />
            )}
          </Card>
        </section>

        {/* ── Tier 4: where opex pressure showed up, and the facility funding stock ── */}
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader title="Expense trend by category" subtitle="Last 8 months" />
            {!data ? <ChartSkeleton height={220} /> : (
              <Heatmap
                rows={data.opexHeatmap.rows}
                cols={data.opexHeatmap.cols}
                cells={data.opexHeatmap.cells}
                valueFormatter={formatAEDCompact}
                labelWidth={188}
                valueLabel="Expense"
              />
            )}
          </Card>
          {!data ? <ChartSkeleton height={220} /> : (
            <div
              className="relative overflow-hidden rounded-2xl p-6 shadow-[var(--shadow-card)]"
              style={{ background: "linear-gradient(135deg, #f3e6c9 0%, #eee2cd 35%, #e9ddd8 70%, #ded6e0 100%)" }}
            >
              <h3 className="text-[14.5px] font-semibold tracking-tight text-[var(--color-ink)]">Bullion Financing Facility</h3>
              <p className="mt-0.5 font-label text-[12px] text-[var(--color-ink-muted)]">Metal-loan facility against consigned bullion stock</p>
              <div className="mt-5 flex items-center gap-5">
                <RadialGauge value={data.facilityUtilization} valueLabel={formatPct(data.facilityUtilization, 0)} label="Utilized" tone="light" />
                <div className="min-w-0 flex-1 space-y-3.5">
                  <div>
                    <div className="font-label text-[10.5px] font-medium uppercase tracking-wide text-[var(--color-ink-muted)]">Drawn</div>
                    <div className="text-[17px] font-semibold text-[var(--color-ink)]">{formatAEDCompact(data.balanceSheet.bullionFinancing)}</div>
                  </div>
                  <div>
                    <div className="font-label text-[10.5px] font-medium uppercase tracking-wide text-[var(--color-ink-muted)]">Headroom</div>
                    <div className="text-[17px] font-semibold text-[var(--color-ink)]">{formatAEDCompact(data.facilityHeadroom)}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ── Tier 5: branch profitability and the balance sheet identity ── */}
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Card>
            <CardHeader title="Branch contribution" subtitle={`Pre-tax operating profit · ${periodLabel}`} />
            {!data ? <ChartSkeleton height={200} /> : (
              <>
                <RankedBar
                  data={data.branchProfit.map((b) => ({
                    key: b.key,
                    label: b.label,
                    sublabel: b.city,
                    value: b.netProfit,
                    secondaryValue: formatPct(b.netMarginPct),
                  }))}
                  valueFormatter={formatAEDCompact}
                />
                <div className="mt-4">
                  <InsightCallout
                    text={
                      data.bestMargin.key === data.topRevenueBranch.key
                        ? `${data.bestMargin.label} leads on both revenue and margin this period.`
                        : `${data.topRevenueBranch.label} generates the most revenue, but ${data.bestMargin.label} carries the lightest occupancy cost and posts the strongest margin at ${formatPct(data.bestMargin.netMarginPct)}.`
                    }
                  />
                </div>
              </>
            )}
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader title="Balance sheet" subtitle="Current snapshot — assets and how they're financed" />
            {!data ? <ChartSkeleton height={260} /> : (
              <BalanceSheetMirror left={data.assetsColumn} right={data.financingColumn} valueFormatter={formatAEDCompact} />
            )}
          </Card>
        </section>

        {/* ── Tier 6: the detail underneath the charts ── */}
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Card>
            <CardHeader title="Recent journal activity" subtitle="Latest month" />
            {!data ? <ChartSkeleton height={260} /> : <JournalActivityFeed entries={data.journalEntries} valueFormatter={formatAEDCompact} />}
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader title="Branch P&L summary" subtitle={`${periodLabel} · sortable`} />
            {!data ? <ChartSkeleton height={220} /> : <DataTable data={data.branchPL} columns={branchPLColumns} />}
          </Card>
        </section>
      </main>
    </>
  );
}
