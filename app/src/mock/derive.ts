import { MONTHLY_SALES, SALESMAN_MONTHLY, rollupFor, type MonthlySalesRollup } from "./sales";
import { MONTHS, CURRENT_MONTH, monthsForPeriod, type PeriodPreset } from "./calendar";
import { BRANCHES, BRANDS, CATEGORIES, DIVISIONS, METAL_TYPES, SALESMEN } from "./dimensions";
import { STOCK_VALUATION, latestStockValuation } from "./inventory";
import { GOLD_PRICE_SERIES } from "./goldPrice";
import type { BranchFilter } from "@/store/filters";

function branchRevenue(r: MonthlySalesRollup, branch: BranchFilter): number {
  return branch === "all" ? r.revenue : (r.byBranch[branch] ?? 0);
}

function branchShare(r: MonthlySalesRollup, branch: BranchFilter): number {
  return branch === "all" ? 1 : (r.byBranch[branch] ?? 0) / r.revenue;
}

/** Index of a monthKey within MONTHS, or -1. */
function monthIdx(monthKey: string): number {
  return MONTHS.findIndex((m) => m.key === monthKey);
}

export function priorYearRollup(monthKey: string): MonthlySalesRollup | undefined {
  const idx = monthIdx(monthKey);
  if (idx < 12) return undefined;
  return MONTHLY_SALES[idx - 12];
}

export interface PeriodTotals {
  revenue: number;
  grossMargin: number;
  grossMarginPct: number;
  invoiceCount: number;
  avgBasketAED: number;
  discountPct: number;
}

export function totalsForMonths(months: { key: string }[], branch: BranchFilter): PeriodTotals {
  const rollups = months.map((m) => rollupFor(m.key));
  const revenue = rollups.reduce((a, r) => a + branchRevenue(r, branch), 0);
  const grossMargin = rollups.reduce((a, r) => a + r.grossMargin * branchShare(r, branch), 0);
  const invoiceCount = Math.round(rollups.reduce((a, r) => a + r.invoiceCount * branchShare(r, branch), 0));
  const discountAED = rollups.reduce((a, r) => a + r.discountAED * branchShare(r, branch), 0);
  return {
    revenue,
    grossMargin,
    grossMarginPct: revenue ? grossMargin / revenue : 0,
    invoiceCount,
    avgBasketAED: invoiceCount ? revenue / invoiceCount : 0,
    discountPct: revenue ? discountAED / revenue : 0,
  };
}

/** Same month-count window immediately preceding the given months (for period-over-period deltas). */
export function priorComparableMonths(months: { key: string }[]): { key: string }[] {
  const firstIdx = monthIdx(months[0].key);
  const count = months.length;
  const start = firstIdx - count;
  if (start < 0) return [];
  return MONTHS.slice(start, firstIdx);
}

export function currentAndPriorTotals(period: PeriodPreset, branch: BranchFilter) {
  const months = monthsForPeriod(period);
  const priorMonths = priorComparableMonths(months);
  return {
    months,
    current: totalsForMonths(months, branch),
    prior: priorMonths.length ? totalsForMonths(priorMonths, branch) : undefined,
    priorLabel: months.length === 1 ? "last month" : "prior period",
  };
}

/** Trailing 12 months vs the same 12 months a year earlier — the flagship trend window (independent of the top period filter, which would otherwise degenerate to a single point). */
export function revenueTrendYoY(branch: BranchFilter) {
  const trailing = MONTHS.slice(-12);
  return trailing.map((m) => {
    const r = rollupFor(m.key);
    const prior = priorYearRollup(m.key);
    return {
      key: m.key,
      label: m.shortLabel,
      current: branchRevenue(r, branch),
      prior: prior ? branchRevenue(prior, branch) : undefined,
    };
  });
}

export function categoryMixForMonths(months: { key: string }[], branch: BranchFilter) {
  const rollups = months.map((m) => rollupFor(m.key));
  return CATEGORIES.map((c) => ({
    key: c.id,
    label: c.name,
    value: rollups.reduce((a, r) => a + (r.byCategory[c.id] ?? 0) * branchShare(r, branch), 0),
  })).filter((c) => c.value > 0);
}

export function brandMixForMonths(months: { key: string }[], branch: BranchFilter) {
  const rollups = months.map((m) => rollupFor(m.key));
  return BRANDS.map((b) => ({
    key: b.id,
    label: b.name,
    value: rollups.reduce((a, r) => a + (r.byBrand[b.id] ?? 0) * branchShare(r, branch), 0),
  })).filter((b) => b.value > 0);
}

export function divisionMixForMonths(months: { key: string }[], branch: BranchFilter) {
  const rollups = months.map((m) => rollupFor(m.key));
  return DIVISIONS.map((d) => ({
    key: d.id,
    label: d.name,
    value: rollups.reduce((a, r) => a + (r.byDivision[d.id] ?? 0) * branchShare(r, branch), 0),
  }));
}

export function metalMixForMonths(months: { key: string }[], branch: BranchFilter) {
  const rollups = months.map((m) => rollupFor(m.key));
  return METAL_TYPES.map((m2) => ({
    key: m2.id,
    label: `${m2.name} ${m2.purity}`,
    value: rollups.reduce((a, r) => a + (r.byMetal[m2.id] ?? 0) * branchShare(r, branch), 0),
  }));
}

export function branchHeatmapData(monthCount = 8) {
  const trailing = MONTHS.slice(-monthCount);
  const cells = BRANCHES.flatMap((b) =>
    trailing.map((m) => ({ rowKey: b.id, colKey: m.key, value: rollupFor(m.key).byBranch[b.id] ?? 0 })),
  );
  return {
    rows: BRANCHES.map((b) => ({ key: b.id, label: b.name })),
    cols: trailing.map((m) => ({ key: m.key, label: m.shortLabel })),
    cells,
  };
}

export function salesmanLeaderboardForMonths(months: { key: string }[], branch: BranchFilter, topN = 5) {
  const relevant = SALESMEN.filter((s) => branch === "all" || s.branchId === branch);
  const rows = relevant.map((s) => {
    const monthKeys = new Set(months.map((m) => m.key));
    const perf = SALESMAN_MONTHLY.filter((p) => p.salesmanId === s.id && monthKeys.has(p.monthKey));
    const revenue = perf.reduce((a, p) => a + p.revenue, 0);
    const dealsCount = perf.reduce((a, p) => a + p.dealsCount, 0);
    const target = s.monthlyTargetAED * months.length;
    const branchName = BRANCHES.find((b) => b.id === s.branchId)?.name ?? "";
    return {
      key: s.id,
      label: s.name,
      sublabel: branchName,
      value: revenue,
      target,
      attainment: revenue / target,
      dealsCount,
      avgBasketAED: dealsCount ? revenue / dealsCount : 0,
    };
  });
  return rows.sort((a, b) => b.value - a.value).slice(0, topN);
}

export function discountTrendSeries() {
  const trailing = MONTHS.slice(-12);
  return trailing.map((m) => {
    const r = rollupFor(m.key);
    return { key: m.key, label: m.shortLabel, current: r.discountPct };
  });
}

/** Stock value vs. gold price, both indexed to 100 at the start of the trailing-12-month window. */
export function goldSensitivityTrend() {
  const baseIdx = MONTHS.length - 13;
  const goldBase = GOLD_PRICE_SERIES[baseIdx].pricePerGramAED;
  const stockBase = STOCK_VALUATION[baseIdx].stockValueAED;
  return MONTHS.slice(-12).map((m, i) => {
    const idx = baseIdx + 1 + i;
    return {
      key: m.key,
      label: m.shortLabel,
      current: Math.round((STOCK_VALUATION[idx].stockValueAED / stockBase) * 1000) / 10,
      prior: Math.round((GOLD_PRICE_SERIES[idx].pricePerGramAED / goldBase) * 1000) / 10,
    };
  });
}

export function stockByMetalComposition() {
  const latest = latestStockValuation();
  return METAL_TYPES.map((m) => ({ key: m.id, label: `${m.name} ${m.purity}`, value: latest.byMetal[m.id] ?? 0 }));
}

export function stockByCategoryComposition() {
  const latest = latestStockValuation();
  return CATEGORIES.map((c) => ({ key: c.id, label: c.name, value: latest.byCategory[c.id] ?? 0 })).filter(
    (c) => c.value > 0,
  );
}

// ─── Category contribution — for the "what moved" waterfall, not "what's biggest" ───

export interface CategoryContribution {
  key: string;
  label: string;
  current: number;
  prior: number;
  delta: number;
}

export function categoryContribution(
  months: { key: string }[],
  priorMonths: { key: string }[],
  branch: BranchFilter,
): CategoryContribution[] {
  const current = categoryMixForMonths(months, branch);
  const prior = categoryMixForMonths(priorMonths, branch);
  const priorMap = new Map(prior.map((c) => [c.key, c.value]));
  return current.map((c) => {
    const p = priorMap.get(c.key) ?? 0;
    return { key: c.key, label: c.label, current: c.value, prior: p, delta: c.value - p };
  });
}

/** Same "what moved" shape as categoryContribution, one dimension level down — by designer
 *  brand rather than item type. Shares the CategoryContribution shape since both feed the same
 *  ContributionWaterfall component. */
export function brandContribution(
  months: { key: string }[],
  priorMonths: { key: string }[],
  branch: BranchFilter,
): CategoryContribution[] {
  const current = brandMixForMonths(months, branch);
  const prior = brandMixForMonths(priorMonths, branch);
  const priorMap = new Map(prior.map((b) => [b.key, b.value]));
  return current.map((b) => {
    const p = priorMap.get(b.key) ?? 0;
    return { key: b.key, label: b.label, current: b.value, prior: p, delta: b.value - p };
  });
}

// ─── Salesman momentum & archetype — the signals a pure ranked bar can't carry ───

function rankInMonth(monthKey: string): Map<string, number> {
  const rows = SALESMAN_MONTHLY.filter((p) => p.monthKey === monthKey).sort((a, b) => b.revenue - a.revenue);
  const map = new Map<string, number>();
  rows.forEach((r, i) => map.set(r.salesmanId, i + 1));
  return map;
}

/** Rank shift vs `monthsBack` months ago — positive means the rep climbed. */
export function salesmanMomentum(monthsBack = 3): Map<string, number> {
  const currentMap = rankInMonth(CURRENT_MONTH.key);
  const priorIdx = MONTHS.length - 1 - monthsBack;
  const priorMap = priorIdx >= 0 ? rankInMonth(MONTHS[priorIdx].key) : new Map<string, number>();
  const out = new Map<string, number>();
  currentMap.forEach((rank, id) => {
    const priorRank = priorMap.get(id);
    if (priorRank !== undefined) out.set(id, priorRank - rank);
  });
  return out;
}

export type Archetype = "star" | "volume" | "premium" | "support" | null;

export function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Only tags reps meaningfully off the team median — most rows get no tag, by design. */
export function classifyArchetype(
  row: { dealsCount: number; avgBasketAED: number },
  medianDeals: number,
  medianBasket: number,
): Archetype {
  const highVol = row.dealsCount > medianDeals * 1.15;
  const lowVol = row.dealsCount < medianDeals * 0.85;
  const highVal = row.avgBasketAED > medianBasket * 1.15;
  const lowVal = row.avgBasketAED < medianBasket * 0.85;
  if (highVol && highVal) return "star";
  if (highVol) return "volume";
  if (highVal) return "premium";
  if (lowVol && lowVal) return "support";
  return null;
}
