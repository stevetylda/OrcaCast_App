import type { AnalysisItem } from "./analysisRegistry";

export type AnalysisVisualType = "timeseries" | "heatmap" | "lag" | "map";

export type AnalysisDetailContent = {
  whatItShows: string;
  whyItMatters: string;
  takeaways: string[];
  caveats: string[];
  visuals: AnalysisVisualType[];
  footer: string;
};

const DEFAULT_FOOTER = "Data used: reported sightings + proxy layers · Coverage: rolling 90 days · Freshness: weekly";

export const ANALYSIS_DETAIL_CONTENT: Record<string, AnalysisDetailContent> = {
  seasonality: {
    whatItShows: "Typical intra-year timing of reported sightings and where this week deviates from the seasonal baseline.",
    whyItMatters: "Separates expected seasonal movement from short-term anomalies that may signal behavioral shifts.",
    takeaways: [
      "Peaks align with historical early-summer pulses.",
      "Late-season reports are elevated versus the 5-year median.",
      "Signal volatility is lower than last year, suggesting steadier reporting.",
    ],
    caveats: ["Seasonality reflects reported observations, not direct animal locations."],
    visuals: ["timeseries", "heatmap"],
    footer: DEFAULT_FOOTER,
  },
  hotspots: {
    whatItShows: "Repeatable clusters of high report density and how persistent they are week-to-week.",
    whyItMatters: "Persistent hotspots may indicate stable use areas or sustained observer activity.",
    takeaways: [
      "Core hotspot persistence remains strongest in the central corridor.",
      "Northern coastal cells cooled faster than last week.",
      "Emerging fringe activity appears south of the main cluster.",
    ],
    caveats: ["Hotspots can reflect observation effort rather than true distribution."],
    visuals: ["map", "timeseries"],
    footer: DEFAULT_FOOTER,
  },
  gap_analysis: {
    whatItShows: "Areas and weeks with low reporting coverage relative to historical baselines.",
    whyItMatters: "Highlights blind spots that can bias downstream modeling and interpretation.",
    takeaways: [
      "Coverage gaps persist in offshore zones.",
      "Weekend coverage improves near high-access marinas.",
      "Recent gaps likely tied to weather/sea-state disruptions.",
    ],
    caveats: ["Gaps may reflect missing effort data rather than absence of sightings."],
    visuals: ["heatmap", "map"],
    footer: DEFAULT_FOOTER,
  },
  lag_structure: {
    whatItShows: "How quickly reported sighting intensity decays after peaks and how long signals persist.",
    whyItMatters: "Long lags can indicate slow-moving dynamics or consistent reporting effort.",
    takeaways: [
      "Peak decay is slightly slower than the seasonal mean.",
      "Lag tails extend beyond two weeks in core regions.",
      "Short-lag spikes align with weekend reporting cycles.",
    ],
    caveats: ["Lag structure does not imply causality; it summarizes correlation over time."],
    visuals: ["lag", "timeseries"],
    footer: DEFAULT_FOOTER,
  },
  effort_proxy: {
    whatItShows: "Observer effort proxy surfaces and how they co-vary with reported sightings.",
    whyItMatters: "Separates observation intensity from potential ecological signals.",
    takeaways: [
      "Effort is elevated in harbors and near popular routes.",
      "High-effort zones overlap with strongest report clusters.",
      "Low-effort cells show muted signals even during peak season.",
    ],
    caveats: ["Effort proxies are partial and may miss informal reporting."],
    visuals: ["map", "heatmap"],
    footer: DEFAULT_FOOTER,
  },
  accessibility_bias: {
    whatItShows: "Accessibility weighting and how it shapes reported coverage.",
    whyItMatters: "Corrects for shoreline access disparities and reporting bias.",
    takeaways: [
      "Accessible shoreline dominates the reporting footprint.",
      "Remote zones remain under-sampled even in peak months.",
      "Adjusted weights soften urban skew.",
    ],
    caveats: ["Accessibility is a proxy; it cannot capture all observer behaviors."],
    visuals: ["map", "timeseries"],
    footer: DEFAULT_FOOTER,
  },
  calendar_effects: {
    whatItShows: "Weekly and holiday cycles in reporting intensity.",
    whyItMatters: "Calendar-driven spikes can masquerade as ecological shifts.",
    takeaways: [
      "Weekend uplift remains the strongest cyclical signal.",
      "Holiday weeks show a 1–2 day reporting lag.",
      "Midweek signals are increasingly stable.",
    ],
    caveats: ["Calendar effects are specific to reporter behavior, not animal movement."],
    visuals: ["timeseries", "heatmap"],
    footer: DEFAULT_FOOTER,
  },
  comovement: {
    whatItShows: "Co-movement between sightings and candidate drivers (correlation, not causation).",
    whyItMatters: "Highlights shared timing patterns that warrant deeper causal checks.",
    takeaways: [
      "Strong co-movement appears with coastal effort proxies.",
      "Environmental alignment is mixed and regional.",
      "Short-term co-movement is stronger than long-term alignment.",
    ],
    caveats: ["Co-movement does not confirm causal drivers."],
    visuals: ["timeseries", "lag"],
    footer: "Data used: reported sightings + proxy layers · Coverage: rolling 90 days · Freshness: weekly · Label: correlation only",
  },
  lag_detective: {
    whatItShows: "Lead/lag tests across signals to surface plausible delays.",
    whyItMatters: "Helps avoid misinterpreting same-week co-movement as influence.",
    takeaways: [
      "Potential 1–2 week lag with effort proxies.",
      "No stable lag detected with SST this cycle.",
      "Lag patterns vary by region and month.",
    ],
    caveats: ["Lag relationships are sensitive to sampling cadence."],
    visuals: ["lag", "timeseries"],
    footer: "Data used: reported sightings + proxy layers · Coverage: rolling 90 days · Freshness: weekly · Label: correlation only",
  },
  confounding_alerts: {
    whatItShows: "Confounding checks that flag overlapping covariates and bias risks.",
    whyItMatters: "Prevents over-attribution of signals to the wrong driver.",
    takeaways: [
      "Effort and holiday effects remain intertwined.",
      "Spatial accessibility overlaps with hotspot zones.",
      "Driver overlap is highest in urban corridors.",
    ],
    caveats: ["Alerts indicate correlation overlap, not a definitive confound."],
    visuals: ["heatmap", "timeseries"],
    footer: "Data used: reported sightings + proxy layers · Coverage: rolling 90 days · Freshness: weekly · Label: correlation only",
  },
  regional_relationship_map: {
    whatItShows: "Regional variation in co-movement between sightings and drivers.",
    whyItMatters: "Highlights where relationships differ across coastal zones.",
    takeaways: [
      "Northern zones show weaker co-movement this week.",
      "Central corridor remains the strongest alignment area.",
      "Southern regions show mixed correlation signals.",
    ],
    caveats: ["Regional signals depend on reporting density."],
    visuals: ["map", "heatmap"],
    footer: "Data used: reported sightings + proxy layers · Coverage: rolling 90 days · Freshness: weekly · Label: correlation only",
  },
};

export const getAnalysisDetailContent = (item: AnalysisItem | undefined): AnalysisDetailContent | null => {
  if (!item) {
    return null;
  }

  return ANALYSIS_DETAIL_CONTENT[item.id] ?? null;
};
