import type { AnalysisTabId } from "../features/analysis/analysisRegistry";

export type TimeWindow = "week" | "4w" | "12w";

export type StoryAction = {
  label: string;
  to: { tab: AnalysisTabId; item: string };
  kind?: "primary" | "secondary";
};

export type InsightsStoryModel = {
  lensLabel: string;
  timeWindow: TimeWindow;
  lastUpdated: string;
  heroMetrics: { label: string; value: string; delta?: string }[];
  sightingsSeries: number[];
  coverageSeries?: number[];
  storyCards: {
    id: string;
    title: string;
    body: string;
    metricHint?: string;
    infoTip?: string;
    actions: StoryAction[];
  }[];
};

export const TIME_WINDOW_LABELS: Record<TimeWindow, string> = {
  week: "This week",
  "4w": "Last 4 weeks",
  "12w": "Last 12 weeks",
};

const LENS_LABEL = "Lens: Reported sightings (not real-time)";
const INFO_TIPS = {
  change:
    "Compares reported sightings and active grids in the selected window vs the prior window. Not ground truth presence.",
  confident:
    "Consistency reflects reporting density and proxy coverage, not verified animal location.",
  uncertain:
    "Uncertainty is driven by low sampling/coverage. Offshore under-reporting is common.",
  drivers:
    "These are plausible correlates (calendar, effort, proxies). They are not causal conclusions.",
};

const MODEL_BY_WINDOW: Record<TimeWindow, InsightsStoryModel> = {
  week: {
    lensLabel: LENS_LABEL,
    timeWindow: "week",
    lastUpdated: "2026-02-05 19:16",
    heroMetrics: [
      { label: "Δ Sightings WoW", value: "+12%", delta: "+148 reports" },
      { label: "Active grids", value: "44", delta: "+6 grids" },
      { label: "Coverage score", value: "0.61", delta: "+0.04" },
      { label: "Hotspot persistence", value: "0.72", delta: "+0.08" },
    ],
    sightingsSeries: [42, 58, 49, 67, 73, 69, 81],
    coverageSeries: [0.52, 0.55, 0.5, 0.58, 0.6, 0.59, 0.61],
    storyCards: [
      {
        id: "week-change",
        title: "What changed vs last week?",
        body: "Sightings concentrated more tightly around the central corridor, while fringe reports faded.",
        metricHint: "WoW change: +12% | Active grids: 44",
        infoTip: INFO_TIPS.change,
        actions: [
          { label: "Hotspot persistence", to: { tab: "sightings", item: "hotspots" }, kind: "primary" },
          { label: "Lag structure", to: { tab: "sightings", item: "lag_structure" }, kind: "secondary" },
        ],
      },
      {
        id: "confident-areas",
        title: "Most consistent reporting",
        body: "Core nearshore zones show consistent reporting and lower variance week-to-week.",
        metricHint: "Coverage index: 0.74 | Variance: low",
        infoTip: INFO_TIPS.confident,
        actions: [
          { label: "Seasonality baseline", to: { tab: "sightings", item: "seasonality" }, kind: "primary" },
          { label: "Coverage gaps", to: { tab: "sightings", item: "gap_analysis" }, kind: "secondary" },
        ],
      },
      {
        id: "uncertain-areas",
        title: "Lowest coverage areas",
        body: "Offshore areas remain under-sampled with sparse effort data and weaker reporting consistency.",
        metricHint: "Low coverage: 0.31 | Sparse offshore reports",
        infoTip: INFO_TIPS.uncertain,
        actions: [
          { label: "Effort proxy", to: { tab: "humans", item: "effort_proxy" }, kind: "primary" },
          { label: "Accessibility bias", to: { tab: "humans", item: "accessibility_bias" }, kind: "secondary" },
        ],
      },
      {
        id: "drivers",
        title: "Top plausible drivers",
        body: "Calendar effects and observation effort are the dominant near-term drivers this week.",
        metricHint: "Calendar lift: +8% | Effort proxy: stable",
        infoTip: INFO_TIPS.drivers,
        actions: [
          { label: "Calendar effects", to: { tab: "humans", item: "calendar_effects" }, kind: "primary" },
          { label: "Effort proxy", to: { tab: "humans", item: "effort_proxy" }, kind: "secondary" },
          { label: "Lag detective", to: { tab: "relationships", item: "lag_detective" }, kind: "secondary" },
        ],
      },
    ],
  },
  "4w": {
    lensLabel: LENS_LABEL,
    timeWindow: "4w",
    lastUpdated: "2026-02-05 19:16",
    heroMetrics: [
      { label: "Δ Sightings", value: "+6%", delta: "+212 reports" },
      { label: "Active grids", value: "52", delta: "+10 grids" },
      { label: "Coverage score", value: "0.58", delta: "+0.02" },
      { label: "Hotspot persistence", value: "0.68", delta: "+0.05" },
    ],
    sightingsSeries: [48, 52, 61, 57, 69, 64, 70, 66, 72, 75, 71, 78],
    coverageSeries: [0.49, 0.51, 0.54, 0.52, 0.56, 0.55, 0.57, 0.56, 0.58, 0.59, 0.57, 0.58],
    storyCards: [
      {
        id: "4w-change",
        title: "What changed vs last month?",
        body: "The central corridor remains dominant, but secondary hotspots are stabilizing.",
        metricHint: "4W change: +6% | Active grids: 52",
        infoTip: INFO_TIPS.change,
        actions: [
          { label: "Hotspot persistence", to: { tab: "sightings", item: "hotspots" }, kind: "primary" },
          { label: "Lag structure", to: { tab: "sightings", item: "lag_structure" }, kind: "secondary" },
        ],
      },
      {
        id: "4w-confident",
        title: "Most consistent reporting",
        body: "Nearshore corridors show sustained reporting with a stable effort proxy.",
        metricHint: "Coverage index: 0.69 | Variance: moderate",
        infoTip: INFO_TIPS.confident,
        actions: [
          { label: "Seasonality baseline", to: { tab: "sightings", item: "seasonality" }, kind: "primary" },
          { label: "Coverage gaps", to: { tab: "sightings", item: "gap_analysis" }, kind: "secondary" },
        ],
      },
      {
        id: "4w-uncertain",
        title: "Lowest coverage areas",
        body: "Offshore sampling remains inconsistent with thin effort coverage.",
        metricHint: "Low coverage: 0.34 | Offshore signals: sparse",
        infoTip: INFO_TIPS.uncertain,
        actions: [
          { label: "Effort proxy", to: { tab: "humans", item: "effort_proxy" }, kind: "primary" },
          { label: "Accessibility bias", to: { tab: "humans", item: "accessibility_bias" }, kind: "secondary" },
        ],
      },
      {
        id: "4w-drivers",
        title: "Top plausible drivers",
        body: "Calendar effects and reporting access explain most variability over the last month.",
        metricHint: "Calendar lift: +5% | Access bias: medium",
        infoTip: INFO_TIPS.drivers,
        actions: [
          { label: "Calendar effects", to: { tab: "humans", item: "calendar_effects" }, kind: "primary" },
          { label: "Effort proxy", to: { tab: "humans", item: "effort_proxy" }, kind: "secondary" },
          { label: "Lag detective", to: { tab: "relationships", item: "lag_detective" }, kind: "secondary" },
        ],
      },
    ],
  },
  "12w": {
    lensLabel: LENS_LABEL,
    timeWindow: "12w",
    lastUpdated: "2026-02-05 19:16",
    heroMetrics: [
      { label: "Δ Sightings", value: "+3%", delta: "+380 reports" },
      { label: "Active grids", value: "61", delta: "+18 grids" },
      { label: "Coverage score", value: "0.55", delta: "+0.01" },
      { label: "Hotspot persistence", value: "0.64", delta: "+0.03" },
    ],
    sightingsSeries: [41, 46, 52, 49, 55, 58, 63, 60, 66, 70, 68, 72],
    coverageSeries: [0.45, 0.47, 0.49, 0.48, 0.5, 0.51, 0.53, 0.52, 0.54, 0.55, 0.54, 0.55],
    storyCards: [
      {
        id: "12w-change",
        title: "What changed vs last quarter?",
        body: "The core corridor is persistent, with modest expansion into secondary zones.",
        metricHint: "12W change: +3% | Active grids: 61",
        infoTip: INFO_TIPS.change,
        actions: [
          { label: "Hotspot persistence", to: { tab: "sightings", item: "hotspots" }, kind: "primary" },
          { label: "Lag structure", to: { tab: "sightings", item: "lag_structure" }, kind: "secondary" },
        ],
      },
      {
        id: "12w-confident",
        title: "Most consistent reporting",
        body: "Nearshore reporting remains consistent, with fewer week-to-week swings.",
        metricHint: "Coverage index: 0.66 | Variance: low",
        infoTip: INFO_TIPS.confident,
        actions: [
          { label: "Seasonality baseline", to: { tab: "sightings", item: "seasonality" }, kind: "primary" },
          { label: "Coverage gaps", to: { tab: "sightings", item: "gap_analysis" }, kind: "secondary" },
        ],
      },
      {
        id: "12w-uncertain",
        title: "Lowest coverage areas",
        body: "Longer windows highlight persistent offshore gaps in reporting coverage.",
        metricHint: "Low coverage: 0.33 | Offshore effort: thin",
        infoTip: INFO_TIPS.uncertain,
        actions: [
          { label: "Effort proxy", to: { tab: "humans", item: "effort_proxy" }, kind: "primary" },
          { label: "Accessibility bias", to: { tab: "humans", item: "accessibility_bias" }, kind: "secondary" },
        ],
      },
      {
        id: "12w-drivers",
        title: "Top plausible drivers",
        body: "Effort intensity continues to explain most variation, with minor calendar effects.",
        metricHint: "Effort proxy: stable | Calendar lift: +3%",
        infoTip: INFO_TIPS.drivers,
        actions: [
          { label: "Calendar effects", to: { tab: "humans", item: "calendar_effects" }, kind: "primary" },
          { label: "Effort proxy", to: { tab: "humans", item: "effort_proxy" }, kind: "secondary" },
          { label: "Lag detective", to: { tab: "relationships", item: "lag_detective" }, kind: "secondary" },
        ],
      },
    ],
  },
};

export const getInsightsStoryModel = (timeWindow: TimeWindow) => MODEL_BY_WINDOW[timeWindow];
