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
      "Regional whale observation reports contributing sighting records for model inputs.",
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
      "Community and stewardship-led whale sighting reports used in OrcaCast observations.",
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
      "Public biodiversity observations that provide additional sightings and temporal context.",
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
      "Regional coastline boundary polygons used to constrain marine forecast domain geometry.",
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
      "Waterbody polygon layers used to define inland and coastal water extents for modeling.",
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
      "Global bathymetry raster (10-minute grid) used to derive planned depth-informed marine features.",
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
      "Normalize source fields, align timestamps, and remove duplicate reports before modeling.",
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
      "Map cleaned observations into H3 cells to create a consistent spatial unit across sources.",
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
      "Align polygon CRS/topology, merge multiple hydro sources, and resolve overlaps/gaps.",
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
      "Project harmonized polygons onto H3 cells to create a marine-domain mask for forecasts.",
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
      "Planned derivation of depth-informed features from GEBCO 10M for forecast conditioning.",
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
      "Sea surface temperature and anomaly fields for planned ocean-state feature engineering.",
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
      "Productivity proxy layers from chlorophyll concentration for planned habitat context signals.",
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
    description: "Sea-surface salinity fields for planned environmental-state features.",
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
      "Surface velocity magnitude/direction fields for planned transport and movement context.",
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
    description: "Upwelling index and wind stress signals for planned coastal productivity context.",
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
    description: "Thermal anomaly episode indicators for planned ecosystem-state conditioning.",
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
      "Near-surface weather drivers (e.g., wind, pressure) for planned environmental covariates.",
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
    description: "Tidal phase/range signals for planned nearshore movement and accessibility context.",
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
      "Planned harmonization and feature derivation from ocean-state variables for forecast conditioning.",
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
    description: "Seasonal priors by region for planned prey-availability timing context.",
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
    description: "Where available, fishing effort/catch signals for planned prey indicator context.",
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
      "Discharge-derived proxies for run timing and plume dynamics in planned prey availability features.",
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
    description: "Calendar-based human/prey indicator planned for seasonal context features.",
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
      "Planned integration of prey proxies into forecast-ready seasonal and regional feature signals.",
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
    description: "Automatic Identification System vessel traffic signal for planned disturbance features.",
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
      "Population density proxy for planned human-effort signal derivation across forecast regions.",
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
      "POI density and access hubs as planned proxies for human observation and activity effort.",
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
      "Search-intent signals planned as a supplementary proxy for temporal human effort interest.",
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
      "Planned fusion of population, POI, trends, and AIS signals into a composite human effort proxy.",
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
      "Planned derivation of human-activity indicators from AIS and related traffic intensity context.",
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
      "Combines pipeline features into model-ready tensors and temporal/spatial feature blocks.",
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
    description: "Runs trained OrcaCast model inference to generate raw probabilistic outputs.",
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
      "Applies post-processing calibration and scaling to produce stable, comparable forecast scores.",
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
      "Aggregate indexed sightings by week to generate observed signals and forecasting features.",
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
      "Observed sighting layers rendered in the map interface as historical/near-recent context.",
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
      "Forecast probability layers generated from weekly aggregation and model pipelines.",
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
