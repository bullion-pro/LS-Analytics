/**
 * Raw hex mirrors of the CSS tokens in index.css, for contexts (Recharts SVG
 * fills/strokes/gradient stops) where a literal value is safer than relying
 * on var() resolution inside generated defs. Keep in sync with index.css.
 */
export const chartColors = {
  ink: "#16130f",
  inkSecondary: "#5c564c",
  inkMuted: "#8c8577",
  surface: "#ffffff",
  surfaceSunken: "#f2efe8",
  hairline: "#e7e2d8",
  baseline: "#c9c2b3",

  accent: "#b08d4f",
  accentDark: "#8a6c38",
  accentLight: "#f6eedd",

  obsidian: "#14110e",
  onObsidian: "#ffffff",
  onObsidianSecondary: "rgba(255,255,255,0.66)",
  onObsidianMuted: "rgba(255,255,255,0.4)",
  accentOnObsidian: "#d9b978",

  good: "#0ca30c",
  goodTint: "#e3f6e1",
  warning: "#fab219",
  warningTint: "#fff2da",
  serious: "#ec835a",
  seriousTint: "#fce4d9",
  critical: "#d03b3b",
  criticalTint: "#fbe1e0",

  cat: ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"],

  seq: {
    100: "#cde2fb",
    200: "#9ec5f4",
    300: "#6da7ec",
    400: "#3987e5",
    500: "#256abf",
    600: "#184f95",
    700: "#0d366b",
  },

  divPosStrong: "#2a78d6",
  divPosMid: "#9ec5f4",
  divNeutral: "#f0efec",
  divNegMid: "#f3b3b2",
  divNegStrong: "#e34948",
} as const;

export const AGING_STATUS_RAMP = [chartColors.baseline, chartColors.warning, chartColors.serious, chartColors.critical];

/** 5-step sequential ramp for stock-aging buckets (0-30 through 180+) — light = fresh, dark = old. */
export const STOCK_AGING_RAMP = [chartColors.seq[100], chartColors.seq[200], chartColors.seq[300], chartColors.seq[500], chartColors.seq[700]];
