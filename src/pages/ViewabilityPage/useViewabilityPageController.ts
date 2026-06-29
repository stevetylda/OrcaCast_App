import { useCallback, useEffect, useMemo, useState } from "react";
import type { Feature, GeoJsonProperties, MultiPolygon, Polygon, Position } from "geojson";
import { getForecastPathForPeriod, type H3Resolution } from "../../config/dataPaths";
import { isoWeekToDateRange } from "../../core/time/forecastPeriodToIsoWeek";
import { loadExpectedCountSeries } from "../../data/expectedCount";
import { attachProbabilities, loadForecast, loadGrid } from "../../data/forecastIO";
import { loadPeriods, type Period } from "../../data/periods";
import type {
  SourceCellConditions,
  SourceCellTimeSeriesPoint,
  SourceTargetVisibilityRecord,
  ViewabilityAreaConditionPoint,
  ViewabilityColorScaleSettings,
  ViewabilityDisplayMode,
  ViewabilityMapMode,
  ViewabilityScoreType,
  ViewabilitySourceFeature,
  ViewabilitySourceFeatureCollection,
  ViewabilityTargetProperties,
  ViewabilityTargetFeatureCollection,
} from "../../data/viewabilityTypes";
import {
  loadTargetSourceVisibility,
  loadViewabilityAreaConditions,
  loadSourceCellConditions,
  loadSourceCellTimeSeries,
  loadSourceTargetVisibility,
  loadViewabilityDates,
  loadViewabilitySourceCells,
  loadViewabilityTargetCells,
} from "../../data/viewabilityIO";
import { useMapState } from "../../state/MapStateContext";

export type ViewabilityPageController = ReturnType<typeof useViewabilityPageController>;
export type ViewabilityAnalysisTab = "conditions" | "source";
export type ViewabilityDrawSelectionKind = "target" | "source";
export type ViewabilitySelectionMode = "cell" | "area" | "heat";
export type ViewabilityAreaSelectionTool = "freehand" | "polygon" | "circle";
export type ViewabilityHeatMode = "modeled" | "custom";

type ViewabilityHeatSelectionPreview = {
  loading: boolean;
  error: string | null;
  note: string | null;
  periodLabel: string | null;
  resolution: H3Resolution | null;
  totalMatchedCells: number;
  selectedCount: number;
  targetCellIds: string[];
};

const DEFAULT_COLOR_SETTINGS: ViewabilityColorScaleSettings = {
  paletteId: "mediterranean_atlas",
  normalizeValues: true,
  reversePalette: false,
};

const HEAT_PRESET_VALUES = [0.1, 0.5, 1, 2, 5];
const HEAT_RESOLUTION_OPTIONS: H3Resolution[] = ["H4", "H5", "H6"];

const EMPTY_HEAT_PREVIEW: ViewabilityHeatSelectionPreview = {
  loading: false,
  error: null,
  note: null,
  periodLabel: null,
  resolution: null,
  totalMatchedCells: 0,
  selectedCount: 0,
  targetCellIds: [],
};

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function mean(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
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
  return Boolean(
    feature?.geometry && (feature.geometry.type === "Polygon" || feature.geometry.type === "MultiPolygon")
  );
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
    if (pointOnSegment(point, ring[idx], ring[idx + 1])) {
      return true;
    }
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
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0))
    && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
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
  if (Math.abs(direction(start, end, point)) > epsilon) {
    return false;
  }
  return point[0] <= Math.max(start[0], end[0]) + epsilon
    && point[0] >= Math.min(start[0], end[0]) - epsilon
    && point[1] <= Math.max(start[1], end[1]) + epsilon
    && point[1] >= Math.min(start[1], end[1]) - epsilon;
}

function targetDynamicModifier(properties: {
  base_viewability_score?: number;
  dynamic_viewability_score?: number;
  weather_modifier?: number;
  daylight_modifier?: number;
  lunar_modifier?: number;
}): number {
  const baseScore = finiteNumber(properties.base_viewability_score);
  const dynamicScore = finiteNumber(properties.dynamic_viewability_score);

  if (baseScore !== undefined && baseScore > 0 && dynamicScore !== undefined) {
    return clamp01(dynamicScore / baseScore);
  }

  const modifiers = [
    finiteNumber(properties.weather_modifier),
    finiteNumber(properties.daylight_modifier),
    finiteNumber(properties.lunar_modifier),
  ].filter((value): value is number => value !== undefined);

  if (modifiers.length > 0) {
    return clamp01(modifiers.reduce((product, value) => product * clamp01(value), 1));
  }

  return 1;
}

export function useViewabilityPageController() {
  const { resolution, modelId } = useMapState();
  const [selectedDateOrPeriod, setSelectedDateOrPeriod] = useState("2026-05-04");
  const [availableDates, setAvailableDates] = useState<string[]>(["2026-05-04"]);
  const [scoreType, setScoreType] = useState<ViewabilityScoreType>("dynamic");
  const [showTargetCells, setShowTargetCells] = useState(true);
  const [showSourceCells, setShowSourceCells] = useState(false);
  const [selectedSourceCellIds, setSelectedSourceCellIds] = useState<string[]>([]);
  const [selectedTargetCellIds, setSelectedTargetCellIds] = useState<string[]>([]);
  const selectedSourceCellId = selectedSourceCellIds.at(-1) ?? null;
  const selectedTargetCellId = selectedTargetCellIds.at(-1) ?? null;
  const [targetCells, setTargetCells] = useState<ViewabilityTargetFeatureCollection | null>(null);
  const [sourceCells, setSourceCells] = useState<ViewabilitySourceFeatureCollection | null>(null);
  const [sourceTargetVisibility, setSourceTargetVisibility] = useState<SourceTargetVisibilityRecord[]>([]);
  const [targetSourceVisibility, setTargetSourceVisibility] = useState<SourceTargetVisibilityRecord[]>([]);
  const [selectedSourceConditions, setSelectedSourceConditions] = useState<SourceCellConditions | null>(null);
  const [selectedSourceTimeSeriesBySource, setSelectedSourceTimeSeriesBySource] = useState<Record<string, SourceCellTimeSeriesPoint[]>>({});
  const [areaConditions, setAreaConditions] = useState<ViewabilityAreaConditionPoint[]>([]);
  const [colorScaleSettings, setColorScaleSettings] = useState<ViewabilityColorScaleSettings>(DEFAULT_COLOR_SETTINGS);
  const [poiFilters, setPoiFilters] = useState({ Park: false, Marina: false, Ferry: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bottomDrawerOpen, setBottomDrawerOpen] = useState(false);
  const [analysisTab, setAnalysisTab] = useState<ViewabilityAnalysisTab>("conditions");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectionMode, setSelectionMode] = useState<ViewabilitySelectionMode>("cell");
  const [displayMode, setDisplayMode] = useState<ViewabilityDisplayMode>("hex");
  const [areaSelectionTool, setAreaSelectionTool] = useState<ViewabilityAreaSelectionTool>("freehand");
  const [heatMode, setHeatMode] = useState<ViewabilityHeatMode>("modeled");
  const [heatPercentile, setHeatPercentile] = useState(1);
  const [heatResolution, setHeatResolution] = useState<H3Resolution>(resolution);
  const [heatSelectionPreview, setHeatSelectionPreview] = useState<ViewabilityHeatSelectionPreview>(EMPTY_HEAT_PREVIEW);
  const [heatApplyBusy, setHeatApplyBusy] = useState(false);
  const [areaSelectionAreaKm2, setAreaSelectionAreaKm2] = useState(0);
  const [areaSelectionReady, setAreaSelectionReady] = useState(false);

  const mapMode: ViewabilityMapMode = selectedSourceCellIds.length > 0
    ? "source-inspector"
    : selectedTargetCellIds.length > 0
      ? "target-inspector"
      : "overview";

  useEffect(() => {
    let cancelled = false;
    loadViewabilityDates()
      .then((dates) => {
        if (cancelled) return;
        setAvailableDates(dates);
        setSelectedDateOrPeriod((current) => (dates.includes(current) ? current : dates.at(-1) ?? current));
      })
      .catch(() => {
        if (!cancelled) setAvailableDates(["2026-05-04"]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadViewabilityAreaConditions()
      .then((points) => {
        if (!cancelled) setAreaConditions(points);
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setAreaConditions([]);
          setError(reason instanceof Error ? reason.message : "Area condition data failed to load.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      loadViewabilityTargetCells(selectedDateOrPeriod),
      loadViewabilitySourceCells(selectedDateOrPeriod, scoreType),
    ])
      .then(([targets, sources]) => {
        if (cancelled) return;
        setTargetCells(targets);
        setSourceCells(sources);
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        setError(reason instanceof Error ? reason.message : "Viewability data failed to load.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [scoreType, selectedDateOrPeriod]);

  useEffect(() => {
    if (scoreType === "base" && selectionMode === "heat") {
      setSelectionMode("cell");
    }
  }, [scoreType, selectionMode]);

  useEffect(() => {
    let cancelled = false;

    if (scoreType === "base") {
      setHeatSelectionPreview(EMPTY_HEAT_PREVIEW);
      return;
    }

    const targetFeatures = targetCells?.features ?? [];

    if (targetFeatures.length === 0) {
      setHeatSelectionPreview(EMPTY_HEAT_PREVIEW);
      return;
    }

    setHeatSelectionPreview((current) => ({
      ...current,
      loading: true,
      error: null,
    }));

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
  }, [heatMode, heatPercentile, heatResolution, modelId, scoreType, selectedDateOrPeriod, targetCells]);

  useEffect(() => {
    let cancelled = false;

    if (selectedSourceCellIds.length === 0) {
      setSourceTargetVisibility([]);
      setSelectedSourceConditions(null);
      return;
    }

    Promise.all([
      Promise.all(selectedSourceCellIds.map((sourceCellId) => loadSourceTargetVisibility(sourceCellId))).then((groups) => groups.flat()),
      loadSourceCellConditions(selectedSourceCellId ?? undefined, selectedDateOrPeriod),
    ])
      .then(([visibility, conditions]) => {
        if (cancelled) return;
        setSourceTargetVisibility(visibility);
        setSelectedSourceConditions(conditions);
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        setSourceTargetVisibility([]);
        setSelectedSourceConditions(null);
        setError(reason instanceof Error ? reason.message : "Selected source viewability failed to load.");
      });

    return () => {
      cancelled = true;
    };
  }, [selectedDateOrPeriod, selectedSourceCellId, selectedSourceCellIds]);

  useEffect(() => {
    let cancelled = false;

    if (selectedTargetCellIds.length === 0) {
      setTargetSourceVisibility([]);
      return;
    }

    Promise.all(selectedTargetCellIds.map((targetCellId) => loadTargetSourceVisibility(targetCellId)))
      .then((groups) => {
        if (cancelled) return;
        setTargetSourceVisibility(groups.flat());
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        setTargetSourceVisibility([]);
        setError(reason instanceof Error ? reason.message : "Selected target visibility failed to load.");
      });

    return () => {
      cancelled = true;
    };
  }, [selectedTargetCellIds]);

  const selectedSourceSummary = useMemo<ViewabilitySourceFeature | null>(() => {
    if (!selectedSourceCellId) return null;
    return sourceCells?.features.find((feature) => feature.properties.h3 === selectedSourceCellId) ?? null;
  }, [selectedSourceCellId, sourceCells]);

  const selectedVisibility = useMemo(() => {
    if (selectedSourceCellIds.length === 0) return [];

    const selectedIds = new Set(selectedSourceCellIds);
    const modifierByTargetH3 = new Map(
      (targetCells?.features ?? []).map((feature) => [
        feature.properties.h3,
        targetDynamicModifier(feature.properties),
      ])
    );

    const recordsByTarget = new Map<string, SourceTargetVisibilityRecord[]>();
    for (const record of sourceTargetVisibility) {
      if (!selectedIds.has(record.source_h3)) continue;
      const records = recordsByTarget.get(record.target_h3) ?? [];
      records.push(record);
      recordsByTarget.set(record.target_h3, records);
    }

    return Array.from(recordsByTarget.entries()).map(([targetH3, records]) => {
      const sourceIds = Array.from(new Set(records.map((record) => record.source_h3)));
      const modifier: number = modifierByTargetH3.get(targetH3) ?? 1;
      const baseWeights = records.map(
        (record) => finiteNumber(record.base_source_target_weight) ?? finiteNumber(record.source_target_weight) ?? 0
      );
      const dynamicWeights = baseWeights.map((weight) => clamp01(weight * modifier));
      const baseWeight = mean(baseWeights);
      const dynamicWeight = mean(dynamicWeights);
      const activeWeight = scoreType === "dynamic" ? dynamicWeight : baseWeight;
      const first = records[0];

      return {
        ...first,
        source_h3: sourceIds.length === 1 ? sourceIds[0] : "multiple",
        source_h3s: sourceIds,
        selected_source_count: sourceIds.length,
        target_h3: targetH3,
        base_source_target_weight: baseWeight,
        dynamic_source_target_weight: dynamicWeight,
        source_target_modifier: modifier,
        source_target_weight: activeWeight,
        distance_km: sourceIds.length === 1 ? first.distance_km : undefined,
        weight_distance: sourceIds.length === 1 ? first.weight_distance : undefined,
        weight_terrain: sourceIds.length === 1 ? first.weight_terrain : undefined,
        weight_vegetation: sourceIds.length === 1 ? first.weight_vegetation : undefined,
      } satisfies SourceTargetVisibilityRecord;
    });
  }, [scoreType, selectedSourceCellIds, sourceTargetVisibility, targetCells]);

  const selectedTargetSources = useMemo(() => {
    if (selectedTargetCellIds.length === 0) return [];

    const selectedIds = new Set(selectedTargetCellIds);
    const modifierByTargetH3 = new Map(
      (targetCells?.features ?? []).map((feature) => [
        feature.properties.h3,
        targetDynamicModifier(feature.properties),
      ])
    );

    const recordsBySource = new Map<string, SourceTargetVisibilityRecord[]>();
    for (const record of targetSourceVisibility) {
      if (!selectedIds.has(record.target_h3)) continue;
      const records = recordsBySource.get(record.source_h3) ?? [];
      records.push(record);
      recordsBySource.set(record.source_h3, records);
    }

    return Array.from(recordsBySource.entries())
      .map(([sourceH3, records]) => {
        const targetIds = Array.from(new Set(records.map((record) => record.target_h3)));
        const baseWeights = records.map(
          (record) => finiteNumber(record.base_source_target_weight) ?? finiteNumber(record.source_target_weight) ?? 0
        );
        const dynamicWeights = records.map((record) => {
          const baseWeight = finiteNumber(record.base_source_target_weight) ?? finiteNumber(record.source_target_weight) ?? 0;
          return clamp01(baseWeight * (modifierByTargetH3.get(record.target_h3) ?? 1));
        });
        const baseWeight = sum(baseWeights);
        const dynamicWeight = sum(dynamicWeights);
        const activeWeight = scoreType === "dynamic" ? dynamicWeight : baseWeight;
        const first = records[0];

        return {
          ...first,
          source_h3: sourceH3,
          target_h3: targetIds.length === 1 ? targetIds[0] : "multiple",
          target_h3s: targetIds,
          selected_target_count: targetIds.length,
          base_source_target_weight: baseWeight,
          dynamic_source_target_weight: dynamicWeight,
          source_target_weight: activeWeight,
        } satisfies SourceTargetVisibilityRecord;
      })
      .sort((a, b) => (b.source_target_weight ?? 0) - (a.source_target_weight ?? 0));
  }, [scoreType, selectedTargetCellIds, targetCells, targetSourceVisibility]);

  const inspectedSourceCellIds = useMemo(
    () => (mapMode === "source-inspector" ? selectedSourceCellIds : []),
    [mapMode, selectedSourceCellIds]
  );

  const inspectedSourceCellId = inspectedSourceCellIds.at(-1) ?? null;
  const selectedSourceTimeSeries = inspectedSourceCellId
    ? selectedSourceTimeSeriesBySource[inspectedSourceCellId] ?? []
    : [];

  useEffect(() => {
    let cancelled = false;

    if (inspectedSourceCellIds.length === 0) {
      setSelectedSourceTimeSeriesBySource({});
      return;
    }

    Promise.all(
      inspectedSourceCellIds.map(async (sourceCellId) => [
        sourceCellId,
        await loadSourceCellTimeSeries(sourceCellId),
      ] as const)
    )
      .then((entries) => {
        if (cancelled) return;
        setSelectedSourceTimeSeriesBySource(Object.fromEntries(entries));
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        setSelectedSourceTimeSeriesBySource({});
        setError(reason instanceof Error ? reason.message : "Source time series failed to load.");
      });

    return () => {
      cancelled = true;
    };
  }, [inspectedSourceCellIds]);

  const selectSourceCell = useCallback((sourceCellId: string, additive = false) => {
    setSelectedTargetCellIds([]);
    setTargetSourceVisibility([]);
    setSelectedSourceCellIds((current) => {
      if (!additive) return [sourceCellId];

      if (current.includes(sourceCellId)) {
        return current.filter((id) => id !== sourceCellId);
      }

      return [...current, sourceCellId];
    });
    setAnalysisTab("source");
  }, []);

  const selectSourceCells = useCallback((sourceCellIds: string[], additive = false) => {
    const nextIds = Array.from(new Set(sourceCellIds.filter(Boolean)));
    if (nextIds.length === 0) return;
    setSelectedTargetCellIds([]);
    setTargetSourceVisibility([]);
    setSelectedSourceCellIds((current) => {
      if (!additive) return nextIds;
      return Array.from(new Set([...current, ...nextIds]));
    });
    setAnalysisTab("source");
  }, []);

  const selectTargetCell = useCallback((targetCellId: string, additive = false) => {
    setSelectedSourceCellIds([]);
    setSourceTargetVisibility([]);
    setSelectedSourceConditions(null);
    setSelectedSourceTimeSeriesBySource({});
    setSelectedTargetCellIds((current) => {
      if (!additive) return [targetCellId];

      if (current.includes(targetCellId)) {
        return current.filter((id) => id !== targetCellId);
      }

      return [...current, targetCellId];
    });
    setBottomDrawerOpen(false);
    setAnalysisTab("conditions");
  }, []);

  const selectTargetCells = useCallback((targetCellIds: string[], additive = false) => {
    const nextIds = Array.from(new Set(targetCellIds.filter(Boolean)));
    if (nextIds.length === 0) return;
    setSelectedSourceCellIds([]);
    setSourceTargetVisibility([]);
    setSelectedSourceConditions(null);
    setSelectedSourceTimeSeriesBySource({});
    setSelectedTargetCellIds((current) => {
      if (!additive) return nextIds;
      return Array.from(new Set([...current, ...nextIds]));
    });
    setBottomDrawerOpen(false);
    setAnalysisTab("conditions");
  }, []);

  const resetSelection = useCallback(() => {
    setSelectedSourceCellIds([]);
    setSelectedTargetCellIds([]);
    setSourceTargetVisibility([]);
    setTargetSourceVisibility([]);
    setSelectedSourceConditions(null);
    setSelectedSourceTimeSeriesBySource({});
    setAnalysisTab("conditions");
  }, []);

  const setColorScale = useCallback((next: Partial<ViewabilityColorScaleSettings>) => {
    setColorScaleSettings((current) => ({ ...current, ...next }));
  }, []);

  const togglePoiAll = useCallback(() => {
    setPoiFilters((current) => {
      const allOn = current.Park && current.Marina && current.Ferry;
      return { Park: !allOn, Marina: !allOn, Ferry: !allOn };
    });
  }, []);

  const togglePoiType = useCallback((type: "Park" | "Marina" | "Ferry") => {
    setPoiFilters((current) => ({ ...current, [type]: !current[type] }));
  }, []);

  const toggleTargetCells = useCallback(() => {
    setShowTargetCells((currentTargetVisible) => {
      const nextTargetVisible = !currentTargetVisible;
      if (nextTargetVisible) {
        setShowSourceCells(false);
      }
      return nextTargetVisible;
    });
  }, []);

  const toggleSourceCells = useCallback(() => {
    setShowSourceCells((currentSourceVisible) => {
      const nextSourceVisible = !currentSourceVisible;
      if (nextSourceVisible) {
        setShowTargetCells(false);
      }
      return nextSourceVisible;
    });
  }, []);

  const drawSelectionKind: ViewabilityDrawSelectionKind = showSourceCells ? "source" : "target";
  const openAreaSelection = useCallback(() => {
    setSelectionMode("area");
  }, []);

  const openHeatSelection = useCallback(() => {
    setSelectionMode("heat");
  }, []);

  const closeAreaSelection = useCallback(() => {
    setSelectionMode("cell");
    setAreaSelectionAreaKm2(0);
    setAreaSelectionReady(false);
  }, []);

  const applyHeatSelection = useCallback(async () => {
    if (heatSelectionPreview.targetCellIds.length === 0) return false;
    setHeatApplyBusy(true);
    try {
      selectTargetCells(heatSelectionPreview.targetCellIds);
      setSelectionMode("cell");
      return true;
    } finally {
      setHeatApplyBusy(false);
    }
  }, [heatSelectionPreview.targetCellIds, selectTargetCells]);

  const setAreaSelectionMetrics = useCallback((areaKm2: number, ready: boolean) => {
    setAreaSelectionAreaKm2(areaKm2);
    setAreaSelectionReady(ready);
  }, []);

  return {
    selectedDateOrPeriod,
    availableDates,
    setSelectedDateOrPeriod,
    scoreType,
    setScoreType,
    mapMode,
    showTargetCells,
    showSourceCells,
    selectedSourceCellId,
    selectedSourceCellIds,
    selectedTargetCellId,
    selectedTargetCellIds,
    selectedSourceSummary,
    selectedSourceConditions,
    selectedSourceTimeSeries,
    selectedSourceTimeSeriesBySource,
    selectedVisibility,
    selectedTargetSources,
    inspectedSourceCellId,
    inspectedSourceCellIds,
    areaConditions,
    colorScaleSettings,
    poiFilters,
    loading,
    error,
    targetCells,
    sourceCells,
    sourceTargetVisibility,
    targetSourceVisibility,
    bottomDrawerOpen,
    setBottomDrawerOpen,
    analysisTab,
    setAnalysisTab,
    settingsOpen,
    setSettingsOpen,
    selectionMode,
    displayMode,
    setDisplayMode,
    drawSelectionKind,
    areaSelectionTool,
    setAreaSelectionTool,
    heatMode,
    setHeatMode,
    heatPercentile,
    setHeatPercentile,
    heatPresetValues: HEAT_PRESET_VALUES,
    heatResolution,
    setHeatResolution,
    heatResolutionOptions: HEAT_RESOLUTION_OPTIONS,
    heatSelectionPreview,
    heatApplyBusy,
    areaSelectionAreaKm2,
    areaSelectionReady,
    openAreaSelection,
    openHeatSelection,
    closeAreaSelection,
    applyHeatSelection,
    setAreaSelectionMetrics,
    toggleTargetCells,
    toggleSourceCells,
    selectSourceCell,
    selectSourceCells,
    selectTargetCell,
    selectTargetCells,
    resetSelection,
    setColorScale,
    togglePoiAll,
    togglePoiType,
  };
}
