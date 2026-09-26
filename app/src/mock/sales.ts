import { BRANCHES, BRANDS, CATEGORIES, DIVISIONS, METAL_TYPES, SALESMEN } from "./dimensions";
import { MONTHS, seasonalityFor, daysBeforeLabel } from "./calendar";
import { GOLD_PRICE_SERIES } from "./goldPrice";
import { pickProductLine } from "./products";
import { createRng, rngGaussian } from "./rng";

export interface MonthlySalesRollup {
  monthKey: string;
  revenue: number;
  costOfGoods: number;
  grossMargin: number;
  grossMarginPct: number;
  invoiceCount: number;
  unitsSold: number;
  avgBasketAED: number;
  discountAED: number;
  discountPct: number;
  byBranch: Record<string, number>;
  byDivision: Record<string, number>;
  byCategory: Record<string, number>;
  byBrand: Record<string, number>;
  byMetal: Record<string, number>;
}

function normalizedShares(rng: () => number, weights: number[], noiseAmp: number): number[] {
  const noised = weights.map((w) => Math.max(0.01, w * (1 + rngGaussian(rng, 0, noiseAmp))));
  const sum = noised.reduce((a, b) => a + b, 0);
  return noised.map((v) => v / sum);
}

function splitByWeights(
  rng: () => number,
  total: number,
  entries: { id: string; weight: number }[],
  noiseAmp: number,
): Record<string, number> {
  const shares = normalizedShares(rng, entries.map((e) => e.weight), noiseAmp);
  const out: Record<string, number> = {};
  entries.forEach((e, i) => {
    out[e.id] = Math.round(total * shares[i]);
  });
  return out;
}

const BASE_MONTHLY_REVENUE = 213_000; // AED, blended company baseline — small multi-branch boutique, not a national chain
const ANNUAL_GROWTH = 0.15;

export const MONTHLY_SALES: MonthlySalesRollup[] = (() => {
  const rng = createRng(4242);
  return MONTHS.map((m, t) => {
    const yearsElapsed = t / 12;
    const growth = Math.pow(1 + ANNUAL_GROWTH, yearsElapsed);
    const season = seasonalityFor(m.monthIndex);
    const noise = 1 + rngGaussian(rng, 0, 0.045);
    const revenue = Math.round(BASE_MONTHLY_REVENUE * growth * season * noise);

    // Margin compresses slightly when gold price momentum is high (cost pass-through lag).
    const goldIdx = GOLD_PRICE_SERIES[t];
    const goldPrev = GOLD_PRICE_SERIES[Math.max(0, t - 1)];
    const goldMomentum = (goldIdx.pricePerGramAED - goldPrev.pricePerGramAED) / goldPrev.pricePerGramAED;
    const grossMarginPct = Math.max(0.22, Math.min(0.36, 0.315 - goldMomentum * 1.4 + rngGaussian(rng, 0, 0.008)));
    const grossMargin = Math.round(revenue * grossMarginPct);
    const costOfGoods = revenue - grossMargin;

    const discountPct = Math.max(0.02, 0.055 + (1 - season) * 0.03 + rngGaussian(rng, 0, 0.006));
    const discountAED = Math.round(revenue * discountPct);

    const avgUnitPrice = 3050 + rngGaussian(rng, 0, 90);
    const unitsSold = Math.round(revenue / avgUnitPrice);
    const avgItemsPerInvoice = 1.55 + rngGaussian(rng, 0, 0.05);
    const invoiceCount = Math.max(1, Math.round(unitsSold / avgItemsPerInvoice));
    const avgBasketAED = Math.round(revenue / invoiceCount);

    const byBranch = splitByWeights(rng, revenue, BRANCHES, 0.06);
    const byDivision = splitByWeights(rng, revenue, DIVISIONS, 0.04);

    const jewelleryRevenue = byDivision["div-jewellery"];
    const jewelleryCategories = CATEGORIES.filter((c) => c.divisionId === "div-jewellery");
    const byCategory: Record<string, number> = splitByWeights(rng, jewelleryRevenue, jewelleryCategories, 0.07);
    byCategory["cat-watches"] = byDivision["div-watches"];
    byCategory["cat-bags"] = byDivision["div-bags"];
    byCategory["cat-perfume"] = byDivision["div-perfume"];

    const byMetal = splitByWeights(rng, jewelleryRevenue, METAL_TYPES, 0.05);
    // Brand is a designer-label split of the same jewellery revenue byCategory splits by item
    // type — not a separate pool, so it's drawn from jewelleryRevenue too, not overall revenue.
    const byBrand = splitByWeights(rng, jewelleryRevenue, BRANDS, 0.08);

    return {
      monthKey: m.key,
      revenue,
      costOfGoods,
      grossMargin,
      grossMarginPct,
      invoiceCount,
      unitsSold,
      avgBasketAED,
      discountAED,
      discountPct,
      byBranch,
      byDivision,
      byCategory,
      byBrand,
      byMetal,
    };
  });
})();

export function rollupFor(monthKey: string): MonthlySalesRollup {
  return MONTHLY_SALES.find((r) => r.monthKey === monthKey)!;
}

export function sumRevenue(rollups: MonthlySalesRollup[]): number {
  return rollups.reduce((a, r) => a + r.revenue, 0);
}

// ─── Salesman performance — allocated from branch revenue so totals reconcile ───

export interface SalesmanMonthlyPerformance {
  salesmanId: string;
  monthKey: string;
  revenue: number;
  dealsCount: number;
  avgBasketAED: number;
  targetAED: number;
  attainmentPct: number;
}

export const SALESMAN_MONTHLY: SalesmanMonthlyPerformance[] = (() => {
  const rng = createRng(9911);
  const skill: Record<string, number> = {};
  SALESMEN.forEach((s) => {
    skill[s.id] = 0.78 + rng() * 0.5; // fixed per-salesman skill multiplier
  });

  // Skilled closers upsell more — basket size tracks skill, not just deal volume.
  const basketBase: Record<string, number> = {};
  SALESMEN.forEach((s) => {
    basketBase[s.id] = 2350 + skill[s.id] * 900;
  });

  const rows: SalesmanMonthlyPerformance[] = [];
  MONTHLY_SALES.forEach((rollup) => {
    BRANCHES.forEach((branch) => {
      const branchRevenue = rollup.byBranch[branch.id];
      const team = SALESMEN.filter((s) => s.branchId === branch.id);
      const weights = team.map((s) => s.monthlyTargetAED * skill[s.id] * (1 + rngGaussian(rng, 0, 0.09)));
      const sum = weights.reduce((a, b) => a + b, 0);
      team.forEach((s, i) => {
        const revenue = Math.round(branchRevenue * (weights[i] / sum));
        const avgBasketAED = Math.round(basketBase[s.id] + rngGaussian(rng, 0, 80));
        const dealsCount = Math.max(1, Math.round(revenue / avgBasketAED));
        rows.push({
          salesmanId: s.id,
          monthKey: rollup.monthKey,
          revenue,
          dealsCount,
          avgBasketAED,
          targetAED: s.monthlyTargetAED,
          attainmentPct: revenue / s.monthlyTargetAED,
        });
      });
    });
  });
  return rows;
})();

export function salesmanPerformanceFor(monthKey: string): SalesmanMonthlyPerformance[] {
  return SALESMAN_MONTHLY.filter((r) => r.monthKey === monthKey);
}

export function salesmanTrend(salesmanId: string, months: number): SalesmanMonthlyPerformance[] {
  return SALESMAN_MONTHLY.filter((r) => r.salesmanId === salesmanId).slice(-months);
}

// ─── Recent sale line items — concrete texture beneath the rollups ───

export interface SalesActivityEntry {
  id: string;
  date: string;
  invoiceNo: string;
  categoryId: string;
  description: string;
  branch: string;
  salesman: string;
  amountAED: number;
}

/** A short, illustrative feed of individual invoice lines — same spirit as Finance's journal-voucher feed, grounded in real product naming rather than another rollup. */
export function recentSalesActivity(count = 7): SalesActivityEntry[] {
  const rng = createRng(15173);
  const anchor = MONTHS[MONTHS.length - 1].date;
  const yy = String(anchor.getFullYear()).slice(2);
  const mm = String(anchor.getMonth() + 1).padStart(2, "0");

  let cursorDay = 0;
  const entries: SalesActivityEntry[] = [];
  for (let i = 0; i < count; i++) {
    cursorDay += 1 + Math.floor(rng() * 2);
    const category = CATEGORIES[Math.floor(rng() * CATEGORIES.length)];
    const branch = BRANCHES[Math.floor(rng() * BRANCHES.length)];
    const team = SALESMEN.filter((s) => s.branchId === branch.id);
    const salesman = team[Math.floor(rng() * team.length)] ?? SALESMEN[0];
    const line = pickProductLine(rng, category.id);
    const invoiceSeq = 80000 + Math.floor(rng() * 19999);

    entries.push({
      id: `sale-${i}`,
      date: daysBeforeLabel(anchor, cursorDay),
      invoiceNo: `INV-${yy}${mm}-${invoiceSeq}`,
      categoryId: category.id,
      description: line.weightG ? `${line.templateName}, ${line.weightG}g` : line.templateName,
      branch: branch.name,
      salesman: salesman.name,
      amountAED: line.priceAED,
    });
  }
  return entries;
}
