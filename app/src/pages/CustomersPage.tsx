import { createColumnHelper } from "@tanstack/react-table";
import { UserPlus, Repeat2, Wallet, Cake, Gift } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { HeroBand } from "@/components/layout/HeroBand";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { DeltaPill } from "@/components/ui/DeltaPill";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { ChartSkeleton } from "@/components/ui/ChartSkeleton";
import { InsightCallout } from "@/components/ui/InsightCallout";
import { DataTable } from "@/components/ui/DataTable";
import { RankedBar } from "@/components/charts/RankedBar";
import { ShareIndexDumbbell } from "@/components/charts/ShareIndexDumbbell";
import { LifecycleRibbon } from "@/components/charts/LifecycleRibbon";
import { ConcentrationCurve } from "@/components/charts/ConcentrationCurve";
import { OpportunityMatrix } from "@/components/charts/OpportunityMatrix";
import { CustomerCohortBars } from "@/components/charts/CustomerCohortBars";
import { ChannelQualityDots } from "@/components/charts/ChannelQualityDots";
import { LeadConversionFlow } from "@/components/charts/LeadConversionFlow";
import { PurchaseHistoryBars } from "@/components/charts/PurchaseHistoryBars";
import { RadialGauge } from "@/components/charts/RadialGauge";
import { ChartLegend } from "@/components/charts/ChartLegend";
import { useFilters, type BranchFilter } from "@/store/filters";
import { useMockQuery } from "@/lib/useMockQuery";
import { PERIOD_PRESETS, monthsForPeriod, type PeriodPreset } from "@/mock/calendar";
import { BRANCHES } from "@/mock/dimensions";
import { priorComparableMonths } from "@/mock/derive";
import {
  customerTotalsForMonths,
  customerTypeMix,
  leadSourceQuality,
  leadFunnelData,
  leadSourceFlowData,
  concentrationCurveData,
  topCustomersRanked,
  opportunityMatrixData,
  lifecycleFunnelData,
  newVsReturningTrend,
  purchaseHistoryTrend,
  strategicAccountsTable,
  upcomingOccasions,
  CUSTOMER_TYPE_COLORS,
  STALE_MONTHS,
  type StrategicAccountRow,
} from "@/mock/customers";
import { computeDelta, formatAEDCompact, formatNumber, formatPct } from "@/lib/format";

function buildCustomers(period: PeriodPreset, branch: BranchFilter) {
  const months = monthsForPeriod(period);
  const priorMonths = priorComparableMonths(months);
  const priorLabel = months.length === 1 ? "last month" : "prior period";

  const current = customerTotalsForMonths(months, branch);
  const prior = priorMonths.length ? customerTotalsForMonths(priorMonths, branch) : undefined;

  const activeDelta = prior ? computeDelta(current.activeCount, prior.activeCount, priorLabel) : undefined;
  const newDelta = prior ? computeDelta(current.newCount, prior.newCount, priorLabel) : undefined;
  const repeatDelta = prior ? computeDelta(current.repeatRatePct, prior.repeatRatePct, priorLabel) : undefined;
  const avgValueDelta = prior ? computeDelta(current.avgCustomerValueAED, prior.avgCustomerValueAED, priorLabel) : undefined;

  const typeMix = customerTypeMix(months, branch);
  const leadQuality = leadSourceQuality(branch);
  const leadFunnel = leadFunnelData(months, branch);
  const leadFunnelPrior = priorMonths.length ? leadFunnelData(priorMonths, branch) : undefined;
  const newLeadsDelta = leadFunnelPrior ? computeDelta(leadFunnel.newLeadsCount, leadFunnelPrior.newLeadsCount, priorLabel) : undefined;
  const leadFlow = leadSourceFlowData(branch);
  const concentration = concentrationCurveData(branch);
  const topCustomers = topCustomersRanked(branch, 8);
  const matrix = opportunityMatrixData(branch);
  const funnel = lifecycleFunnelData(branch);
  const cohortTrend = newVsReturningTrend(branch);
  const purchaseHistory = purchaseHistoryTrend(branch);
  const purchaseHistoryTotalAED = purchaseHistory.reduce((a, d) => a + d.totalRevenueAED, 0);
  const purchaseHistoryNewAED = purchaseHistory.reduce((a, d) => a + d.newRevenueAED, 0);
  const purchaseHistoryTxns = purchaseHistory.reduce((a, d) => a + d.transactionCount, 0);
  const purchaseHistoryNewSharePct = purchaseHistoryTotalAED ? purchaseHistoryNewAED / purchaseHistoryTotalAED : 0;
  const strategicAccounts = strategicAccountsTable(branch, 12);
  const occasions = upcomingOccasions(branch, 6);

  const totalCount = typeMix.countShare.reduce((a, t) => a + t.value, 0) || 1;
  const totalValue = typeMix.valueShare.reduce((a, t) => a + t.value, 0) || 1;
  const vipVvipCount = typeMix.countShare.filter((t) => t.key === "VIP" || t.key === "VVIP").reduce((a, t) => a + t.value, 0);
  const vipVvipValue = typeMix.valueShare.filter((t) => t.key === "VIP" || t.key === "VVIP").reduce((a, t) => a + t.value, 0);
  const vipVvipCountSharePct = vipVvipCount / totalCount;
  const vipVvipValueSharePct = vipVvipValue / totalValue;

  const shareIndexData = typeMix.countShare.map((c) => {
    const v = typeMix.valueShare.find((x) => x.key === c.key)?.value ?? 0;
    return {
      key: c.key,
      label: c.label,
      countSharePct: c.value / totalCount,
      valueSharePct: v / totalValue,
      color: CUSTOMER_TYPE_COLORS[c.key],
    };
  });

  const champion = matrix.summary.find((s) => s.key === "champion");
  const atRisk = matrix.summary.find((s) => s.key === "atRisk");
  const dormantFunnel = funnel.find((f) => f.key === "Disengaged / Dormant");
  // leadQuality is sorted by avg value, but a channel with only a handful of accounts (Cold
  // Call, Facebook) can swing wildly from one or two high-tier customers landing in it by
  // chance — too small a sample to hang a confident headline claim on, even though it's still
  // shown transparently as a dot in the chart. Only cite a channel with real volume behind it.
  const topQualitySource = leadQuality.find((q) => q.count >= 15);

  return {
    periodMonths: months,
    priorLabel,
    current,
    activeDelta,
    newDelta,
    repeatDelta,
    avgValueDelta,
    typeMix,
    shareIndexData,
    leadQuality,
    leadFunnel,
    newLeadsDelta,
    leadFlow,
    concentration,
    topCustomers,
    matrix,
    funnel,
    cohortTrend,
    purchaseHistory,
    purchaseHistoryTotalAED,
    purchaseHistoryNewSharePct,
    purchaseHistoryTxns,
    strategicAccounts,
    occasions,
    vipVvipCountSharePct,
    vipVvipValueSharePct,
    champion,
    atRisk,
    dormantFunnel,
    topQualitySource,
  };
}

const columnHelper = createColumnHelper<StrategicAccountRow>();

const SEGMENT_TONE: Record<string, string> = {
  Champion: "bg-[var(--color-accent-light)] text-[var(--color-accent-dark)]",
  "At Risk": "bg-[var(--color-warning-tint)] text-[#8a5a06]",
  Dormant: "bg-[var(--color-critical-tint)] text-[#a12626]",
  "New & Rising": "bg-[var(--color-good-tint)] text-[#0a6b0a]",
  Steady: "bg-[var(--color-surface-sunken)] text-[var(--color-ink-secondary)]",
};

const strategicColumns = [
  columnHelper.accessor("name", {
    header: "Account",
    cell: (c) => (
      <span className="font-medium">
        {c.getValue()}
        <span className="ml-1.5 font-label text-[11px] text-[var(--color-ink-muted)]">{c.row.original.type}</span>
      </span>
    ),
  }),
  columnHelper.accessor("tier", { header: "Tier" }),
  columnHelper.accessor("ytdSpendAED", {
    header: "Spend (12mo)",
    cell: (c) => <span className="tabular font-medium">{formatAEDCompact(c.getValue())}</span>,
  }),
  columnHelper.accessor("outstandingAED", {
    header: "Outstanding",
    cell: (c) => <span className="tabular">{c.getValue() ? formatAEDCompact(c.getValue()) : "—"}</span>,
  }),
  columnHelper.accessor("lastPurchaseLabel", { header: "Last purchase" }),
  columnHelper.accessor("segment", {
    header: "Segment",
    cell: (c) => {
      const v = c.getValue();
      return (
        <span className={`tabular rounded-full px-1.5 py-0.5 font-label text-[10px] font-semibold ${SEGMENT_TONE[v] ?? SEGMENT_TONE.Steady}`}>
          {v}
        </span>
      );
    },
  }),
  columnHelper.accessor("nextOccasionLabel", { header: "Next occasion" }),
];

export function CustomersPage() {
  const period = useFilters((s) => s.period);
  const branch = useFilters((s) => s.branch);
  const periodLabel = PERIOD_PRESETS.find((p) => p.id === period)?.label ?? "";
  const branchLabel = branch === "all" ? "All Branches" : (BRANCHES.find((b) => b.id === branch)?.name ?? "All Branches");

  const { data, isPending, isPlaceholderData } = useMockQuery(["customers", period, branch], () => buildCustomers(period, branch));

  return (
    <>
      <TopBar title="Customers" subtitle={`${branchLabel} · ${periodLabel}`} />
      <main className={`flex-1 space-y-6 p-7 transition-opacity ${isPlaceholderData ? "opacity-60" : ""}`}>
        {/* ── Tier 1: the state of the relationship base ── */}
        <HeroBand>
          {isPending || !data ? (
            <div className="h-40 animate-pulse rounded-xl bg-white/5" />
          ) : (
            <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-xl">
                <div className="font-label text-[11px] font-semibold uppercase tracking-wider text-[var(--color-accent-on-obsidian)]">
                  Active Customers &middot; {periodLabel}
                </div>
                <div className="mt-2 flex items-baseline gap-3">
                  <AnimatedNumber
                    value={data.current.activeCount}
                    format={formatNumber}
                    className="text-[50px] font-semibold leading-none tracking-[-0.02em] text-white"
                  />
                  {data.activeDelta && <DeltaPill delta={data.activeDelta} tone="dark" />}
                </div>
                {data.activeDelta && (
                  <p className="mt-1.5 font-label text-[12px] text-[var(--color-on-obsidian-muted)]">{data.activeDelta.label}</p>
                )}

                <p className="mt-5 max-w-md text-[13px] leading-relaxed text-[var(--color-on-obsidian-secondary)]">
                  Repeat customers made up{" "}
                  <span className="font-semibold text-white">{formatPct(data.current.repeatRatePct, 0)}</span> of active buyers this
                  period.{" "}
                  <span className="font-semibold text-white">VIP &amp; VVIP</span> accounts are just{" "}
                  {formatPct(data.vipVvipCountSharePct, 0)} of the base but drive{" "}
                  <span className="font-semibold text-white">{formatPct(data.vipVvipValueSharePct, 0)}</span> of the value it generates.
                </p>
              </div>

              <div className="grid w-full grid-cols-3 gap-3 lg:w-auto lg:min-w-[420px]">
                <StatTile
                  tone="dark"
                  label="New Customers"
                  value={formatNumber(data.current.newCount)}
                  numeric={{ raw: data.current.newCount, format: formatNumber }}
                  delta={data.newDelta}
                  icon={UserPlus}
                />
                <StatTile
                  tone="dark"
                  label="Repeat Rate"
                  value={formatPct(data.current.repeatRatePct, 0)}
                  numeric={{ raw: data.current.repeatRatePct, format: (v) => formatPct(v, 0) }}
                  delta={data.repeatDelta}
                  icon={Repeat2}
                />
                <StatTile
                  tone="dark"
                  label="Avg. Customer Value"
                  value={formatAEDCompact(data.current.avgCustomerValueAED)}
                  numeric={{ raw: data.current.avgCustomerValueAED, format: formatAEDCompact }}
                  delta={data.avgValueDelta}
                  icon={Wallet}
                />
              </div>
            </div>
          )}
        </HeroBand>

        {/* ── Lead pipeline: how the base gets replenished, before a lead ever becomes a customer ── */}
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader title="Lead pipeline: source to conversion" subtitle="Every inbound lead, by channel and ultimate outcome · lifetime" />
            {!data ? (
              <ChartSkeleton height={320} />
            ) : (
              <>
                <div className="mb-1">
                  <ChartLegend
                    items={data.leadFlow.outcomes.map((o) => ({ key: o.key, label: o.label, color: o.color, shape: "rect" as const }))}
                  />
                </div>
                <LeadConversionFlow sources={data.leadFlow.sources} outcomes={data.leadFlow.outcomes} links={data.leadFlow.links} height={300} />
                {data.leadFlow.bestSource && (
                  <div className="mt-4">
                    <InsightCallout
                      text={`${data.leadFlow.bestSource.label} converts leads to paying customers at ${formatPct(data.leadFlow.bestSource.convertedPct ?? 0, 0)} — the strongest close rate of any channel with meaningful volume, and the clearest case for doubling down on it at the top of the funnel.`}
                    />
                  </div>
                )}
              </>
            )}
          </Card>
          <Card>
            <CardHeader title="Lead → customer conversion" subtitle={periodLabel} />
            {!data ? (
              <ChartSkeleton height={260} />
            ) : (
              <div className="flex flex-col items-center gap-5 py-2">
                <RadialGauge
                  value={data.leadFunnel.conversionRatePct}
                  valueLabel={formatPct(data.leadFunnel.conversionRatePct, 0)}
                  label="Lead to customer"
                  size={132}
                  strokeWidth={12}
                />
                <div className="grid w-full grid-cols-1 gap-3">
                  <div className="flex items-center justify-between rounded-lg bg-[var(--color-surface-sunken)] px-3.5 py-2.5">
                    <span className="font-label text-[11px] text-[var(--color-ink-muted)]">New leads &middot; {periodLabel.toLowerCase()}</span>
                    <span className="flex items-center gap-1.5">
                      <span className="tabular text-[14px] font-semibold text-[var(--color-ink)]">{formatNumber(data.leadFunnel.newLeadsCount)}</span>
                      {data.newLeadsDelta && <DeltaPill delta={data.newLeadsDelta} />}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-[var(--color-surface-sunken)] px-3.5 py-2.5">
                    <span className="font-label text-[11px] text-[var(--color-ink-muted)]">Avg. time to convert</span>
                    <span className="tabular text-[14px] font-semibold text-[var(--color-ink)]">{Math.round(data.leadFunnel.avgDaysToConvert)} days</span>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </section>

        {/* ── Purchase history: what the base has actually spent, month by month ── */}
        <section className="grid grid-cols-1 gap-5">
          <Card>
            <CardHeader title="Purchase history" subtitle="Monthly revenue and cumulative lifetime total · full 24-month window" />
            {!data ? (
              <ChartSkeleton height={300} />
            ) : (
              <>
                <PurchaseHistoryBars data={data.purchaseHistory} valueFormatter={formatAEDCompact} height={300} />
                <div className="mt-4">
                  <InsightCallout
                    text={`Over the trailing 24 months, the active base generated ${formatAEDCompact(data.purchaseHistoryTotalAED)} across ${formatNumber(data.purchaseHistoryTxns)} transactions. Just ${formatPct(data.purchaseHistoryNewSharePct, 0)} of that came from customers acquired within the same window — the rest from established relationships buying again, the hallmark of a mature, loyalty-driven luxury base.`}
                  />
                </div>
              </>
            )}
          </Card>
        </section>

        {/* ── Tier 2: who the customers are, and where they come from ── */}
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader title="Portfolio mix: customers vs. value" subtitle={`Who makes up the base, and who drives it · ${periodLabel}`} />
            {!data ? (
              <ChartSkeleton height={220} />
            ) : (
              <>
                <ShareIndexDumbbell data={data.shareIndexData} />
                <div className="mt-4">
                  <InsightCallout
                    text={`VIP and VVIP customers are ${formatPct(data.vipVvipCountSharePct, 0)} of the active base by headcount, but ${formatPct(data.vipVvipValueSharePct, 0)} of revenue — the clearest signal of where relationship investment pays back.`}
                  />
                </div>
              </>
            )}
          </Card>
          <Card>
            <CardHeader title="Where customers come from" subtitle="Avg. lifetime value by acquisition channel" />
            {!data ? (
              <ChartSkeleton height={220} />
            ) : (
              <>
                <ChannelQualityDots
                  data={data.leadQuality.map((q) => ({ key: q.source, label: q.source, avgValueAED: q.avgValueAED, count: q.count, countSharePct: q.countSharePct }))}
                  valueFormatter={formatAEDCompact}
                />
                {data.topQualitySource && (
                  <div className="mt-4">
                    <InsightCallout
                      text={`${data.topQualitySource.source}-sourced customers carry the highest average lifetime value, at ${formatAEDCompact(data.topQualitySource.avgValueAED)} per customer — a warm, personally-vetted channel worth the relationship investment.`}
                    />
                  </div>
                )}
              </>
            )}
          </Card>
        </section>

        {/* ── Tier 3: how concentrated the value is, and who carries it ── */}
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader title="Revenue concentration" subtitle="Active customers ranked by value · trailing 12 months" />
            {!data ? (
              <ChartSkeleton height={260} />
            ) : (
              <>
                <ConcentrationCurve points={data.concentration.points} highlightPct={20} />
                <div className="mt-4">
                  <InsightCallout
                    tone={data.concentration.top20SharePct > 55 ? "warning" : "accent"}
                    text={`The top 20% of active customers (${formatNumber(data.concentration.top20Count)} accounts) generate ${formatPct(data.concentration.top20SharePct / 100, 0)} of trailing-12-month revenue. ${
                      data.concentration.top20SharePct > 55
                        ? "That concentration means losing a handful of top accounts would have an outsized impact — worth tracking their engagement closely."
                        : "A reasonably broad base — no single account carries disproportionate risk."
                    }`}
                  />
                </div>
              </>
            )}
          </Card>
          <Card>
            <CardHeader title="Top customers" subtitle="By trailing 12-month spend" />
            {!data ? <ChartSkeleton height={220} /> : <RankedBar data={data.topCustomers} valueFormatter={formatAEDCompact} />}
          </Card>
        </section>

        {/* ── Tier 4: value vs. engagement — where the opportunity and risk sit ── */}
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader
              title="Customer value vs. engagement"
              subtitle="Active customers by lifetime value and recency — bubble size = lifetime visit frequency"
            />
            {!data ? (
              <ChartSkeleton height={340} />
            ) : (
              <>
                <div className="mb-2">
                  <ChartLegend
                    items={data.matrix.summary.map((s) => ({ key: s.key, label: s.label, color: s.color, shape: "dot" as const }))}
                  />
                </div>
                <OpportunityMatrix
                  points={data.matrix.points}
                  valueFormatter={formatAEDCompact}
                  highValueThreshold={data.matrix.highValueThreshold}
                  staleThresholdMonths={STALE_MONTHS}
                />
                {data.champion && data.atRisk && (
                  <div className="mt-4">
                    <InsightCallout
                      tone={data.atRisk.count > 0 ? "warning" : "accent"}
                      text={`${formatNumber(data.champion.count)} Champions drive ${formatAEDCompact(data.champion.valueAED)} in lifetime value. ${formatNumber(data.atRisk.count)} At-Risk accounts — high lifetime value, quiet for ${STALE_MONTHS}+ months — represent ${formatAEDCompact(data.atRisk.valueAED)} worth re-engaging before it's lost.`}
                    />
                  </div>
                )}
              </>
            )}
          </Card>
          <Card>
            <CardHeader title="Segment contribution" subtitle="Lifetime value by segment" />
            {!data ? (
              <ChartSkeleton height={220} />
            ) : (
              <RankedBar
                data={[...data.matrix.summary]
                  .sort((a, b) => b.valueAED - a.valueAED)
                  .map((s) => ({ key: s.key, label: s.label, value: s.valueAED, secondaryValue: `${formatNumber(s.count)} customers` }))}
                valueFormatter={formatAEDCompact}
              />
            )}
          </Card>
        </section>

        {/* ── Tier 5: the relationship journey, and whether the base is growing or leaking ── */}
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader title="Relationship lifecycle" subtitle="Where active accounts sit in the journey — node size = accounts" />
            {!data ? (
              <ChartSkeleton height={220} />
            ) : (
              <>
                <LifecycleRibbon stages={data.funnel.slice(0, -1)} offPath={data.funnel[data.funnel.length - 1]} valueFormatter={formatNumber} />
                {data.dormantFunnel && data.dormantFunnel.value > 0 && (
                  <div className="mt-3">
                    <InsightCallout
                      tone="critical"
                      text={`${formatNumber(data.dormantFunnel.value)} accounts have gone quiet for ${STALE_MONTHS}+ months — the highest-leverage list to re-engage before they're written off.`}
                    />
                  </div>
                )}
              </>
            )}
          </Card>
          <Card>
            <CardHeader title="New vs. returning customers" subtitle="Monthly active buyers and repeat rate · trailing 12 months" />
            {!data ? <ChartSkeleton height={260} /> : <CustomerCohortBars data={data.cohortTrend} />}
          </Card>
        </section>

        {/* ── Tier 6: the deep dive — strategic accounts and near-term relationship moments ── */}
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Card>
            <CardHeader title="Upcoming occasions" subtitle="Birthdays & anniversaries, next 150 days" />
            {!data ? (
              <ChartSkeleton height={220} />
            ) : data.occasions.length === 0 ? (
              <p className="py-8 text-center text-[13px] text-[var(--color-ink-muted)]">No upcoming occasions on file.</p>
            ) : (
              <div className="flex flex-col">
                {data.occasions.map((o, i) => (
                  <div
                    key={o.id}
                    className={`flex items-center gap-3 py-3 ${i !== data.occasions.length - 1 ? "border-b border-[var(--color-border)]" : ""}`}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-light)] text-[var(--color-accent-dark)]">
                      {o.label === "Birthday" ? <Cake size={14} strokeWidth={1.8} /> : <Gift size={14} strokeWidth={1.8} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-medium text-[var(--color-ink)]">{o.name}</p>
                      <p className="font-label text-[11px] text-[var(--color-ink-muted)]">
                        {o.type} · {o.label} in {o.daysAway}d
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader title="Strategic accounts" subtitle="VIP, VVIP & Corporate relationships · trailing 12 months, sortable" />
            {!data ? <ChartSkeleton height={260} /> : <DataTable data={data.strategicAccounts} columns={strategicColumns} />}
          </Card>
        </section>
      </main>
    </>
  );
}
