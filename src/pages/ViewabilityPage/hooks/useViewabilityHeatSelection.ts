import { useEffect, useState } from "react";
import type { Feature, GeoJsonProperties, MultiPolygon, Polygon, Position } from "geojson";
import { getForecastPathForPeriod, type H3Resolution } from "../../../config/dataPaths";
import { isoWeekToDateRange } from "../../../core/time/forecastPeriodToIsoWeek";
import { loadExpectedCountSeries } from "../../../data/expectedCount";
import { attachProbabilities, loadForecast, loadGrid } from "../../../data/forecastIO";
import { loadPeriods, type Period } from "../../../data/periods";
import type { ViewabilityTargetFeatureCollection, ViewabilityTargetProperties } from "../../../data/viewabilityTypes";
import type { ViewabilityHeatMode, ViewabilitySelectionMode } from "../useViewabilityPageController";

export type ViewabilityHeatSelectionPreview = {
  loading: boolean;
  error: string | null;
  note: string | null;
  periodLabel: string | null;
  resolution: H3Resolution | null;
  totalMatchedCells: number;
  selectedCount: number;
  targetCellIds: string[];
};

export const EMPTY_HEAT_PREVIEW: ViewabilityHeatSelectionPreview = {
  loading: false,
  error: null,
  note: null,
  periodLabel: null,
  resolution: null,
  totalMatchedCells: 0,
  selectedCount: 0,
  targetCellIds: [],
};

export function useViewabilityHeatSelection(args: {
  selectionMode: ViewabilitySelectionMode;
  scoreType: "base" | "dynamic";
  selectedDateOrPeriod: string;
  targetCells: ViewabilityTargetFeatureCollection | null;
  heatResolution: H3Resolution;
  modelId: string;
  heatMode: ViewabilityHeatMode;
  heatPercentile: number;
}) {
  const {
    heatMode,
    heatPercentile,
    heatResolution,
    modelId,
    scoreType,
    selectedDateOrPeriod,
    selectionMode,
    targetCells,
  } = args;
  const [heatSelectionPreviewState, setHeatSelectionPreview] = useState<ViewabilityHeatSelectionPreview>(EMPTY_HEAT_PREVIEW);
  const heatSelectionPreview =
    scoreType === "dynamic" && selectionMode === "heat"
      ? heatSelectionPreviewState
      : EMPTY_HEAT_PREVIEW;

  useEffect(() => {
    let cancelled = false;

    if (scoreType === "base" || selectionMode !== "heat") {
      return;
    }

    const targetFeatures = targetCells?.features ?? [];
    if (targetFeatures.length === 0) {
      return;
    }

    Promise.resolve().then(() => {
      if (cancelled) return;
      setHeatSelectionPreview((current) => ({
        ...current,
        loading: true,
        error: null,
      }));
    });

    resolveHeatSelectionPreview({
      date: selectedDateOrPeriod,
      targetFeatures,
      preferredResolution: heatResolution,
      modelId,
      mode: heatMode,
      percentile: heatPercentile,
    })
      .then((preview) => {
        if (!cancelled) setHeatSelectionPreview(preview);
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        setHeatSelectionPreview({
          ...EMPTY_HEAT_PREVIEW,
          error: reason instanceof Error ? reason.message : "Heat selection could not be prepared.",
          note: null,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [heatMode, heatPercentile, heatResolution, modelId, scoreType, selectedDateOrPeriod, selectionMode, targetCells]);

  return heatSelectionPreview;
}

function parseIsoDate(date: string): Date | null {
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function alignDateToForecastPeriod(date: string, periods: Period[]): Period | null {
  if (periods.length === 0) return null;
  const targetDate = parseIsoDate(date);
  if (!targetDate) return periods.at(-1) ?? periods[0];

  const exactWeek = periods.find((period) => {
    const range = isoWeekToDateRange(period.year, period.stat_week);
    return date >= range.start && date <= range.end;
  });
  if (exactWeek) return exactWeek;

  const targetTime = targetDate.getTime();
  const prior = periods.filter((period) => {
    const range = isoWeekToDateRange(period.year, period.stat_week);
    const end = parseIsoDate(range.end);
    return end && end.getTime() <= targetTime;
  });
  if (prior.length > 0) return prior.at(-1) ?? null;

  return periods[0];
}

async function resolveHeatSelectionPreview(args: {
  date: string;
  targetFeatures: ViewabilityTargetFeatureCollection["features"];
  preferredResolution: H3Resolution;
  modelId: string;
  mode: ViewabilityHeatMode;
  percentile: number;
}): Promise<ViewabilityHeatSelectionPreview> {
  const periods = await loadPeriods();
  const alignedPeriod = alignDateToForecastPeriod(args.date, periods);
  if (!alignedPeriod) {
    throw new Error("No forecast period is available for heat selection.");
  }

  const resolution = args.preferredResolution;
  const [grid, forecast] = await Promise.all([
    loadGrid(resolution),
    loadForecast(resolution, {
      kind: "explicit",
      explicitPath: getForecastPathForPeriod(resolution, alignedPeriod.fileId),
      modelId: args.modelId,
    }),
  ]);

  const overlay = attachProbabilities(grid, forecast.values, "prob");
  const hotspotFeatures = overlay.features
    .map((feature) => ({
      feature: feature as Feature<Polygon | MultiPolygon, GeoJsonProperties>,
      value: Number((feature.properties as Record<string, unknown> | null)?.prob ?? 0),
    }))
    .filter((entry) => Number.isFinite(entry.value) && entry.value > 0 && entry.feature.geometry
      && (entry.feature.geometry.type === "Polygon" || entry.feature.geometry.type === "MultiPolygon"));

  if (hotspotFeatures.length === 0) {
    throw new Error("Heat selection could not find hotspot geometry for the aligned forecast window.");
  }

  const sortedValuesDesc = hotspotFeatures.map((entry) => entry.value).sort((a, b) => b - a);
  const totalMatchedCells = sortedValuesDesc.length;
  let threshold = sortedValuesDesc[0] ?? 0;

  if (args.mode === "modeled") {
    const expectedCounts = await loadExpectedCountSeries(resolution);
    const modeledCount = expectedCounts.find(
      (row) => row.year === alignedPeriod.year && row.stat_week === alignedPeriod.stat_week
    )?.expected_count;

    if (!Number.isFinite(modeledCount)) {
      throw new Error("Modeled heat selection is unavailable for the aligned forecast window.");
    }

    if ((modeledCount ?? 0) <= 0) {
      return {
        loading: false,
        error: null,
        note: "Modeled hotspot count is zero for this forecast window.",
        periodLabel: alignedPeriod.label,
        resolution,
        totalMatchedCells,
        selectedCount: 0,
        targetCellIds: [],
      };
    }

    const modeledCountValue = modeledCount ?? 0;
    threshold =
      sortedValuesDesc[Math.max(0, Math.min(totalMatchedCells - 1, Math.round(modeledCountValue) - 1))] ?? threshold;
  } else {
    const count = Math.max(1, Math.round((totalMatchedCells * Math.min(Math.max(args.percentile, 0), 100)) / 100));
    threshold = sortedValuesDesc[Math.max(0, Math.min(totalMatchedCells - 1, count - 1))] ?? threshold;
  }

  const selectedHotspotFeatures = hotspotFeatures
    .filter((entry) => entry.value >= threshold)
    .map((entry) => entry.feature);

  const targetCellIds = args.targetFeatures
    .filter(isPolygonFeature)
    .filter((targetFeature) =>
      selectedHotspotFeatures.some((hotspotFeature) =>
        polygonFeatureIntersectsFeature(hotspotFeature, targetFeature)
      )
    )
    .map((feature) => feature.properties.h3)
    .filter((h3): h3 is string => typeof h3 === "string" && h3.length > 0);

  return {
    loading: false,
    error: null,
    note: null,
    periodLabel: alignedPeriod.label,
    resolution,
    totalMatchedCells,
    selectedCount: targetCellIds.length,
    targetCellIds,
  };
}

function isPolygonFeature(
  feature: ViewabilityTargetFeatureCollection["features"][number]
): feature is Feature<Polygon | MultiPolygon, ViewabilityTargetProperties> {
  return Boolean(feature?.geometry && (feature.geometry.type === "Polygon" || feature.geometry.type === "MultiPolygon"));
}

function polygonFeatureIntersectsFeature(
  a: Feature<Polygon | MultiPolygon, GeoJsonProperties>,
  b: Feature<Polygon | MultiPolygon, GeoJsonProperties>
): boolean {
  if (!a.geometry || !b.geometry) return false;
  const aRings = a.geometry.type === "Polygon" ? [a.geometry.coordinates] : a.geometry.coordinates;
  const bRings = b.geometry.type === "Polygon" ? [b.geometry.coordinates] : b.geometry.coordinates;
  return aRings.some((aPolygon) => bRings.some((bPolygon) => polygonIntersects(aPolygon, bPolygon[0] ?? [])))
    || bRings.some((bPolygon) => aRings.some((aPolygon) => polygonIntersects(bPolygon, aPolygon[0] ?? [])));
}

function polygonIntersects(polygonCoords: Position[][], selection: Position[]): boolean {
  const outerRing = polygonCoords[0] ?? [];
  if (outerRing.length === 0 || selection.length < 4) return false;
  for (const point of outerRing) {
    if (pointInPolygon(point, selection)) return true;
  }
  for (const point of selection) {
    if (pointInPolygon(point, outerRing)) return true;
  }
  return ringsIntersect(outerRing, selection);
}

function ringsIntersect(a: Position[], b: Position[]): boolean {
  for (let idx = 0; idx < a.length - 1; idx += 1) {
    const a1 = a[idx];
    const a2 = a[idx + 1];
    for (let jdx = 0; jdx < b.length - 1; jdx += 1) {
      const b1 = b[jdx];
      const b2 = b[jdx + 1];
      if (segmentsIntersect(a1, a2, b1, b2)) return true;
    }
  }
  return false;
}

function pointInPolygon(point: Position, ring: Position[]): boolean {
  for (let idx = 0; idx < ring.length - 1; idx += 1) {
    if (pointOnSegment(point, ring[idx], ring[idx + 1])) return true;
  }
  let inside = false;
  for (let idx = 0, jdx = ring.length - 1; idx < ring.length; jdx = idx, idx += 1) {
    const xi = ring[idx][0];
    const yi = ring[idx][1];
    const xj = ring[jdx][0];
    const yj = ring[jdx][1];
    const intersects = yi > point[1] !== yj > point[1]
      && point[0] < ((xj - xi) * (point[1] - yi)) / ((yj - yi) || Number.EPSILON) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function segmentsIntersect(a1: Position, a2: Position, b1: Position, b2: Position): boolean {
  const d1 = direction(b1, b2, a1);
  const d2 = direction(b1, b2, a2);
  const d3 = direction(a1, a2, b1);
  const d4 = direction(a1, a2, b2);
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true;
  }
  if (d1 === 0 && pointOnSegment(a1, b1, b2)) return true;
  if (d2 === 0 && pointOnSegment(a2, b1, b2)) return true;
  if (d3 === 0 && pointOnSegment(b1, a1, a2)) return true;
  if (d4 === 0 && pointOnSegment(b2, a1, a2)) return true;
  return false;
}

function direction(a: Position, b: Position, c: Position): number {
  return (c[0] - a[0]) * (b[1] - a[1]) - (c[1] - a[1]) * (b[0] - a[0]);
}

function pointOnSegment(point: Position, start: Position, end: Position): boolean {
  const epsilon = 1e-12;
  if (Math.abs(direction(start, end, point)) > epsilon) return false;
  return point[0] <= Math.max(start[0], end[0]) + epsilon
    && point[0] >= Math.min(start[0], end[0]) - epsilon
    && point[1] <= Math.max(start[1], end[1]) + epsilon
    && point[1] >= Math.min(start[1], end[1]) - epsilon;
}
