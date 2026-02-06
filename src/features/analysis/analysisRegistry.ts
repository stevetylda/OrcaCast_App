export type AnalysisTabId =
  | "overview"
  | "sightings"
  | "humans"
  | "environment"
  | "prey"
  | "relationships";

export type AnalysisItemStatus = "ready" | "coming_soon";

export type AnalysisItem = {
  id: string;
  tab: Exclude<AnalysisTabId, "overview">;
  title: string;
  subtitle?: string;
  lensTag?: "signal" | "bias" | "proxy" | "relationship";
  coverage?: "high" | "medium" | "low";
  status?: AnalysisItemStatus;
};

export type AnalysisTab = {
  id: AnalysisTabId;
  label: string;
  description?: string;
};

export const ANALYSIS_TABS: AnalysisTab[] = [
  {
    id: "overview",
    label: "At a Glance",
    description: "Synthesis landing and weekly signals",
  },
  {
    id: "sightings",
    label: "Sightings",
    description: "Reported observations, gaps, and temporal structure",
  },
  {
    id: "humans",
    label: "Humans",
    description: "Observer patterns, access, and reporting bias",
  },
  {
    id: "environment",
    label: "Environmental Drivers",
    description: "Ocean-state proxies and covariates",
  },
  {
    id: "prey",
    label: "Prey",
    description: "Prey timing and proxy indicators",
  },
  {
    id: "relationships",
    label: "Relationships",
    description: "Cross-folder correlation diagnostics",
  },
];

export const ANALYSIS_ITEMS: AnalysisItem[] = [
  {
    id: "seasonality",
    tab: "sightings",
    title: "Seasonality",
    subtitle: "Week-of-year structure and expected baselines",
    lensTag: "signal",
    coverage: "high",
    status: "ready",
  },
  {
    id: "hotspots",
    tab: "sightings",
    title: "Hotspot Persistence",
    subtitle: "Where repeated reports cluster week-to-week",
    lensTag: "signal",
    coverage: "high",
    status: "ready",
  },
  {
    id: "gap_analysis",
    tab: "sightings",
    title: "Coverage Gaps",
    subtitle: "Where reports are sparse or missing",
    lensTag: "bias",
    coverage: "medium",
    status: "ready",
  },
  {
    id: "lag_structure",
    tab: "sightings",
    title: "Lag Structure",
    subtitle: "How reported signals persist or decay",
    lensTag: "signal",
    coverage: "medium",
    status: "ready",
  },
  {
    id: "regime_shifts",
    tab: "sightings",
    title: "Regime Shifts",
    subtitle: "Multi-year shifts in reporting dynamics",
    lensTag: "signal",
    coverage: "low",
    status: "coming_soon",
  },
  {
    id: "effort_proxy",
    tab: "humans",
    title: "Effort Proxy",
    subtitle: "Observer intensity, vessel density, and effort",
    lensTag: "bias",
    coverage: "high",
    status: "ready",
  },
  {
    id: "accessibility_bias",
    tab: "humans",
    title: "Accessibility Bias",
    subtitle: "Ease-of-access weighting across coastline",
    lensTag: "bias",
    coverage: "medium",
    status: "ready",
  },
  {
    id: "calendar_effects",
    tab: "humans",
    title: "Calendar Effects",
    subtitle: "Weekend/holiday timing and reporting cycles",
    lensTag: "bias",
    coverage: "medium",
    status: "ready",
  },
  {
    id: "source_bias",
    tab: "humans",
    title: "Source Bias",
    subtitle: "Differences across reporter types",
    lensTag: "bias",
    coverage: "low",
    status: "coming_soon",
  },
  {
    id: "sst_anomalies",
    tab: "environment",
    title: "SST Anomalies",
    subtitle: "Sea-surface temperature departures",
    lensTag: "proxy",
    coverage: "low",
    status: "coming_soon",
  },
  {
    id: "upwelling_winds",
    tab: "environment",
    title: "Upwelling Winds",
    subtitle: "Wind stress proxy for productivity",
    lensTag: "proxy",
    coverage: "low",
    status: "coming_soon",
  },
  {
    id: "salinity_discharge",
    tab: "environment",
    title: "Salinity & Discharge",
    subtitle: "Freshwater discharge and plume signals",
    lensTag: "proxy",
    coverage: "low",
    status: "coming_soon",
  },
  {
    id: "marine_heatwave",
    tab: "environment",
    title: "Marine Heatwave",
    subtitle: "Persistent thermal anomalies",
    lensTag: "proxy",
    coverage: "low",
    status: "coming_soon",
  },
  {
    id: "chinook_timing",
    tab: "prey",
    title: "Chinook Timing",
    subtitle: "Run timing vs reported sightings",
    lensTag: "proxy",
    coverage: "low",
    status: "coming_soon",
  },
  {
    id: "fishery_proxy",
    tab: "prey",
    title: "Fishery Proxy",
    subtitle: "Fleet signals as prey access indicator",
    lensTag: "proxy",
    coverage: "low",
    status: "coming_soon",
  },
  {
    id: "seabird_proxy",
    tab: "prey",
    title: "Seabird Proxy",
    subtitle: "Surface feeding as prey indicator",
    lensTag: "proxy",
    coverage: "low",
    status: "coming_soon",
  },
  {
    id: "comovement",
    tab: "relationships",
    title: "Co-movement Explorer",
    subtitle: "Shared rise/fall timing across signals",
    lensTag: "signal",
    coverage: "medium",
    status: "ready",
  },
  {
    id: "lag_detective",
    tab: "relationships",
    title: "Lag Detective",
    subtitle: "Lead/lag diagnostics across drivers",
    lensTag: "relationship",
    coverage: "medium",
    status: "ready",
  },
  {
    id: "confounding_alerts",
    tab: "relationships",
    title: "Confounding Alerts",
    subtitle: "Correlation checks and bias flags",
    lensTag: "relationship",
    coverage: "medium",
    status: "ready",
  },
  {
    id: "regional_relationship_map",
    tab: "relationships",
    title: "Regional Relationship Map",
    subtitle: "Spatially varying co-movement",
    lensTag: "relationship",
    coverage: "medium",
    status: "ready",
  },
];

export const ANALYSIS_TAB_LABELS = ANALYSIS_TABS.reduce<Record<AnalysisTabId, string>>(
  (acc, tab) => {
    acc[tab.id] = tab.label;
    return acc;
  },
  {
    overview: "Overview",
    sightings: "Sightings",
    humans: "Humans",
    environment: "Environmental Drivers",
    prey: "Prey",
    relationships: "Relationships",
  }
);
