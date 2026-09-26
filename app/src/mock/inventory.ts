import { BRANCHES, CATEGORIES, DIVISIONS, METAL_TYPES } from "./dimensions";
import { MONTHS } from "./calendar";
import { GOLD_PRICE_SERIES } from "./goldPrice";
import { MONTHLY_SALES } from "./sales";
import { pickProductLine, skuFor } from "./products";
import { createRng, rngGaussian } from "./rng";

const BASE_STOCK_VALUE_AED = 1_450_000;
const GOLD_PASS_THROUGH_BETA = 0.62; // <1: stock value is sensitive to gold price, not 1:1

export interface StockValuationPoint {
  monthKey: string;
  stockValueAED: number;
  goldIndex: number; // gold price rebased to 100 at series start
  stockIndex: number; // stock value rebased to 100 at series start
  byMetal: Record<string, number>;
  byCategory: Record<string, number>;
}

function normalizedSplit(rng: () => number, total: number, entries: { id: string; weight: number }[], noiseAmp: number) {
  const noised = entries.map((e) => Math.max(0.01, e.weight * (1 + rngGaussian(rng, 0, noiseAmp))));
  const sum = noised.reduce((a, b) => a + b, 0);
  const out: Record<string, number> = {};
  entries.forEach((e, i) => (out[e.id] = Math.round((total * noised[i]) / sum)));
  return out;
}

export const STOCK_VALUATION: StockValuationPoint[] = (() => {
  const rng = createRng(5151);
  const goldStart = GOLD_PRICE_SERIES[0].pricePerGramAED;
  let drift = 1;
  let stockStartValue = 0;

  const jewelleryCats = CATEGORIES.filter((c) => c.divisionId === "div-jewellery");
  const nonJewelleryCats = CATEGORIES.filter((c) => c.divisionId !== "div-jewellery");

  return MONTHS.map((m, t) => {
    const goldIdx = GOLD_PRICE_SERIES[t].pricePerGramAED / goldStart;
    drift *= 1 + 0.003 + rngGaussian(rng, 0, 0.006);
    const noise = 1 + rngGaussian(rng, 0, 0.015);
    const stockValueAED = Math.round(
      BASE_STOCK_VALUE_AED * (1 + GOLD_PASS_THROUGH_BETA * (goldIdx - 1)) * drift * noise,
    );
    if (t === 0) stockStartValue = stockValueAED;

    const jewelleryShare = 0.86;
    const jewelleryValue = Math.round(stockValueAED * jewelleryShare);
    const nonJewelleryValue = stockValueAED - jewelleryValue;

    const byCategory = {
      ...normalizedSplit(rng, jewelleryValue, jewelleryCats, 0.05),
      ...normalizedSplit(
        rng,
        nonJewelleryValue,
        nonJewelleryCats.map((c) => ({ id: c.id, weight: DIVISIONS.find((d) => d.id === c.divisionId)!.weight })),
        0.05,
      ),
    };
    const byMetal = normalizedSplit(rng, jewelleryValue, METAL_TYPES, 0.04);

    return {
      monthKey: m.key,
      stockValueAED,
      goldIndex: Math.round(goldIdx * 1000) / 10,
      stockIndex: Math.round((stockValueAED / stockStartValue) * 1000) / 10,
      byMetal,
      byCategory,
    };
  });
})();

export function latestStockValuation(): StockValuationPoint {
  return STOCK_VALUATION[STOCK_VALUATION.length - 1];
}

// ─── Turnover ratio (trailing-12mo COGS / trailing-12mo avg stock value) ───

export interface TurnoverPoint {
  monthKey: string;
  turnoverRatio: number; // annualized
}

export const TURNOVER_SERIES: TurnoverPoint[] = (() => {
  const out: TurnoverPoint[] = [];
  for (let t = 11; t < MONTHS.length; t++) {
    const trailing = MONTHLY_SALES.slice(t - 11, t + 1);
    const cogsSum = trailing.reduce((a, r) => a + r.costOfGoods, 0);
    const stockTrailing = STOCK_VALUATION.slice(t - 11, t + 1);
    const avgStock = stockTrailing.reduce((a, s) => a + s.stockValueAED, 0) / stockTrailing.length;
    out.push({ monthKey: MONTHS[t].key, turnoverRatio: Math.round((cogsSum / avgStock) * 100) / 100 });
  }
  return out;
})();

// ─── Aging buckets — a real jewelry-retail pain point: high-value slow movers ───

export type AgingBucketId = "0-30" | "31-60" | "61-90" | "91-180" | "180+";
export const AGING_BUCKETS: { id: AgingBucketId; label: string }[] = [
  { id: "0-30", label: "0-30 days" },
  { id: "31-60", label: "31-60 days" },
  { id: "61-90", label: "61-90 days" },
  { id: "91-180", label: "91-180 days" },
  { id: "180+", label: "180+ days" },
];

export interface CategoryAging {
  categoryId: string;
  categoryName: string;
  totalValueAED: number;
  buckets: Record<AgingBucketId, number>;
}

export const STOCK_AGING: CategoryAging[] = (() => {
  const rng = createRng(6161);
  const latest = latestStockValuation();
  // Perfume is excluded here: it's a low-value, fast-turning ancillary category with no
  // meaningful aging exposure, unlike gold/diamond-backed jewelry stock — including it in
  // "capital tied up in slow-moving inventory" misrepresents where that risk actually sits.
  return CATEGORIES.filter((cat) => cat.id !== "cat-perfume").map((cat) => {
    const totalValueAED = latest.byCategory[cat.id] ?? 0;
    // Fast movers (rings, earrings) skew young; bangles/sets/watches skew aged.
    const fastMoverBias = ["cat-rings", "cat-earrings", "cat-pendants"].includes(cat.id) ? 1 : 0;
    const base = fastMoverBias
      ? [0.32, 0.26, 0.17, 0.15, 0.1]
      : [0.14, 0.16, 0.18, 0.24, 0.28];
    const shares = base.map((b) => Math.max(0.02, b * (1 + rngGaussian(rng, 0, 0.08))));
    const sum = shares.reduce((a, b) => a + b, 0);
    const buckets = {} as Record<AgingBucketId, number>;
    AGING_BUCKETS.forEach((b, i) => {
      buckets[b.id] = Math.round((totalValueAED * shares[i]) / sum);
    });
    return { categoryId: cat.id, categoryName: cat.name, totalValueAED, buckets };
  });
})();

export function agingTotalsByBucket(): Record<AgingBucketId, number> {
  const totals = { "0-30": 0, "31-60": 0, "61-90": 0, "91-180": 0, "180+": 0 } as Record<AgingBucketId, number>;
  STOCK_AGING.forEach((c) => {
    AGING_BUCKETS.forEach((b) => (totals[b.id] += c.buckets[b.id]));
  });
  return totals;
}

// ─── Aged stock highlights — SKU-level texture beneath the category rollups ───

export interface AgedStockHighlight {
  id: string;
  sku: string;
  categoryId: string;
  description: string;
  branch: string;
  daysAged: number;
  valueAED: number;
}

// Bangles, necklace sets, watches, bracelets, and bags are this business's actual
// slow movers (see STOCK_AGING's fastMoverBias) — rings/earrings/pendants/perfume
// turn too fast to realistically surface here.
const SLOW_MOVING_CATEGORIES = ["cat-bangles", "cat-necklaces", "cat-watches", "cat-bracelets", "cat-bags"];

export function agedStockHighlights(count = 6): AgedStockHighlight[] {
  const rng = createRng(6767);
  const out: AgedStockHighlight[] = [];
  for (let i = 0; i < count; i++) {
    const categoryId = SLOW_MOVING_CATEGORIES[Math.floor(rng() * SLOW_MOVING_CATEGORIES.length)];
    const branch = BRANCHES[Math.floor(rng() * BRANCHES.length)];
    const line = pickProductLine(rng, categoryId);
    const daysAged = 182 + Math.floor(rng() * 178);
    out.push({
      id: `aged-${i}`,
      sku: skuFor(categoryId, 6767 + i * 97),
      categoryId,
      description: line.weightG ? `${line.templateName}, ${line.weightG}g` : line.templateName,
      branch: branch.name,
      daysAged,
      valueAED: line.priceAED,
    });
  }
  return out.sort((a, b) => b.daysAged - a.daysAged);
}
