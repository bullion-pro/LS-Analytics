import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, Coins, Percent, Wallet } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { HeroBand } from "@/components/layout/HeroBand";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { DeltaPill } from "@/components/ui/DeltaPill";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { ChartSkeleton } from "@/components/ui/ChartSkeleton";
import { InsightCallout } from "@/components/ui/InsightCallout";
import { QuietTag } from "@/components/ui/QuietTag";
import { TrendLine } from "@/components/charts/TrendLine";
import { CategoryTreemap } from "@/components/charts/CategoryTreemap";
import { Heatmap } from "@/components/charts/Heatmap";
import { RankedBar } from "@/components/charts/RankedBar";
import { RadialGauge } from "@/components/charts/RadialGauge";
import { useFilters, type BranchFilter } from "@/store/filters";
import { useMockQuery } from "@/lib/useMockQuery";
import { PERIOD_PRESETS, type PeriodPreset } from "@/mock/calendar";
import { BRANCHES } from "@/mock/dimensions";
import {
  branchHeatmapData,
  categoryMixForMonths,
  currentAndPriorTotals,
  salesmanLeaderboardForMonths,
  revenueTrendYoY,
} from "@/mock/derive";
import { latestStockValuation, agingTotalsByBucket } from "@/mock/inventory";
import { apAgingTotalsByBucket, totalOutstandingAP } from "@/mock/purchasing";
import { arAgingTotalsByBucket, totalOutstandingAR } from "@/mock/customers";
import { computeDelta, formatAEDCompact, formatAEDFull, formatPct } from "@/lib/format";

function buildOverview(period: PeriodPreset, branch: BranchFilter) {
  const { months, current, prior, priorLabel } = currentAndPriorTotals(period, branch);
  const trend = revenueTrendYoY(branch);
  const categoryMix = categoryMixForMonths(months, branch);
  const heatmap = branchHeatmapData(8);
  const leaderboard = salesmanLeaderboardForMonths(months, branch, 5);
  const stock = latestStockValuation();
  const aging = agingTotalsByBucket();
  const apAging = apAgingTotalsByBucket();
  const outstandingAP = totalOutstandingAP();
  const arAging = arAgingTotalsByBucket();
  const outstandingAR = totalOutstandingAR();

  const revenueDelta = prior ? computeDelta(current.revenue, prior.revenue, priorLabel) : undefined;
  const marginDelta = prior ? computeDelta(current.grossMarginPct, prior.grossMarginPct, priorLabel) : undefined;
  const basketDelta = prior ? computeDelta(current.avgBasketAED, prior.avgBasketAED, priorLabel) : undefined;

  const topCategory = [...categoryMix].sort((a, b) => b.value - a.value)[0];
  const topCategoryShare = topCategory ? topCategory.value / current.revenue : 0;

  const branchAttainment = BRANCHES.map((b) => {
    const rows = salesmanLeaderboardForMonths(months, b.id, 999);
    const revenue = rows.reduce((a, r) => a + r.value, 0);
    const target = rows.reduce((a, r) => a + r.target, 0);
    return { branch: b, revenue, target, attainment: target ? revenue / target : 1 };
  });
  const laggingBranch = [...branchAttainment].sort((a, b) => a.attainment - b.attainment)[0];

  const agedStockValue = aging["180+"];
  const seriousPlusAP = (apAging["31-60"] ?? 0) + (apAging["61-90+"] ?? 0);
  const seriousPlusAR = (arAging["31-60"] ?? 0) + (arAging["61-90+"] ?? 0);
  const apNotYetDuePct = outstandingAP ? (apAging.current ?? 0) / outstandingAP : 0;
  const arNotYetDuePct = outstandingAR ? (arAging.current ?? 0) / outstandingAR : 0;
  const netWorkingCapital = outstandingAR - outstandingAP;

  return {
    months,
    current,
    prior,
    priorLabel,
    trend,
    categoryMix,
    heatmap,
    leaderboard,
    stock,
    outstandingAP,
    outstandingAR,
    revenueDelta,
    marginDelta,
    basketDelta,
    topCategory,
    topCategoryShare,
    laggingBranch,
    agedStockValue,
    seriousPlusAP,
    seriousPlusAR,
    apNotYetDuePct,
    arNotYetDuePct,
    netWorkingCapital,
  };
}

export function OverviewPage() {
  const period = useFilters((s) => s.period);
  const branch = useFilters((s) => s.branch);
  const periodLabel = PERIOD_PRESETS.find((p) => p.id === period)?.label ?? "";
  const branchLabel = branch === "all" ? "All Branches" : (BRANCHES.find((b) => b.id === branch)?.name ?? "All Branches");

  const { data, isPending, isPlaceholderData } = useMockQuery(["overview", period, branch], () => buildOverview(period, branch));

  return (
    <>
      <TopBar title="Executive Overview" subtitle={`${branchLabel} · ${periodLabel}`} />
      <main className={`flex-1 space-y-6 p-7 transition-opacity ${isPlaceholderData ? "opacity-60" : ""}`}>
        {/* ── Tier 1: the hero moment ── */}
        <HeroBand>
          {isPending || !data ? (
            <div className="h-40 animate-pulse rounded-xl bg-white/5" />
          ) : (
            <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-xl">
                <div className="font-label text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--color-accent-on-obsidian)]">
                  Total Revenue &middot; {periodLabel}
                </div>
                <div className="mt-2 flex items-baseline gap-3">
                  <AnimatedNumber
                    value={data.current.revenue}
                    format={formatAEDCompact}
                    className="text-[50px] font-semibold leading-none tracking-[-0.02em] text-white"
                  />
                  {data.revenueDelta && <DeltaPill delta={data.revenueDelta} tone="dark" />}
                </div>
                {data.revenueDelta && (
                  <p className="mt-1.5 font-label text-[12px] text-[var(--color-on-obsidian-muted)]">{data.revenueDelta.label}</p>
                )}

                {data.topCategory && (
                  <p className="mt-5 max-w-md text-[13px] leading-relaxed text-[var(--color-on-obsidian-secondary)]">
                    <span className="font-semibold text-white">{data.topCategory.label}</span> leads the mix at{" "}
                    <span className="font-semibold text-white">{formatPct(data.topCategoryShare)}</span> of revenue this
                    period.
                    {data.laggingBranch && data.laggingBranch.attainment < 0.95 && (
                      <>
                        {" "}
                        <span className="font-semibold text-white">{data.laggingBranch.branch.name}</span> is trailing target
                        at <span className="font-semibold text-white">{formatPct(data.laggingBranch.attainment)}</span>{" "}
                        attainment.
                      </>
                    )}
                  </p>
                )}
              </div>

              <div className="grid w-full grid-cols-3 gap-3 lg:w-auto lg:min-w-[420px]">
                <StatTile
                  tone="dark"
                  label="Gross Margin"
                  value={formatPct(data.current.grossMarginPct, 1)}
                  numeric={{ raw: data.current.grossMarginPct, format: (v) => formatPct(v, 1) }}
                  delta={data.marginDelta}
                  icon={Percent}
                />
                <StatTile
                  tone="dark"
                  label="Avg Basket"
                  value={formatAEDCompact(data.current.avgBasketAED)}
                  numeric={{ raw: data.current.avgBasketAED, format: formatAEDCompact }}
                  delta={data.basketDelta}
                  icon={Wallet}
                />
                <StatTile
                  tone="dark"
                  label="Stock Value"
                  value={formatAEDCompact(data.stock.stockValueAED)}
                  numeric={{ raw: data.stock.stockValueAED, format: formatAEDCompact }}
                  deltaCaption={`Gold index ${data.stock.goldIndex.toFixed(1)}`}
                  icon={Coins}
                />
              </div>
            </div>
          )}
        </HeroBand>

        {/* ── Tier 2: secondary context ── */}
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader
              title="Revenue trend"
              subtitle="Last 12 months, indexed against the same months last year"
            />
            {!data ? <ChartSkeleton /> : (
              <TrendLine
                data={data.trend}
                currentLabel="This year"
                priorLabel="Last year"
                annotations={[{ key: data.trend.find((t) => t.label === "Nov")?.key ?? "", label: "Wedding season" }]}
                valueFormatter={formatAEDCompact}
              />
            )}
          </Card>
          <Card>
            <CardHeader title="Category mix" subtitle={`Revenue share by category · ${periodLabel}`} />
            {!data ? <ChartSkeleton height={260} /> : (
              <CategoryTreemap data={data.categoryMix} valueFormatter={formatAEDCompact} />
            )}
          </Card>
        </section>

        {/* ── Tier 2.5: working capital — money owed to LS vs. money LS owes ── */}
        <Card>
          <CardHeader title="Working capital" subtitle="Money owed to LS vs. money LS owes — same-period snapshot" />
          {!data ? (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <ChartSkeleton height={170} />
              <ChartSkeleton height={170} />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <div
                  className="relative overflow-hidden rounded-2xl p-6 shadow-[var(--shadow-card)]"
                  style={{ background: "linear-gradient(135deg, #f3e6c9 0%, #eee2cd 35%, #e9ddd8 70%, #ded6e0 100%)" }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-[14.5px] font-semibold tracking-tight text-[var(--color-ink)]">Money to collect</h3>
                      <p className="mt-0.5 font-label text-[12px] text-[var(--color-ink-muted)]">
                        Customer receivables — layaway &amp; installment balances
                      </p>
                    </div>
                    <QuietTag>Owed to us</QuietTag>
                  </div>
                  <div className="mt-5 flex items-center gap-5">
                    <RadialGauge value={data.arNotYetDuePct} valueLabel={formatPct(data.arNotYetDuePct, 0)} label="Not yet due" tone="light" />
                    <div className="min-w-0 flex-1 space-y-3.5">
                      <div>
                        <div className="font-label text-[10.5px] font-medium uppercase tracking-wide text-[var(--color-ink-muted)]">
                          Total outstanding
                        </div>
                        <div className="text-[17px] font-semibold text-[var(--color-ink)]">{formatAEDCompact(data.outstandingAR)}</div>
                      </div>
                      <div>
                        <div className="font-label text-[10.5px] font-medium uppercase tracking-wide text-[var(--color-ink-muted)]">
                          Overdue 30+ days
                        </div>
                        <div className="text-[17px] font-semibold text-[#a12626]">{formatAEDCompact(data.seriousPlusAR)}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  className="relative overflow-hidden rounded-2xl p-6 shadow-[var(--shadow-card)]"
                  style={{ background: "linear-gradient(135deg, #f3e6c9 0%, #eee2cd 35%, #e9ddd8 70%, #ded6e0 100%)" }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-[14.5px] font-semibold tracking-tight text-[var(--color-ink)]">Money to pay</h3>
                      <p className="mt-0.5 font-label text-[12px] text-[var(--color-ink-muted)]">
                        Supplier payables — bullion, gemstone &amp; finished-goods accounts
                      </p>
                    </div>
                    <QuietTag>We owe</QuietTag>
                  </div>
                  <div className="mt-5 flex items-center gap-5">
                    <RadialGauge value={data.apNotYetDuePct} valueLabel={formatPct(data.apNotYetDuePct, 0)} label="Not yet due" tone="light" />
                    <div className="min-w-0 flex-1 space-y-3.5">
                      <div>
                        <div className="font-label text-[10.5px] font-medium uppercase tracking-wide text-[var(--color-ink-muted)]">
                          Total outstanding
                        </div>
                        <div className="text-[17px] font-semibold text-[var(--color-ink)]">{formatAEDCompact(data.outstandingAP)}</div>
                      </div>
                      <div>
                        <div className="font-label text-[10.5px] font-medium uppercase tracking-wide text-[var(--color-ink-muted)]">
                          Overdue 30+ days
                        </div>
                        <div className="text-[17px] font-semibold text-[#a12626]">{formatAEDCompact(data.seriousPlusAP)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <InsightCallout
                  tone={data.netWorkingCapital >= 0 ? "accent" : "warning"}
                  text={
                    data.netWorkingCapital >= 0
                      ? `Net receivable position: customers currently owe LS ${formatAEDCompact(data.netWorkingCapital)} more than LS owes its suppliers.`
                      : `Net payable position: LS currently owes suppliers ${formatAEDCompact(-data.netWorkingCapital)} more than customers owe LS.`
                  }
                />
              </div>
            </>
          )}
        </Card>

        {/* ── Tier 3: supporting detail ── */}
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Card>
            <CardHeader title="Branch performance" subtitle="Revenue, last 8 months" />
            {!data ? <ChartSkeleton height={200} /> : (
              <Heatmap rows={data.heatmap.rows} cols={data.heatmap.cols} cells={data.heatmap.cells} valueFormatter={formatAEDCompact} />
            )}
          </Card>
          <Card>
            <CardHeader
              title="Top salesmen"
              subtitle={periodLabel}
              action={
                <Link to="/sales" className="flex items-center gap-1 text-[11.5px] font-medium text-[var(--color-accent-dark)] hover:underline">
                  View all <ArrowRight size={12} />
                </Link>
              }
            />
            {!data ? <ChartSkeleton height={200} /> : (
              <RankedBar data={data.leaderboard} valueFormatter={formatAEDCompact} />
            )}
          </Card>
          <Card>
            <CardHeader title="Needs attention" subtitle="Flagged this period" />
            {!data ? <ChartSkeleton height={200} /> : (
              <div className="flex flex-col gap-3">
                {data.laggingBranch && data.laggingBranch.attainment < 1 && (
                  <AttentionRow
                    text={`${data.laggingBranch.branch.name} at ${formatPct(data.laggingBranch.attainment)} of target`}
                    href="/sales"
                  />
                )}
                <AttentionRow
                  text={`${formatAEDFull(data.agedStockValue)} of stock aged 180+ days`}
                  href="/inventory"
                />
                <AttentionRow
                  text={`${formatAEDFull(data.seriousPlusAP)} in payables overdue 30+ days`}
                  href="/supplier"
                />
                <AttentionRow
                  text={`${formatAEDFull(data.seriousPlusAR)} in receivables overdue 30+ days`}
                  href="/customers"
                />
              </div>
            )}
          </Card>
        </section>
      </main>
    </>
  );
}

function AttentionRow({ text, href }: { text: string; href: string }) {
  return (
    <Link
      to={href}
      className="group flex items-start gap-2.5 rounded-lg border border-[var(--color-warning)]/25 bg-[var(--color-warning-tint)] px-3 py-2.5 transition-colors hover:border-[var(--color-warning)]/45"
    >
      <AlertTriangle size={14} strokeWidth={2} className="mt-0.5 shrink-0 text-[#8a5a06]" />
      <span className="flex-1 text-[12px] leading-snug text-[#5c4204]">{text}</span>
      <ArrowRight size={13} className="mt-0.5 shrink-0 text-[#8a5a06] opacity-0 transition-opacity group-hover:opacity-100" />
    </Link>
  );
}
