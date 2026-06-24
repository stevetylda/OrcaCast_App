import type { FeatureCollection, Polygon, MultiPolygon } from "geojson";
import type {
  SourceTargetVisibilityRecord,
  ViewabilityTargetProperties,
  ViewabilityTargetFeatureCollection,
} from "../../../data/viewabilityTypes";

export type InspectorTargetProperties = ViewabilityTargetProperties &
  Partial<SourceTargetVisibilityRecord> & {
    visible_from_selected_source?: boolean;
  };

export function buildInspectorTargetCells(
  targets: ViewabilityTargetFeatureCollection | null,
  visibility: SourceTargetVisibilityRecord[]
): FeatureCollection<Polygon | MultiPolygon, InspectorTargetProperties> {
  const recordsByTarget = new Map(visibility.map((record) => [record.target_h3, record]));

  return {
    type: "FeatureCollection",
    features: (targets?.features ?? []).map((feature) => {
      const visibilityRecord = recordsByTarget.get(feature.properties.h3);
      return {
        ...feature,
        properties: {
          ...feature.properties,
          ...(visibilityRecord ?? {}),
          visible_from_selected_source: Boolean(visibilityRecord),
        },
      };
    }),
  };
}
