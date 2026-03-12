// Shared constants and presets for export rendering in the stamp diary overlay.

import type { ExportPreset } from "./types";

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export const DAY_LABELS = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
] as const;

export const MONTH_PRESETS: ExportPreset[] = [
  {
    label: "Square",
    description: "1080 × 1080 · Instagram / Twitter",
    width: 1080,
    height: 1080,
  },
  {
    label: "OG Landscape",
    description: "1200 × 630 · Open Graph / Link previews",
    width: 1200,
    height: 630,
  },
  {
    label: "Large Square",
    description: "2048 × 2048 · High resolution",
    width: 2048,
    height: 2048,
  },
];

export const WEEK_PRESETS: ExportPreset[] = [
  {
    label: "Weekly Strip",
    description: "1400 × 560 · Horizontal week recap",
    width: 1400,
    height: 560,
  },
  {
    label: "Weekly Square",
    description: "1080 × 1080 · Compact week overview",
    width: 1080,
    height: 1080,
  },
  {
    label: "Weekly Strip HD",
    description: "2800 × 1120 · High resolution",
    width: 2800,
    height: 1120,
  },
];
