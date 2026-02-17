export type DataLineageLane = "inputs" | "processing" | "outputs";

export type DataLineageCategory =
  | "basemap"
  | "observations"
  | "processing"
  | "output";

export type DataLineageNodeKind = "provider" | "processing" | "output";

export type DataLineageLink = {
  label: string;
  url: string;
};

export type DataLineageNodeMeta = {
  id: string;
  label: string;
  lane: DataLineageLane;
  category: DataLineageCategory;
  kind: DataLineageNodeKind;
  pipeline?:
    | "sightings"
    | "water"
    | "bathymetry"
    | "ocean_state"
    | "prey_availability"
    | "disturbance"
    | "shared";
  status?: "included" | "planned";
  description: string;
  cadence?: string;
  coverage?: string;
  access?: string;
  url?: string;
  attributionLinks?: DataLineageLink[];
  inputs?: string[];
  outputs?: string[];
};

export type DataLineageEdge = {
  id: string;
  source: string;
  target: string;
};

export type BasemapAcknowledgement = {
  id: string;
  label: string;
  role: string;
  cadence: string;
  coverage: string;
  access: string;
  description: string;
  url: string;
  attributionLinks: DataLineageLink[];
};

export const modelLineageNodes: DataLineageNodeMeta[] = [
  {
    id: "acartia",
    label: "Acartia",
    lane: "inputs",
    category: "observations",
    kind: "provider",
    pipeline: "sightings",
    status: "included",
    description:
      "Regional whale observation reports submitted by field teams and trusted partners, used as one of the primary observed-sightings feeds into OrcaCast. Records from this source are normalized with other providers before weekly spatial aggregation.",
    cadence: "Weekly / monthly",
    coverage: "Pacific Northwest",
    access: "Partner dataset",
    url: "https://acartia.io/home",
    attributionLinks: [
      {
        label: "Acartia",
        url: "https://acartia.io/home",
      },
    ],
  },
  {
    id: "whalemuseum",
    label: "The Whale Museum",
    lane: "inputs",
    category: "observations",
    kind: "provider",
    pipeline: "sightings",
    status: "included",
    description:
      "Community- and stewardship-led whale sightings that broaden nearshore and volunteer-observed coverage in the Salish Sea. These reports are harmonized with other observation partners to build a single weekly sightings signal.",
    cadence: "Weekly / monthly",
    coverage: "Salish Sea",
    access: "Partner dataset",
    url: "https://www.whalemuseum.org/",
    attributionLinks: [
      {
        label: "The Whale Museum",
        url: "https://www.whalemuseum.org/",
      },
    ],
  },
  {
    id: "inaturalist",
    label: "iNaturalist",
    lane: "inputs",
    category: "observations",
    kind: "provider",
    pipeline: "sightings",
    status: "included",
    description:
      "Public biodiversity observation stream used to supplement direct partner reports with additional temporal and geographic context. iNaturalist entries are deduplicated and time-aligned before they contribute to model-ready sighting counts.",
    cadence: "Rolling",
    coverage: "Global",
    access: "Public platform API",
    url: "https://www.inaturalist.org/",
    attributionLinks: [
      {
        label: "iNaturalist",
        url: "https://www.inaturalist.org/",
      },
    ],
  },
  {
    id: "coastline_boundaries",
    label: "Coastline boundaries",
    lane: "inputs",
    category: "observations",
    kind: "provider",
    pipeline: "water",
    status: "included",
    description:
      "Regional coastline and shoreline boundary polygons used to define where marine forecasts are valid. These boundaries are merged with hydrographic layers to prevent terrestrial cells from being treated as forecast water domain.",
    cadence: "Periodic refresh",
    coverage: "Pacific Northwest",
    access: "Public / partner geodata",
  },
  {
    id: "hydro_polygons",
    label: "Hydro polygons",
    lane: "inputs",
    category: "observations",
    kind: "provider",
    pipeline: "water",
    status: "included",
    description:
      "Hydrographic polygon layers describing inland and coastal waterbodies that help establish the model's valid water mask. They are topologically harmonized with coastline boundaries before projection into H3 cells.",
    cadence: "Periodic refresh",
    coverage: "Pacific Northwest",
    access: "Public geodata",
  },
  {
    id: "gebco_10m",
    label: "GEBCO 10M",
    lane: "inputs",
    category: "observations",
    kind: "provider",
    pipeline: "bathymetry",
    status: "planned",
    description:
      "Global bathymetry raster at 10-minute resolution, planned as the depth baseline for terrain-aware marine features. The raster is intended to support derived depth, slope, and shelf-context covariates for each modeled cell.",
    cadence: "Annual / periodic release",
    coverage: "Global",
    access: "Public geodata",
    url: "https://www.gebco.net/data_and_products/gridded_bathymetry_data/",
    attributionLinks: [
      {
        label: "GEBCO Gridded Bathymetry",
        url: "https://www.gebco.net/data_and_products/gridded_bathymetry_data/",
      },
    ],
  },
  {
    id: "normalize_dedupe",
    label: "Normalize & dedupe",
    lane: "processing",
    category: "processing",
    kind: "processing",
    pipeline: "sightings",
    description:
      "Standardizes schema across raw sightings feeds, aligns timestamps to a common temporal convention, and removes duplicate or overlapping reports. This step is critical for temporal integrity before observations are spatially indexed.",
    inputs: ["acartia", "whalemuseum", "inaturalist"],
    outputs: ["spatial_index_h3"],
  },
  {
    id: "spatial_index_h3",
    label: "Spatial index (H3)",
    lane: "processing",
    category: "processing",
    kind: "processing",
    pipeline: "sightings",
    description:
      "Assigns each cleaned sighting to a consistent H3 spatial index so all sources share the same analysis unit. This allows weekly aggregation and downstream feature generation without coordinate-system drift across providers.",
    inputs: ["normalize_dedupe"],
    outputs: ["aggregation_weekly"],
  },
  {
    id: "water_polygon_harmonize",
    label: "Harmonize water polygons",
    lane: "processing",
    category: "processing",
    kind: "processing",
    pipeline: "water",
    description:
      "Normalizes coordinate reference systems and polygon topology across hydrographic inputs, then merges and repairs overlaps/gaps. The result is a stable, unified water geometry layer suitable for raster-to-hex masking.",
    inputs: ["coastline_boundaries", "hydro_polygons"],
    outputs: ["water_h3_mask"],
  },
  {
    id: "water_h3_mask",
    label: "Water mask (H3)",
    lane: "processing",
    category: "processing",
    kind: "processing",
    pipeline: "water",
    description:
      "Projects harmonized water polygons into H3 space to produce a binary/weighted mask of cells considered valid marine domain. This mask gates feature engineering and forecast output to water-relevant cells only.",
    inputs: ["water_polygon_harmonize"],
    outputs: ["feature_engineering"],
  },
  {
    id: "bathymetry_features",
    label: "Bathymetry features",
    lane: "processing",
    category: "processing",
    kind: "processing",
    pipeline: "bathymetry",
    status: "planned",
    description:
      "Planned depth-feature pipeline that converts GEBCO bathymetry into model covariates such as depth bands, gradients, and nearshore shelf context. These covariates are intended to condition forecasts by persistent habitat structure.",
    inputs: ["gebco_10m"],
    outputs: ["feature_engineering"],
  },
  {
    id: "sst_anomalies",
    label: "SST + anomalies",
    lane: "inputs",
    category: "observations",
    kind: "provider",
    pipeline: "ocean_state",
    status: "planned",
    description:
      "Sea-surface temperature fields and anomaly products intended to capture short-term thermal departures from expected conditions. These signals are planned inputs for ocean-state features that influence weekly habitat suitability context.",
    cadence: "Daily / weekly composites",
    coverage: "Regional ocean domains",
    access: "Planned ingestion",
  },
  {
    id: "chlorophyll_proxy",
    label: "Chlorophyll proxy",
    lane: "inputs",
    category: "observations",
    kind: "provider",
    pipeline: "ocean_state",
    status: "planned",
    description:
      "Chlorophyll concentration products used as a planned proxy for marine productivity and food-web conditions. Intended to provide spatially and temporally varying ecosystem context in ocean-state feature blocks.",
    cadence: "Daily / weekly composites",
    coverage: "Regional ocean domains",
    access: "Planned ingestion",
  },
  {
    id: "salinity",
    label: "Salinity",
    lane: "inputs",
    category: "observations",
    kind: "provider",
    pipeline: "ocean_state",
    status: "planned",
    description:
      "Sea-surface salinity fields planned to represent freshwater influence, mixing regimes, and broad hydrographic state. These data are expected to be transformed into weekly salinity-derived features by cell.",
    cadence: "Daily / weekly composites",
    coverage: "Regional ocean domains",
    access: "Planned ingestion",
  },
  {
    id: "currents_surface",
    label: "Currents (surface)",
    lane: "inputs",
    category: "observations",
    kind: "provider",
    pipeline: "ocean_state",
    status: "planned",
    description:
      "Surface current magnitude and direction products planned to represent advection and transport conditions. These variables are intended to support movement-context features at weekly forecast cadence.",
    cadence: "Daily composites",
    coverage: "Regional ocean domains",
    access: "Planned ingestion",
  },
  {
    id: "upwelling_wind_stress",
    label: "Upwelling / wind stress",
    lane: "inputs",
    category: "observations",
    kind: "provider",
    pipeline: "ocean_state",
    status: "planned",
    description:
      "Upwelling index and wind-stress indicators planned to represent coastal nutrient forcing and mixing conditions. These signals provide broader productivity context for ocean-state conditioning.",
    cadence: "Daily / weekly",
    coverage: "Regional ocean domains",
    access: "Planned ingestion",
  },
  {
    id: "marine_heatwave_indicators",
    label: "Marine heatwave indicators",
    lane: "inputs",
    category: "observations",
    kind: "provider",
    pipeline: "ocean_state",
    status: "planned",
    description:
      "Marine heatwave indicators and episode flags intended to represent prolonged thermal stress periods. Planned use is to modulate forecast context during anomalous ecosystem-state events.",
    cadence: "Daily / weekly",
    coverage: "Regional ocean domains",
    access: "Planned ingestion",
  },
  {
    id: "surface_weather",
    label: "Surface weather",
    lane: "inputs",
    category: "observations",
    kind: "provider",
    pipeline: "ocean_state",
    status: "planned",
    description:
      "Near-surface weather drivers (including wind and pressure aggregates) planned as environmental forcing covariates. These features are intended to capture short-term atmospheric conditions relevant to observed activity patterns.",
    cadence: "Hourly / daily aggregates",
    coverage: "Regional ocean domains",
    access: "Planned ingestion",
  },
  {
    id: "tides",
    label: "Tides",
    lane: "inputs",
    category: "observations",
    kind: "provider",
    pipeline: "ocean_state",
    status: "planned",
    description:
      "Tidal phase, range, and related summaries planned to characterize nearshore accessibility and movement windows. These temporal signals will be synchronized to forecast bins for consistent use in modeling.",
    cadence: "Hourly / daily aggregates",
    coverage: "Regional coastal domains",
    access: "Planned ingestion",
  },
  {
    id: "ocean_state_features",
    label: "Ocean state features",
    lane: "processing",
    category: "processing",
    kind: "processing",
    pipeline: "ocean_state",
    status: "planned",
    description:
      "Planned harmonization pipeline for ocean-state inputs, including temporal binning, spatial alignment, and variable transforms. Output is a coherent ocean covariate set designed for direct use in feature engineering.",
    inputs: [
      "sst_anomalies",
      "chlorophyll_proxy",
      "salinity",
      "currents_surface",
      "upwelling_wind_stress",
      "marine_heatwave_indicators",
      "surface_weather",
      "tides",
    ],
    outputs: ["feature_engineering"],
  },
  {
    id: "chinook_run_timing_proxies",
    label: "Chinook run timing proxies",
    lane: "inputs",
    category: "observations",
    kind: "provider",
    pipeline: "prey_availability",
    status: "planned",
    description:
      "Seasonal regional priors for Chinook timing planned to represent expected prey availability windows. These priors are intended to encode known run-timing structure where direct prey observations are sparse.",
    cadence: "Seasonal / annual",
    coverage: "Regional watersheds/coasts",
    access: "Planned ingestion",
  },
  {
    id: "catch_cards_creel_signals",
    label: "Catch cards / creel signals",
    lane: "inputs",
    category: "observations",
    kind: "provider",
    pipeline: "prey_availability",
    status: "planned",
    description:
      "Fishing catch-card and creel-derived indicators, where available, planned as indirect prey-abundance/availability signals. These data can provide operational temporal cues tied to fish presence and effort.",
    cadence: "Weekly / seasonal",
    coverage: "Region dependent",
    access: "Planned ingestion",
  },
  {
    id: "river_discharge_proxies",
    label: "River discharge proxies",
    lane: "inputs",
    category: "observations",
    kind: "provider",
    pipeline: "prey_availability",
    status: "planned",
    description:
      "River discharge-based proxies planned to represent watershed inflow, plume behavior, and run-timing cues related to prey dynamics. These time-varying indicators are intended to complement seasonal prey priors.",
    cadence: "Daily / weekly",
    coverage: "Regional watersheds/coasts",
    access: "Planned ingestion",
  },
  {
    id: "fishery_opening_closure_calendar",
    label: "Fishery opening/closure calendar",
    lane: "inputs",
    category: "observations",
    kind: "provider",
    pipeline: "prey_availability",
    status: "planned",
    description:
      "Fishery opening/closure calendar features planned to encode management-driven seasonal structure and human-prey interaction timing. Intended as interpretable categorical context in prey-availability modeling.",
    cadence: "Seasonal / annual",
    coverage: "Region dependent",
    access: "Planned ingestion",
  },
  {
    id: "prey_availability_features",
    label: "Prey availability features",
    lane: "processing",
    category: "processing",
    kind: "processing",
    pipeline: "prey_availability",
    status: "planned",
    description:
      "Planned integration and transformation stage for prey-related proxies, combining seasonal, hydrologic, and operational cues into standardized features. Output is a regionalized prey-context block used by shared feature engineering.",
    inputs: [
      "chinook_run_timing_proxies",
      "catch_cards_creel_signals",
      "river_discharge_proxies",
      "fishery_opening_closure_calendar",
    ],
    outputs: ["feature_engineering"],
  },
  {
    id: "ais",
    label: "AIS",
    lane: "inputs",
    category: "observations",
    kind: "provider",
    pipeline: "disturbance",
    status: "planned",
    description:
      "Automatic Identification System vessel traffic feed planned to quantify marine traffic intensity and movement corridors. Intended use is disturbance-context feature generation at weekly spatial resolution.",
    cadence: "Near real-time / daily aggregates",
    coverage: "Region dependent",
    access: "Planned ingestion",
  },
  {
    id: "population_proxy",
    label: "Population",
    lane: "inputs",
    category: "observations",
    kind: "provider",
    pipeline: "disturbance",
    status: "planned",
    description:
      "Population density proxy planned to represent background human presence and likely observation effort gradients across the forecast domain. Used as one component in composite human-effort signals.",
    cadence: "Annual / periodic refresh",
    coverage: "Regional / global",
    access: "Planned ingestion",
  },
  {
    id: "points_of_interest",
    label: "Points of Interest",
    lane: "inputs",
    category: "observations",
    kind: "provider",
    pipeline: "disturbance",
    status: "planned",
    description:
      "Points-of-interest density and access-hub indicators planned as proxies for where human visitation and observation effort are likely concentrated. These spatial features complement AIS and population-based effort signals.",
    cadence: "Periodic refresh",
    coverage: "Regional / global",
    access: "Planned ingestion",
  },
  {
    id: "google_trends",
    label: "Google Trends",
    lane: "inputs",
    category: "observations",
    kind: "provider",
    pipeline: "disturbance",
    status: "planned",
    description:
      "Google Trends search-intent indicators planned as supplemental temporal proxies for public interest and potential effort fluctuations. Intended to capture broad demand-side seasonality not visible in geospatial feeds.",
    cadence: "Weekly",
    coverage: "Region dependent",
    access: "Planned ingestion",
  },
  {
    id: "effort_proxy",
    label: "Effort Proxy",
    lane: "processing",
    category: "processing",
    kind: "processing",
    pipeline: "disturbance",
    status: "planned",
    description:
      "Planned fusion stage that combines population, POI, trend, and vessel-traffic inputs into a composite effort index. Output is designed to provide a stable human-activity prior for downstream feature engineering.",
    inputs: ["population_proxy", "points_of_interest", "google_trends", "ais"],
    outputs: ["feature_engineering"],
  },
  {
    id: "disturbance_features",
    label: "Human activity features",
    lane: "processing",
    category: "processing",
    kind: "processing",
    pipeline: "disturbance",
    status: "planned",
    description:
      "Planned derivation of explicit human-activity covariates from AIS intensity, routes, and related traffic context. These features are intended to capture disturbance and overlap dynamics in modeled regions.",
    inputs: ["ais"],
    outputs: ["feature_engineering"],
  },
  {
    id: "feature_engineering",
    label: "Feature Engineering",
    lane: "processing",
    category: "processing",
    kind: "processing",
    pipeline: "shared",
    description:
      "Combines outputs from all active pipelines into aligned temporal and spatial feature matrices consumed by model inference. This stage enforces consistent feature schema, binning, and masking across included and planned inputs.",
    inputs: [
      "aggregation_weekly",
      "water_h3_mask",
      "bathymetry_features",
      "ocean_state_features",
      "prey_availability_features",
      "effort_proxy",
      "disturbance_features",
    ],
    outputs: ["model_inference"],
  },
  {
    id: "model_inference",
    label: "Model Inference",
    lane: "processing",
    category: "processing",
    kind: "processing",
    pipeline: "shared",
    description:
      "Executes the trained OrcaCast inference workflow on engineered features to produce raw probabilistic scores for each modeled cell and period. This is the core prediction step prior to any post-processing calibration.",
    inputs: ["feature_engineering"],
    outputs: ["calibration"],
  },
  {
    id: "calibration",
    label: "Calibration",
    lane: "processing",
    category: "processing",
    kind: "processing",
    pipeline: "shared",
    description:
      "Applies post-inference calibration, scaling, and consistency adjustments so scores remain comparable across forecast cycles. This step prepares raw model outputs for map-facing forecast consumption.",
    inputs: ["model_inference"],
    outputs: ["forecast_layers"],
  },
  {
    id: "aggregation_weekly",
    label: "Aggregation (weekly)",
    lane: "processing",
    category: "processing",
    kind: "processing",
    pipeline: "sightings",
    description:
      "Aggregates H3-indexed sightings into weekly bins to produce both observed-history map layers and temporal model features. This creates the primary historical signal used in current production workflows.",
    inputs: ["spatial_index_h3"],
    outputs: ["observed_layers", "feature_engineering"],
  },
  {
    id: "observed_layers",
    label: "Observed layers",
    lane: "outputs",
    category: "output",
    kind: "output",
    pipeline: "sightings",
    description:
      "Observed weekly sighting layers rendered in-app as historical and recent context alongside forecasts. These layers reflect aggregated report activity rather than confirmed absolute presence.",
    cadence: "Weekly refresh",
    coverage: "PNW focused",
    access: "In-app",
  },
  {
    id: "forecast_layers",
    label: "Forecast layers",
    lane: "outputs",
    category: "output",
    kind: "output",
    pipeline: "shared",
    description:
      "Forecast probability layers generated from engineered features, model inference, and calibration stages. These are the map-facing predictive outputs refreshed on the production weekly cadence.",
    cadence: "Weekly refresh",
    coverage: "PNW focused",
    access: "In-app",
  },
];

export const modelLineageEdges: DataLineageEdge[] = [
  { id: "e-acartia-normalize", source: "acartia", target: "normalize_dedupe" },
  { id: "e-whalemuseum-normalize", source: "whalemuseum", target: "normalize_dedupe" },
  { id: "e-inaturalist-normalize", source: "inaturalist", target: "normalize_dedupe" },
  { id: "e-coastline-waterharm", source: "coastline_boundaries", target: "water_polygon_harmonize" },
  { id: "e-hydropolygons-waterharm", source: "hydro_polygons", target: "water_polygon_harmonize" },
  { id: "e-gebco-bathyfeatures", source: "gebco_10m", target: "bathymetry_features" },
  { id: "e-normalize-h3", source: "normalize_dedupe", target: "spatial_index_h3" },
  { id: "e-h3-weekly", source: "spatial_index_h3", target: "aggregation_weekly" },
  { id: "e-waterharm-h3mask", source: "water_polygon_harmonize", target: "water_h3_mask" },
  { id: "e-bathyfeatures-featureeng", source: "bathymetry_features", target: "feature_engineering" },
  { id: "e-sst-oceanstate", source: "sst_anomalies", target: "ocean_state_features" },
  { id: "e-chl-oceanstate", source: "chlorophyll_proxy", target: "ocean_state_features" },
  { id: "e-salinity-oceanstate", source: "salinity", target: "ocean_state_features" },
  { id: "e-currents-oceanstate", source: "currents_surface", target: "ocean_state_features" },
  { id: "e-upwelling-oceanstate", source: "upwelling_wind_stress", target: "ocean_state_features" },
  {
    id: "e-heatwave-oceanstate",
    source: "marine_heatwave_indicators",
    target: "ocean_state_features",
  },
  { id: "e-weather-oceanstate", source: "surface_weather", target: "ocean_state_features" },
  { id: "e-tides-oceanstate", source: "tides", target: "ocean_state_features" },
  { id: "e-oceanstate-featureeng", source: "ocean_state_features", target: "feature_engineering" },
  {
    id: "e-chinook-preyfeatures",
    source: "chinook_run_timing_proxies",
    target: "prey_availability_features",
  },
  {
    id: "e-catchcards-preyfeatures",
    source: "catch_cards_creel_signals",
    target: "prey_availability_features",
  },
  {
    id: "e-discharge-preyfeatures",
    source: "river_discharge_proxies",
    target: "prey_availability_features",
  },
  {
    id: "e-fisherycalendar-preyfeatures",
    source: "fishery_opening_closure_calendar",
    target: "prey_availability_features",
  },
  { id: "e-preyfeatures-featureeng", source: "prey_availability_features", target: "feature_engineering" },
  { id: "e-population-effortproxy", source: "population_proxy", target: "effort_proxy" },
  { id: "e-poi-effortproxy", source: "points_of_interest", target: "effort_proxy" },
  { id: "e-trends-effortproxy", source: "google_trends", target: "effort_proxy" },
  { id: "e-ais-effortproxy", source: "ais", target: "effort_proxy" },
  { id: "e-effortproxy-featureeng", source: "effort_proxy", target: "feature_engineering" },
  { id: "e-ais-disturbancefeatures", source: "ais", target: "disturbance_features" },
  { id: "e-disturbance-featureeng", source: "disturbance_features", target: "feature_engineering" },
  { id: "e-weekly-observed", source: "aggregation_weekly", target: "observed_layers" },
  { id: "e-h3mask-featureeng", source: "water_h3_mask", target: "feature_engineering" },
  { id: "e-weekly-featureeng", source: "aggregation_weekly", target: "feature_engineering" },
  { id: "e-featureeng-inference", source: "feature_engineering", target: "model_inference" },
  { id: "e-inference-calibration", source: "model_inference", target: "calibration" },
  { id: "e-calibration-forecast", source: "calibration", target: "forecast_layers" },
];

export const basemapAcknowledgements: BasemapAcknowledgement[] = [
  {
    id: "osm",
    label: "OpenStreetMap",
    role: "Basemap foundation",
    cadence: "Rolling",
    coverage: "Global",
    access: "Open",
    description:
      "Community-maintained geospatial foundation for roads, coastlines, and place context.",
    url: "https://www.openstreetmap.org/copyright",
    attributionLinks: [
      {
        label: "OpenStreetMap attribution",
        url: "https://www.openstreetmap.org/copyright",
      },
    ],
  },
  {
    id: "openmaptiles",
    label: "OpenMapTiles",
    role: "Vector tile schema",
    cadence: "Provider-defined",
    coverage: "Global",
    access: "Licensed / Open components",
    description:
      "Vector basemap schema and tile processing stack used to standardize cartographic layers.",
    url: "https://openmaptiles.org/",
    attributionLinks: [
      {
        label: "OpenMapTiles",
        url: "https://openmaptiles.org/",
      },
    ],
  },
  {
    id: "stadiamaps",
    label: "Stadia Maps",
    role: "Tile hosting",
    cadence: "Provider-defined",
    coverage: "Global",
    access: "Hosted service",
    description:
      "Hosted map tiles and style infrastructure for basemap delivery in the client app.",
    url: "https://stadiamaps.com/",
    attributionLinks: [
      {
        label: "Stadia Maps",
        url: "https://stadiamaps.com/",
      },
    ],
  },
];

export const modelLineageNodeById = new Map(modelLineageNodes.map((node) => [node.id, node]));

export function getLineageNodeById(nodeId: string): DataLineageNodeMeta | undefined {
  return modelLineageNodeById.get(nodeId);
}

export function getNodeLabel(nodeId: string): string {
  return modelLineageNodeById.get(nodeId)?.label ?? nodeId;
}
