const compactAED = new Intl.NumberFormat("en-AE", {
  style: "currency",
  currency: "AED",
  notation: "compact",
  maximumFractionDigits: 1,
});

const fullAED = new Intl.NumberFormat("en-AE", {
  style: "currency",
  currency: "AED",
  maximumFractionDigits: 0,
});

const compactNumber = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const plainNumber = new Intl.NumberFormat("en-US");

export function formatAEDCompact(value: number): string {
  return compactAED.format(value);
}

export function formatAEDFull(value: number): string {
  return fullAED.format(value);
}

export function formatCompact(value: number): string {
  return compactNumber.format(value);
}

export function formatNumber(value: number): string {
  return plainNumber.format(value);
}

export function formatPct(value: number, digits = 1): string {
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatSignedPct(value: number, digits = 1): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${Math.abs(value * 100).toFixed(digits)}%`;
}

export interface Delta {
  value: number; // fractional change, e.g. 0.083 = +8.3%
  isGood: boolean;
  label: string; // e.g. "+8.3% vs last month"
}

/**
 * Computes a period-over-period delta. `higherIsBetter` decides the good/bad
 * color mapping (revenue up = good; AP aging up = bad; etc).
 */
export function computeDelta(current: number, previous: number, comparisonLabel: string, higherIsBetter = true): Delta {
  const value = previous === 0 ? 0 : (current - previous) / previous;
  const isGood = higherIsBetter ? value >= 0 : value <= 0;
  return { value, isGood, label: `${formatSignedPct(value)} vs ${comparisonLabel}` };
}
