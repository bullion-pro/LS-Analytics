import { MONTHS } from "./calendar";
import { createRng, rngGaussian } from "./rng";

export interface GoldPricePoint {
  monthKey: string;
  pricePerGramAED: number; // 24K
}

/**
 * Illustrative AED/gram (24K) gold price series — a rising trend with realistic
 * month-to-month volatility, consistent with the sustained 2024-2026 gold rally.
 * Used to drive the inventory page's price-sensitivity view.
 */
export const GOLD_PRICE_SERIES: GoldPricePoint[] = (() => {
  const rng = createRng(7331);
  const start = 292; // AED/gram, 24K, ~late 2024
  const monthlyDrift = 0.014; // ~1.4%/mo compounding drift
  let price = start;
  return MONTHS.map((m) => {
    const shock = rngGaussian(rng, 0, 1) * 0.018; // ~1.8% stdev monthly noise
    price = price * (1 + monthlyDrift + shock);
    return { monthKey: m.key, pricePerGramAED: Math.round(price * 100) / 100 };
  });
})();

export function goldPriceAt(monthKey: string): number {
  return GOLD_PRICE_SERIES.find((p) => p.monthKey === monthKey)?.pricePerGramAED ?? GOLD_PRICE_SERIES[0].pricePerGramAED;
}

export const PURITY_FACTOR: Record<string, number> = {
  "24K": 1,
  "22K": 0.916,
  "18K": 0.75,
};
