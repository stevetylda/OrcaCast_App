import type { FeatureCollection, Polygon, MultiPolygon, Point } from "geojson";
import type {
  SourceTargetVisibilityRecord,
  ViewabilitySourceFeatureCollection,
  ViewabilitySourceProperties,
  ViewabilityScoreType,
  ViewabilityTargetProperties,
  ViewabilityTargetFeatureCollection,
} from "../../../data/viewabilityTypes";

export type InspectorTargetProperties = ViewabilityTargetProperties &
  Partial<SourceTargetVisibilityRecord> & {
    visible_from_selected_source?: boolean;
    base_source_target_weight?: number;
    dynamic_source_target_weight?: number;
    source_target_modifier?: number;
  };

export type InspectorSourceProperties = ViewabilitySourceProperties &
  Partial<SourceTargetVisibilityRecord> & {
    visible_to_selected_target?: boolean;
    base_source_target_weight?: number;
    dynamic_source_target_weight?: number;
  };

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function dynamicModifierFromTarget(properties: ViewabilityTargetProperties): number {
  const baseScore = finiteNumber(properties.base_viewability_score);
  const dynamicScore = finiteNumber(properties.dynamic_viewability_score);

  if (baseScore !== undefined && baseScore > 0 && dynamicScore !== undefined) {
    return clamp01(dynamicScore / baseScore);
  }

  const weather = finiteNumber(properties.weather_modifier);
  const daylight = finiteNumber(properties.daylight_modifier);
  const lunar = finiteNumber(properties.lunar_modifier);
  const modifiers = [weather, daylight, lunar].filter((value): value is number => value !== undefined);

  if (modifiers.length > 0) {
    return clamp01(modifiers.reduce((product, value) => product * clamp01(value), 1));
  }

  return 1;
}

export function buildInspectorTargetCells(
  targets: ViewabilityTargetFeatureCollection | null,
  visibility: SourceTargetVisibilityRecord[],
  scoreType: ViewabilityScoreType = "dynamic"
): FeatureCollection<Polygon | MultiPolygon, InspectorTargetProperties> {
  const recordsByTarget = new Map(visibility.map((record) => [record.target_h3, record]));

  return {
    type: "FeatureCollection",
    features: (targets?.features ?? []).flatMap((feature) => {
      const visibilityRecord = recordsByTarget.get(feature.properties.h3);
      if (!visibilityRecord) return [];

      const baseWeight = finiteNumber(visibilityRecord?.base_source_target_weight) ?? finiteNumber(visibilityRecord?.source_target_weight) ?? 0;
      const modifier = finiteNumber(visibilityRecord?.source_target_modifier) ?? dynamicModifierFromTarget(feature.properties);
      const dynamicWeight = finiteNumber(visibilityRecord?.dynamic_source_target_weight) ?? clamp01(baseWeight * modifier);
      const activeWeight = scoreType === "dynamic" ? dynamicWeight : baseWeight;

      return {
        ...feature,
        properties: {
          ...feature.properties,
          ...(visibilityRecord ?? {}),
          base_source_target_weight: visibilityRecord ? baseWeight : undefined,
          dynamic_source_target_weight: visibilityRecord ? dynamicWeight : undefined,
          source_target_modifier: visibilityRecord ? modifier : undefined,
          source_target_weight: visibilityRecord ? activeWeight : undefined,
          visible_from_selected_source: Boolean(visibilityRecord),
        },
      };
    }),
  };
}

export function buildInspectorSourceCells(
  sources: ViewabilitySourceFeatureCollection | null,
  visibility: SourceTargetVisibilityRecord[],
  scoreType: ViewabilityScoreType = "dynamic"
): FeatureCollection<Polygon | MultiPolygon | Point, InspectorSourceProperties> {
  const recordsBySource = new Map(visibility.map((record) => [record.source_h3, record]));

  return {
    type: "FeatureCollection",
    features: (sources?.features ?? []).map((feature) => {
      const visibilityRecord = recordsBySource.get(feature.properties.h3);
      const baseWeight =
        finiteNumber(visibilityRecord?.base_source_target_weight) ??
        finiteNumber(visibilityRecord?.source_target_weight) ??
        0;
      const dynamicWeight =
        finiteNumber(visibilityRecord?.dynamic_source_target_weight) ??
        finiteNumber(visibilityRecord?.source_target_weight) ??
        0;
      const activeWeight = scoreType === "dynamic" ? dynamicWeight : baseWeight;

      return {
        ...feature,
        properties: {
          ...feature.properties,
          ...(visibilityRecord ?? {}),
          base_source_target_weight: visibilityRecord ? baseWeight : undefined,
          dynamic_source_target_weight: visibilityRecord ? dynamicWeight : undefined,
          source_target_weight: visibilityRecord ? activeWeight : undefined,
          visible_to_selected_target: Boolean(visibilityRecord),
        },
      };
    }),
  };
}
