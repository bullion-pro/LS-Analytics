/** 24-month trailing window ending at the current month, plus jewelry-specific seasonality. */

export interface MonthKey {
  key: string; // "2024-10"
  label: string; // "Oct 2024"
  shortLabel: string; // "Oct"
  year: number;
  monthIndex: number; // 0-11
  date: Date;
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const TODAY = new Date(2026, 8, 24); // 2026-09-24, matches session date

export const MONTHS: MonthKey[] = Array.from({ length: 24 }, (_, i) => {
  const offset = 23 - i;
  const d = new Date(TODAY.getFullYear(), TODAY.getMonth() - offset, 1);
  const monthIndex = d.getMonth();
  return {
    key: `${d.getFullYear()}-${String(monthIndex + 1).padStart(2, "0")}`,
    label: `${MONTH_NAMES[monthIndex]} ${d.getFullYear()}`,
    shortLabel: MONTH_NAMES[monthIndex],
    year: d.getFullYear(),
    monthIndex,
    date: d,
  };
});

export const CURRENT_MONTH = MONTHS[MONTHS.length - 1];
export const PRIOR_MONTH = MONTHS[MONTHS.length - 2];
export const CURRENT_MONTH_LAST_YEAR = MONTHS[MONTHS.length - 13];

/**
 * Illustrative jewelry-retail seasonality index by calendar month (1.0 = average).
 * Modeled on: Valentine's (Feb) gifting, Ramadan fasting-month slowdown shifting into
 * an Eid gifting bump, a summer lull as Gulf expat customers travel (Jun-Aug), and the
 * Oct-Dec wedding-season + Diwali + New Year peak that dominates the jewelry calendar.
 */
export const SEASONALITY_INDEX: Record<number, number> = {
  0: 0.95, // Jan
  1: 1.08, // Feb — Valentine's
  2: 0.92, // Mar — Ramadan
  3: 1.05, // Apr — Eid gifting
  4: 0.88, // May
  5: 0.78, // Jun — summer lull
  6: 0.8, // Jul
  7: 0.86, // Aug
  8: 0.95, // Sep
  9: 1.15, // Oct — Diwali + wedding season opens
  10: 1.22, // Nov — wedding season peak
  11: 1.18, // Dec — holidays + year-end
};

export function seasonalityFor(monthIndex: number): number {
  return SEASONALITY_INDEX[monthIndex] ?? 1;
}

const RECENT_DATE_FORMAT = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

/** Formats a date N days before an anchor — shared by every "recent activity" feed so dates read consistently. */
export function daysBeforeLabel(anchor: Date, days: number): string {
  const d = new Date(anchor);
  d.setDate(d.getDate() - days);
  return RECENT_DATE_FORMAT.format(d);
}

export type PeriodPreset = "this-month" | "qtd" | "ytd" | "last-12-months";

export const PERIOD_PRESETS: { id: PeriodPreset; label: string }[] = [
  { id: "this-month", label: "This Month" },
  { id: "qtd", label: "Quarter to Date" },
  { id: "ytd", label: "Year to Date" },
  { id: "last-12-months", label: "Last 12 Months" },
];

/** Returns the slice of MONTHS included in a given preset, most-recent-last. */
export function monthsForPeriod(preset: PeriodPreset): MonthKey[] {
  switch (preset) {
    case "this-month":
      return MONTHS.slice(-1);
    case "qtd": {
      const qStartMonth = Math.floor(CURRENT_MONTH.monthIndex / 3) * 3;
      const count = CURRENT_MONTH.monthIndex - qStartMonth + 1;
      return MONTHS.slice(-count);
    }
    case "ytd":
      return MONTHS.slice(-(CURRENT_MONTH.monthIndex + 1));
    case "last-12-months":
      return MONTHS.slice(-12);
    default:
      return MONTHS.slice(-12);
  }
}
