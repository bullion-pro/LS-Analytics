import { Coins, RefreshCw, Wallet } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { ChartSkeleton } from "@/components/ui/ChartSkeleton";
import { InsightCallout } from "@/components/ui/InsightCallout";
import { TrendLine } from "@/components/charts/TrendLine";
import { CompositionBar } from "@/components/charts/CompositionBar";
import { SeverityCompositionBar } from "@/components/charts/SeverityCompositionBar";
import { STOCK_AGING_RAMP } from "@/components/charts/chartColors";
import { useMockQuery } from "@/lib/useMockQuery";
import { goldSensitivityTrend, stockByCategoryComposition, stockByMetalComposition } from "@/mock/derive";
import { latestStockValuation, STOCK_AGING, TURNOVER_SERIES, AGING_BUCKETS, agingTotalsByBucket, agedStockHighlights } from "@/mock/inventory";
import { goldPriceAt } from "@/mock/goldPrice";
import { CURRENT_MONTH, PRIOR_MONTH } from "@/mock/calendar";
import { computeDelta, formatAEDCompact, formatAEDFull } from "@/lib/format";

function buildInventory() {
  const latest = latestStockValuation();
  const goldNow = goldPriceAt(CURRENT_MONTH.key);
  const goldPrior = goldPriceAt(PRIOR_MONTH.key);
  const turnoverLatest = TURNOVER_SERIES[TURNOVER_SERIES.length - 1];
  const turnoverPrior = TURNOVER_SERIES[TURNOVER_SERIES.length - 2];

  const sensitivity = goldSensitivityTrend();
  const byMetal = stockByMetalComposition();
  const byCategory = stockByCategoryComposition();
  const turnoverTrend = TURNOVER_SERIES.slice(-12).map((t) => ({ key: t.monthKey, label: t.monthKey.slice(5), current: t.turnoverRatio }));

  const agingTotals = agingTotalsByBucket();
  const agingBuckets = AGING_BUCKETS.map((b, i) => ({ key: b.id, label: b.label, value: agingTotals[b.id], color: STOCK_AGING_RAMP[i] }));

  const agedRows = [...STOCK_AGING].sort((a, b) => b.buckets["180+"] - a.buckets["180+"]);
  const agedHighlights = agedStockHighlights(6);

  const goldDelta = computeDelta(goldNow, goldPrior, "last month");
  const turnoverDelta = turnoverPrior ? computeDelta(turnoverLatest.turnoverRatio, turnoverPrior.turnoverRatio, "last month") : undefined;
  const stockBeta = 0.62; // matches the generator's GOLD_PASS_THROUGH_BETA

  return { latest, goldNow, goldDelta, turnoverLatest, turnoverDelta, sensitivity, byMetal, byCategory, turnoverTrend, agingBuckets, agedRows, agedHighlights, stockBeta };
}

export function InventoryPage() {
  const { data, isPending, isPlaceholderData } = useMockQuery(["inventory"], buildInventory);

  return (
    <>
      <TopBar title="Inventory & Stock Valuation" subtitle="All Branches · Live snapshot" />
      <main className={`flex-1 space-y-6 p-7 transition-opacity ${isPlaceholderData ? "opacity-60" : ""}`}>
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader title="Gold price sensitivity" subtitle="Stock value vs. 24K gold price, both indexed to 100" />
            {!data ? <ChartSkeleton /> : (
              <>
                <TrendLine
                  data={data.sensitivity}
                  currentLabel="Stock value index"
                  priorLabel="Gold price index (24K)"
                  valueFormatter={(v) => v.toFixed(1)}
                  baseline={{ value: 100, label: "Base = 100" }}
                />
                <div className="mt-4">
                  <InsightCallout
                    text={`Stock value moves at roughly ${data.stockBeta.toFixed(2)}× the pace of gold — a 10% gold rally lifts stock value about ${(data.stockBeta * 10).toFixed(0)}%, since making charges and non-gold materials don't reprice with bullion.`}
                  />
                </div>
              </>
            )}
          </Card>
          <div className="flex min-w-0 flex-col gap-3">
            {!data || isPending ? (
              <>
                <ChartSkeleton height={100} />
                <ChartSkeleton height={100} />
                <ChartSkeleton height={100} />
              </>
            ) : (
              <>
                <StatTile
                  label="Stock value"
                  value={formatAEDCompact(data.latest.stockValueAED)}
                  numeric={{ raw: data.latest.stockValueAED, format: formatAEDCompact }}
                  deltaCaption="current snapshot"
                  icon={Wallet}
                />
                <StatTile
                  label="Gold price (24K, per gram)"
                  value={`AED ${data.goldNow.toFixed(0)}`}
                  numeric={{ raw: data.goldNow, format: (v) => `AED ${v.toFixed(0)}` }}
                  delta={data.goldDelta}
                  deltaCaption="vs last month"
                  icon={Coins}
                />
                <StatTile
                  label="Inventory turnover"
                  value={`${data.turnoverLatest.turnoverRatio.toFixed(2)}×`}
                  numeric={{ raw: data.turnoverLatest.turnoverRatio, format: (v) => `${v.toFixed(2)}×` }}
                  delta={data.turnoverDelta}
                  unit="annualized"
                  deltaCaption="vs last month"
                  icon={RefreshCw}
                />
              </>
            )}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Card>
            <CardHeader title="Stock by metal" subtitle="Current valuation" />
            {!data ? <ChartSkeleton height={160} /> : <CompositionBar data={data.byMetal} valueFormatter={formatAEDCompact} />}
          </Card>
          <Card>
            <CardHeader title="Stock by category" subtitle="Current valuation" />
            {!data ? <ChartSkeleton height={160} /> : <CompositionBar data={data.byCategory} valueFormatter={formatAEDCompact} />}
          </Card>
          <Card>
            <CardHeader title="Turnover trend" subtitle="Annualized, trailing 12 months" />
            {!data ? <ChartSkeleton height={160} /> : (
              <TrendLine data={data.turnoverTrend} currentLabel="Turnover" valueFormatter={(v) => `${v.toFixed(2)}×`} showLegend={false} height={180} />
            )}
          </Card>
        </section>

        <Card>
          <CardHeader title="Stock aging" subtitle="Capital tied up in slow-moving inventory, by category" />
          {!data ? <ChartSkeleton height={280} /> : (
            <div className="space-y-5">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-label text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
                    All categories
                  </span>
                  <span className="tabular text-[12px] text-[var(--color-ink-secondary)]">
                    {formatAEDFull(data.agingBuckets.reduce((a, b) => a + b.value, 0))} total
                  </span>
                </div>
                <SeverityCompositionBar buckets={data.agingBuckets} valueFormatter={formatAEDCompact} height={38} />
                <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
                  {data.agingBuckets.map((b) => (
                    <div key={b.key} className="flex items-center gap-1.5">
                      <span className="inline-block h-2 w-2.5 rounded-[2px]" style={{ backgroundColor: b.color }} />
                      <span className="font-label text-[11px] text-[var(--color-ink-secondary)]">{b.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-[var(--color-border)] pt-4">
                <div className="mb-3 font-label text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
                  By category · sorted by 180+ day exposure
                </div>
                <div className="space-y-3">
                  {data.agedRows.map((row) => {
                    const buckets = AGING_BUCKETS.map((b, i) => ({ key: b.id, label: b.label, value: row.buckets[b.id], color: STOCK_AGING_RAMP[i] }));
                    return (
                      <div key={row.categoryId} className="grid grid-cols-[140px_1fr_100px] items-center gap-4">
                        <span className="truncate text-[12.5px] font-medium text-[var(--color-ink)]">{row.categoryName}</span>
                        <SeverityCompositionBar buckets={buckets} valueFormatter={formatAEDCompact} height={16} compact />
                        <span className="text-right tabular text-[12px] text-[var(--color-ink-secondary)]">
                          {formatAEDCompact(row.totalValueAED)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Aged stock highlights" subtitle="Specific slow-moving pieces, 180+ days — illustrative SKUs" />
          {!data ? <ChartSkeleton height={220} /> : (
            <div className="flex flex-col">
              {data.agedHighlights.map((item, i) => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between gap-4 py-2.5 ${i !== data.agedHighlights.length - 1 ? "border-b border-[var(--color-border)]" : ""}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-medium text-[var(--color-ink)]">{item.description}</p>
                    <p className="mt-0.5 font-label text-[11px] text-[var(--color-ink-muted)]">
                      {item.sku} · {item.branch} · aged {item.daysAged}d
                    </p>
                  </div>
                  <span className="shrink-0 tabular text-[12.5px] font-semibold text-[var(--color-ink)]">
                    {formatAEDFull(item.valueAED)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </main>
    </>
  );
}
