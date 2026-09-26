import { createColumnHelper } from "@tanstack/react-table";
import type { LucideIcon } from "lucide-react";
import { CalendarDays, Clock, Coins, Gem, PackageCheck, Box } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { ChartSkeleton } from "@/components/ui/ChartSkeleton";
import { DataTable } from "@/components/ui/DataTable";
import { ActivityFeed } from "@/components/ui/ActivityFeed";
import { TrendLine } from "@/components/charts/TrendLine";
import { RankedBar } from "@/components/charts/RankedBar";
import { SeverityCompositionBar } from "@/components/charts/SeverityCompositionBar";
import { AGING_STATUS_RAMP } from "@/components/charts/chartColors";
import { useMockQuery } from "@/lib/useMockQuery";
import {
  AP_AGING,
  AP_AGING_BUCKETS,
  MONTHLY_PURCHASING,
  SUPPLIER_SCORECARDS,
  apAgingTotalsByBucket,
  totalOutstandingAP,
  recentPurchaseActivity,
  type SupplierScorecard,
  type PurchaseActivityEntry,
} from "@/mock/purchasing";
import { computeDelta, formatAEDCompact, formatAEDFull } from "@/lib/format";

const CATEGORY_ICON: Record<PurchaseActivityEntry["category"], LucideIcon> = {
  Bullion: Coins,
  Gemstone: Gem,
  "Finished Goods": PackageCheck,
  Packaging: Box,
};

function buildSupplier() {
  const outstandingAP = totalOutstandingAP();
  const apTotals = apAgingTotalsByBucket();
  const apBuckets = AP_AGING_BUCKETS.map((b, i) => ({ key: b.id, label: b.label, value: apTotals[b.id], color: AGING_STATUS_RAMP[i] }));

  const spendRanked = [...SUPPLIER_SCORECARDS]
    .sort((a, b) => b.trailing12moSpendAED - a.trailing12moSpendAED)
    .map((s) => ({ key: s.supplierId, label: s.supplier.name, sublabel: s.supplier.category, value: s.trailing12moSpendAED }));

  const cycleTrend = MONTHLY_PURCHASING.slice(-12).map((r) => ({ key: r.monthKey, label: r.monthKey.slice(5), current: r.avgPoCycleDays }));
  const cycleLatest = MONTHLY_PURCHASING[MONTHLY_PURCHASING.length - 1];
  const cyclePrior = MONTHLY_PURCHASING[MONTHLY_PURCHASING.length - 2];
  const cycleDelta = computeDelta(cycleLatest.avgPoCycleDays, cyclePrior.avgPoCycleDays, "last month", false);

  const apBySupplier = [...AP_AGING].sort(
    (a, b) => b.buckets["31-60"] + b.buckets["61-90+"] - (a.buckets["31-60"] + a.buckets["61-90+"]),
  );

  const avgTermsDays = Math.round(
    SUPPLIER_SCORECARDS.reduce((a, s) => a + s.supplier.paymentTermsDays, 0) / SUPPLIER_SCORECARDS.length,
  );

  const recentPurchases = recentPurchaseActivity(6).map((p) => ({
    id: p.id,
    icon: CATEGORY_ICON[p.category],
    description: p.description,
    meta: `${p.supplier} · ${p.docNo} · ${p.date}`,
    amountAED: p.amountAED,
    direction: "out" as const,
  }));

  return { outstandingAP, apBuckets, spendRanked, cycleTrend, cycleLatest, cycleDelta, apBySupplier, avgTermsDays, recentPurchases };
}

const columnHelper = createColumnHelper<SupplierScorecard>();
const scorecardColumns = [
  columnHelper.accessor((row) => row.supplier.name, {
    id: "name",
    header: "Supplier",
    cell: (c) => <span className="font-medium">{c.getValue()}</span>,
  }),
  columnHelper.accessor((row) => row.supplier.category, { id: "category", header: "Category" }),
  columnHelper.accessor("ratingOutOf5", {
    header: "Rating",
    cell: (c) => (
      <span className={`tabular font-medium ${c.getValue() < 3.5 ? "text-[#a12626]" : "text-[var(--color-ink)]"}`}>
        {c.getValue().toFixed(1)} / 5
      </span>
    ),
  }),
  columnHelper.accessor("onTimeDeliveryPct", {
    header: "On-time",
    cell: (c) => (
      <span className={`tabular font-medium ${c.getValue() < 80 ? "text-[#a12626]" : "text-[var(--color-ink)]"}`}>
        {c.getValue().toFixed(1)}%
      </span>
    ),
  }),
  columnHelper.accessor("defectRatePct", {
    header: "Defect rate",
    cell: (c) => (
      <span className={`tabular font-medium ${c.getValue() > 2.5 ? "text-[#a12626]" : "text-[var(--color-ink)]"}`}>
        {c.getValue().toFixed(1)}%
      </span>
    ),
  }),
  columnHelper.accessor((row) => row.supplier.paymentTermsDays, {
    id: "terms",
    header: "Terms",
    cell: (c) => <span className="tabular">{c.getValue()} days</span>,
  }),
  columnHelper.accessor("trailing12moSpendAED", {
    header: "12mo spend",
    cell: (c) => <span className="tabular">{formatAEDCompact(c.getValue())}</span>,
  }),
];

export function SupplierPage() {
  const { data, isPending, isPlaceholderData } = useMockQuery(["supplier"], buildSupplier);

  return (
    <>
      <TopBar title="Supplier & Purchasing" subtitle="All Branches · Live snapshot" />
      <main className={`flex-1 space-y-6 p-7 transition-opacity ${isPlaceholderData ? "opacity-60" : ""}`}>
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader title="Accounts payable aging" subtitle="Outstanding balance across 8 suppliers" />
            {!data ? <ChartSkeleton height={140} /> : (
              <>
                <AnimatedNumber
                  value={data.outstandingAP}
                  format={formatAEDFull}
                  className="mb-4 block text-[28px] font-semibold text-[var(--color-ink)]"
                />
                <SeverityCompositionBar buckets={data.apBuckets} valueFormatter={formatAEDCompact} height={40} />
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
                  {data.apBuckets.map((b) => (
                    <div key={b.key} className="flex items-center gap-1.5">
                      <span className="inline-block h-2 w-2.5 rounded-[2px]" style={{ backgroundColor: b.color }} />
                      <span className="font-label text-[11px] text-[var(--color-ink-secondary)]">{b.label}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>
          <div
            className="flex min-w-0 flex-col gap-3 rounded-2xl p-3"
            style={{ background: "linear-gradient(135deg, #f3e6c9 0%, #eee2cd 35%, #e9ddd8 70%, #ded6e0 100%)" }}
          >
            {!data || isPending ? (
              <>
                <ChartSkeleton height={100} />
                <ChartSkeleton height={100} />
              </>
            ) : (
              <>
                <StatTile
                  tone="glass"
                  label="Avg PO cycle time"
                  value={`${data.cycleLatest.avgPoCycleDays.toFixed(1)}d`}
                  numeric={{ raw: data.cycleLatest.avgPoCycleDays, format: (v) => `${v.toFixed(1)}d` }}
                  delta={data.cycleDelta}
                  deltaCaption="vs last month"
                  icon={Clock}
                />
                <StatTile
                  tone="glass"
                  label="Avg payment terms"
                  value={`${data.avgTermsDays}d`}
                  numeric={{ raw: data.avgTermsDays, format: (v) => `${Math.round(v)}d` }}
                  deltaCaption="across active suppliers"
                  icon={CalendarDays}
                />
              </>
            )}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader title="Spend by supplier" subtitle="Trailing 12 months" />
            {!data ? <ChartSkeleton height={280} /> : <RankedBar data={data.spendRanked} valueFormatter={formatAEDCompact} />}
          </Card>
          <Card>
            <CardHeader title="PO cycle time" subtitle="Days, trailing 12 months" />
            {!data ? <ChartSkeleton height={280} /> : (
              <TrendLine data={data.cycleTrend} currentLabel="Cycle time" valueFormatter={(v) => `${v.toFixed(0)}d`} showLegend={false} />
            )}
          </Card>
        </section>

        <Card>
          <CardHeader title="Recent purchase activity" subtitle="Illustrative PO/GRN lines, most recent first" />
          {!data ? <ChartSkeleton height={260} /> : <ActivityFeed entries={data.recentPurchases} valueFormatter={formatAEDFull} />}
        </Card>

        <Card>
          <CardHeader title="Supplier scorecard" subtitle="Rating, delivery reliability, and quality — flagged where it falls short" />
          {!data ? <ChartSkeleton height={220} /> : <DataTable data={SUPPLIER_SCORECARDS} columns={scorecardColumns} />}
        </Card>

        <Card>
          <CardHeader title="AP aging by supplier" subtitle="Sorted by 30+ day overdue exposure" />
          {!data ? <ChartSkeleton height={260} /> : (
            <div className="space-y-3">
              {data.apBySupplier.map((row) => {
                const buckets = AP_AGING_BUCKETS.map((b, i) => ({ key: b.id, label: b.label, value: row.buckets[b.id], color: AGING_STATUS_RAMP[i] }));
                return (
                  <div key={row.supplierId} className="grid grid-cols-[180px_1fr_100px] items-center gap-4">
                    <span className="truncate text-[12.5px] font-medium text-[var(--color-ink)]">{row.supplier.name}</span>
                    <SeverityCompositionBar buckets={buckets} valueFormatter={formatAEDCompact} height={16} compact />
                    <span className="text-right tabular text-[12px] text-[var(--color-ink-secondary)]">
                      {formatAEDCompact(row.outstandingAED)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </main>
    </>
  );
}
