import type { MutableRefObject } from "react";
import type {
  Feature,
  FeatureCollection,
  GeoJsonProperties,
  Geometry,
  LineString,
  MultiPolygon,
  Point,
  Polygon,
  Position,
} from "geojson";
import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import type { ViewabilitySourceFeatureCollection, ViewabilityTargetFeatureCollection } from "../../../../data/viewabilityTypes";
import type { ViewabilityAreaSelectionTool } from "../../useViewabilityPageController";
import { DRAW_SOURCE_ID } from "./viewabilityMapLayers";
import { buildCirclePolygon, closePolygon, pointInPolygon, polygonAreaSqKm, polygonIntersects } from "./viewabilityGeometryMath";

export type AreaSelectionDraft = {
  tool: ViewabilityAreaSelectionTool;
  points: Position[];
  active: boolean;
  cursorPoint: Position | null;
  circleCenter: Position | null;
  circleRadiusKm: number;
};

export function createEmptyAreaSelectionDraft(tool: ViewabilityAreaSelectionTool): AreaSelectionDraft {
  return {
    tool,
    points: [],
    active: false,
    cursorPoint: null,
    circleCenter: null,
    circleRadiusKm: 0,
  };
}

export function emptyFeatureCollection(): FeatureCollection<Geometry, GeoJsonProperties> {
  return { type: "FeatureCollection", features: [] };
}

export function syncAreaSelectionDraft(
  map: MapLibreMap,
  draft: AreaSelectionDraft,
  onMetricsChangeRef: MutableRefObject<(areaKm2: number, ready: boolean) => void>
) {
  const source = map.getSource(DRAW_SOURCE_ID) as GeoJSONSource | undefined;
  source?.setData(buildAreaSelectionFeatureCollection(draft));
  const polygon = getSelectionPolygonFromDraft(draft);
  onMetricsChangeRef.current(polygon ? polygonAreaSqKm(polygon) : 0, Boolean(polygon));
}

export function buildAreaSelectionFeatureCollection(draft: AreaSelectionDraft): FeatureCollection<Geometry, GeoJsonProperties> {
  const features: Array<Feature<Geometry, GeoJsonProperties>> = [];

  if (draft.tool === "circle") {
    const polygon = getSelectionPolygonFromDraft(draft);
    if (!polygon) return emptyFeatureCollection();
    features.push({
      type: "Feature",
      properties: { kind: "polygon" },
      geometry: { type: "Polygon", coordinates: [polygon] },
    });
    return { type: "FeatureCollection", features };
  }

  const linePoints = draft.tool === "polygon" && draft.cursorPoint
    ? [...draft.points, draft.cursorPoint]
    : draft.points;

  if (linePoints.length >= 2) {
    features.push({
      type: "Feature",
      properties: { kind: "line" },
      geometry: {
        type: "LineString",
        coordinates: linePoints,
      } satisfies LineString,
    });
  }

  const polygon = getSelectionPolygonFromDraft(draft);
  if (polygon) {
    features.push({
      type: "Feature",
      properties: { kind: "polygon" },
      geometry: { type: "Polygon", coordinates: [polygon] },
    });
  }

  return { type: "FeatureCollection", features };
}

export function getSelectionPolygonFromDraft(draft: AreaSelectionDraft): Position[] | null {
  if (draft.tool === "circle") {
    if (!draft.circleCenter || draft.circleRadiusKm <= 0) return null;
    return buildCirclePolygon(draft.circleCenter, draft.circleRadiusKm);
  }
  if (draft.points.length < 3) return null;
  return closePolygon(draft.points);
}

export function applyAreaSelectionDraft(
  draft: AreaSelectionDraft,
  drawSelectionKind: "target" | "source",
  sourceFeatures: ViewabilitySourceFeatureCollection["features"],
  targetFeatures: ViewabilityTargetFeatureCollection["features"],
  onSelectSourceCellsRef: MutableRefObject<(sourceCellIds: string[], additive?: boolean) => void>,
  onSelectTargetCellsRef: MutableRefObject<(targetCellIds: string[], additive?: boolean) => void>
): boolean {
  const polygon = getSelectionPolygonFromDraft(draft);
  if (!polygon) return false;

  if (drawSelectionKind === "source") {
    const ids = sourceFeatures
      .filter((feature) => featureTouchesPolygon(feature as Feature<Polygon | MultiPolygon | Point, GeoJsonProperties>, polygon))
      .map((feature) => feature.properties.h3)
      .filter((h3): h3 is string => typeof h3 === "string" && h3.length > 0);
    onSelectSourceCellsRef.current(ids);
  } else {
    const ids = targetFeatures
      .filter((feature) => featureTouchesPolygon(feature as Feature<Polygon | MultiPolygon, GeoJsonProperties>, polygon))
      .map((feature) => feature.properties.h3)
      .filter((h3): h3 is string => typeof h3 === "string" && h3.length > 0);
    onSelectTargetCellsRef.current(ids);
  }
  return true;
}

function featureTouchesPolygon(
  feature: Feature<Polygon | MultiPolygon | Point, GeoJsonProperties>,
  polygon: Position[]
): boolean {
  if (!feature.geometry) return false;
  if (feature.geometry.type === "Point") return pointInPolygon(feature.geometry.coordinates, polygon);
  if (feature.geometry.type === "Polygon") return polygonIntersects(feature.geometry.coordinates, polygon);
  return feature.geometry.coordinates.some((coords) => polygonIntersects(coords, polygon));
}
