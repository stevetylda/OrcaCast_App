import type { Feature, FeatureCollection, MultiPolygon, Point, Polygon } from "geojson";

export type ViewabilityScoreType = "base" | "dynamic";

export type ViewabilityMapMode = "overview" | "source-inspector";

export type SourceCellType = "land" | "water" | "mixed";

export type ViewabilityTargetProperties = {
  h3: string;
  base_viewability_score?: number;
  dynamic_viewability_score?: number;
};

export type ViewabilitySourceProperties = {
  h3: string;
  source_type?: SourceCellType;
  source_viewyness_score?: number;
  reachable_target_count?: number;
  mean_target_weight?: number;
  max_target_weight?: number;
  effective_view_radius_km?: number;
};

export type SourceTargetVisibilityProperties = {
  source_h3: string;
  target_h3: string;
  source_target_weight?: number;
  distance_km?: number;
  weight_distance?: number;
  weight_terrain?: number;
  weight_vegetation?: number;
};

export type ViewabilityTargetFeature = Feature<Polygon | MultiPolygon, ViewabilityTargetProperties>;
export type ViewabilitySourceFeature = Feature<Polygon | MultiPolygon | Point, ViewabilitySourceProperties>;

export type ViewabilityTargetFeatureCollection = FeatureCollection<
  Polygon | MultiPolygon,
  ViewabilityTargetProperties
>;

export type ViewabilitySourceFeatureCollection = FeatureCollection<
  Polygon | MultiPolygon | Point,
  ViewabilitySourceProperties
>;

export type SourceTargetVisibilityRecord = SourceTargetVisibilityProperties;

export type SourceCellConditions = {
  source_h3: string;
  selected_period: string;
  weather_score?: number;
  daylight_score?: number;
  lunar_phase?: string;
  moon_illumination?: number;
  dynamic_modifier?: number;
};

export type SourceCellTimeSeriesPoint = {
  period: string;
  dynamic_viewability?: number;
  sighting_count?: number;
};

export type ViewabilitySightingsBin = {
  bin_label: string;
  min_dynamic_viewability: number;
  max_dynamic_viewability: number;
  sighting_count?: number;
  sighting_rate?: number;
  cell_period_observations?: number;
};

export type ViewabilityColorScaleSettings = {
  paletteId: "orcacast_classic" | "amethyst" | "cividis_safe";
  normalizeValues: boolean;
  reversePalette: boolean;
};
