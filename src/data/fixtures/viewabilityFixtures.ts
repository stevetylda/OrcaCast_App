import type {
  SourceCellConditions,
  SourceCellTimeSeriesPoint,
  SourceTargetVisibilityRecord,
  ViewabilitySightingsBin,
  ViewabilitySourceFeatureCollection,
  ViewabilityTargetFeatureCollection,
} from "../viewabilityTypes";

export const viewabilityTargetCellsFixture: ViewabilityTargetFeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        h3: "target-48-122-a",
        base_viewability_score: 0.64,
        dynamic_viewability_score: 0.61,
      },
      geometry: { type: "Polygon", coordinates: [[[-123.38, 48.42], [-123.25, 48.42], [-123.22, 48.5], [-123.32, 48.57], [-123.43, 48.51], [-123.38, 48.42]]] },
    },
    {
      type: "Feature",
      properties: {
        h3: "target-48-122-b",
        base_viewability_score: 0.78,
        dynamic_viewability_score: 0.74,
      },
      geometry: { type: "Polygon", coordinates: [[[-123.2, 48.45], [-123.07, 48.45], [-123.04, 48.53], [-123.15, 48.6], [-123.25, 48.54], [-123.2, 48.45]]] },
    },
    {
      type: "Feature",
      properties: {
        h3: "target-48-122-c",
        base_viewability_score: 0.41,
        dynamic_viewability_score: 0.38,
      },
      geometry: { type: "Polygon", coordinates: [[[-123.48, 48.59], [-123.34, 48.58], [-123.3, 48.67], [-123.41, 48.74], [-123.53, 48.69], [-123.48, 48.59]]] },
    },
    {
      type: "Feature",
      properties: {
        h3: "target-48-122-d",
        base_viewability_score: 0.88,
        dynamic_viewability_score: 0.81,
      },
      geometry: { type: "Polygon", coordinates: [[[-123.26, 48.64], [-123.12, 48.63], [-123.08, 48.72], [-123.19, 48.78], [-123.31, 48.73], [-123.26, 48.64]]] },
    },
  ],
};

export const viewabilitySourceCellsFixture: ViewabilitySourceFeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        h3: "source-san-juan-west",
        source_type: "land",
        source_viewyness_score: 0.84,
        reachable_target_count: 3,
        mean_target_weight: 0.66,
        max_target_weight: 0.88,
        effective_view_radius_km: 18.6,
      },
      geometry: { type: "Polygon", coordinates: [[[-123.23, 48.55], [-123.17, 48.55], [-123.15, 48.6], [-123.2, 48.64], [-123.26, 48.6], [-123.23, 48.55]]] },
    },
    {
      type: "Feature",
      properties: {
        h3: "source-victoria-approach",
        source_type: "mixed",
        source_viewyness_score: 0.57,
        reachable_target_count: 2,
        mean_target_weight: 0.49,
        max_target_weight: 0.62,
        effective_view_radius_km: 13.2,
      },
      geometry: { type: "Polygon", coordinates: [[[-123.45, 48.35], [-123.39, 48.35], [-123.36, 48.4], [-123.42, 48.44], [-123.49, 48.4], [-123.45, 48.35]]] },
    },
  ],
};

export const sourceTargetVisibilityFixture: SourceTargetVisibilityRecord[] = [
  { source_h3: "source-san-juan-west", target_h3: "target-48-122-a", source_target_weight: 0.88, distance_km: 7.4, weight_distance: 0.9, weight_terrain: 0.95, weight_vegetation: 0.82 },
  { source_h3: "source-san-juan-west", target_h3: "target-48-122-b", source_target_weight: 0.72, distance_km: 9.8, weight_distance: 0.78, weight_terrain: 0.88, weight_vegetation: 0.75 },
  { source_h3: "source-san-juan-west", target_h3: "target-48-122-d", source_target_weight: 0.39, distance_km: 17.1, weight_distance: 0.42, weight_terrain: 0.76, weight_vegetation: 0.58 },
  { source_h3: "source-victoria-approach", target_h3: "target-48-122-a", source_target_weight: 0.62, distance_km: 11.2, weight_distance: 0.68, weight_terrain: 0.81, weight_vegetation: 0.71 },
  { source_h3: "source-victoria-approach", target_h3: "target-48-122-c", source_target_weight: 0.36, distance_km: 15.5, weight_distance: 0.46, weight_terrain: 0.64, weight_vegetation: 0.55 },
];

export const sourceCellConditionsFixture: SourceCellConditions[] = [
  { source_h3: "source-san-juan-west", selected_period: "2026-05-04 -> 2026-05-10", weather_score: 0.7, daylight_score: 0.86, lunar_phase: "Waning gibbous", moon_illumination: 0.73, dynamic_modifier: 0.78 },
  { source_h3: "source-victoria-approach", selected_period: "2026-05-04 -> 2026-05-10", weather_score: 0.61, daylight_score: 0.82, lunar_phase: "Waning gibbous", moon_illumination: 0.73, dynamic_modifier: 0.68 },
];

export const sourceCellTimeSeriesFixture: SourceCellTimeSeriesPoint[] = [
  { period: "2026-W18", dynamic_viewability: 0.61, sighting_count: 3 },
  { period: "2026-W19", dynamic_viewability: 0.74, sighting_count: 5 },
  { period: "2026-W20", dynamic_viewability: 0.58, sighting_count: 2 },
  { period: "2026-W21", dynamic_viewability: 0.69, sighting_count: 4 },
];

export const viewabilitySightingsBinsFixture: ViewabilitySightingsBin[] = [
  { bin_label: "0.0-0.2", min_dynamic_viewability: 0, max_dynamic_viewability: 0.2, sighting_count: 1, sighting_rate: 0.02, cell_period_observations: 48 },
  { bin_label: "0.2-0.4", min_dynamic_viewability: 0.2, max_dynamic_viewability: 0.4, sighting_count: 4, sighting_rate: 0.05, cell_period_observations: 80 },
  { bin_label: "0.4-0.6", min_dynamic_viewability: 0.4, max_dynamic_viewability: 0.6, sighting_count: 7, sighting_rate: 0.09, cell_period_observations: 76 },
  { bin_label: "0.6-0.8", min_dynamic_viewability: 0.6, max_dynamic_viewability: 0.8, sighting_count: 13, sighting_rate: 0.16, cell_period_observations: 82 },
  { bin_label: "0.8-1.0", min_dynamic_viewability: 0.8, max_dynamic_viewability: 1, sighting_count: 9, sighting_rate: 0.18, cell_period_observations: 50 },
];
