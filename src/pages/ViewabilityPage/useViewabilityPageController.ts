import { useCallback, useEffect, useMemo, useState } from "react";
import type { H3Resolution } from "../../config/dataPaths";
import type {
  SourceCellTimeSeriesPoint,
  SourceTargetVisibilityRecord,
  ViewabilityColorScaleSettings,
  ViewabilityDisplayMode,
  ViewabilityMapMode,
  ViewabilityScoreType,
} from "../../data/viewabilityTypes";
import {
  loadTargetSourceVisibility,
  loadSourceCellTimeSeries,
  loadSourceTargetVisibility,
} from "../../data/viewabilityIO";
import { useMapState } from "../../state/MapStateContext";
import { useViewabilityAreaConditions } from "./hooks/useViewabilityAreaConditions";
import { useViewabilityCells } from "./hooks/useViewabilityCells";
import { useViewabilityDates } from "./hooks/useViewabilityDates";
import { useViewabilityHeatSelection } from "./hooks/useViewabilityHeatSelection";

export type ViewabilityPageController = ReturnType<typeof useViewabilityPageController>;
export type ViewabilityAnalysisTab = "conditions" | "source";
export type ViewabilityDrawSelectionKind = "target" | "source";
export type ViewabilitySelectionMode = "cell" | "area" | "heat";
export type ViewabilityAreaSelectionTool = "freehand" | "polygon" | "circle";
export type ViewabilityHeatMode = "modeled" | "custom";

const DEFAULT_COLOR_SETTINGS: ViewabilityColorScaleSettings = {
  paletteId: "mediterranean_atlas",
  normalizeValues: true,
  reversePalette: false,
};

const HEAT_PRESET_VALUES = [0.1, 0.5, 1, 2, 5];
const HEAT_RESOLUTION_OPTIONS: H3Resolution[] = ["H4", "H5", "H6"];

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
  const { selectedDateOrPeriod, setSelectedDateOrPeriod, availableDates } = useViewabilityDates();
  const [scoreType, setScoreType] = useState<ViewabilityScoreType>("dynamic");
  const [showTargetCells, setShowTargetCells] = useState(true);
  const [showSourceCells, setShowSourceCells] = useState(false);
  const [selectedSourceCellIds, setSelectedSourceCellIds] = useState<string[]>([]);
  const [selectedTargetCellIds, setSelectedTargetCellIds] = useState<string[]>([]);
  const selectedSourceCellId = selectedSourceCellIds.at(-1) ?? null;
  const [sourceTargetVisibility, setSourceTargetVisibility] = useState<SourceTargetVisibilityRecord[]>([]);
  const [targetSourceVisibility, setTargetSourceVisibility] = useState<SourceTargetVisibilityRecord[]>([]);
  const [selectedSourceTimeSeriesBySource, setSelectedSourceTimeSeriesBySource] = useState<Record<string, SourceCellTimeSeriesPoint[]>>({});
  const [colorScaleSettings, setColorScaleSettings] = useState<ViewabilityColorScaleSettings>(DEFAULT_COLOR_SETTINGS);
  const [poiFilters, setPoiFilters] = useState({ Park: false, Marina: false, Ferry: false });
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
  const [heatApplyBusy, setHeatApplyBusy] = useState(false);
  const [areaSelectionAreaKm2, setAreaSelectionAreaKm2] = useState(0);
  const [areaSelectionReady, setAreaSelectionReady] = useState(false);
  const handleError = useCallback((message: string) => setError(message), []);

  const mapMode: ViewabilityMapMode = selectedSourceCellIds.length > 0
    ? "source-inspector"
    : selectedTargetCellIds.length > 0
      ? "target-inspector"
      : "overview";
  const drawSelectionKind: ViewabilityDrawSelectionKind = showSourceCells ? "source" : "target";
  const needsSourceCells = showSourceCells
    || selectedSourceCellIds.length > 0
    || selectedTargetCellIds.length > 0
    || drawSelectionKind === "source";
  const shouldLoadAreaConditions = bottomDrawerOpen;
  const shouldLoadSourceTimeSeries = bottomDrawerOpen && analysisTab === "source";
  const areaConditions = useViewabilityAreaConditions(shouldLoadAreaConditions, handleError);
  const { targetCells, sourceCells, loading } = useViewabilityCells({
    selectedDateOrPeriod,
    scoreType,
    needsSourceCells,
    onError: handleError,
  });
  const heatSelectionPreview = useViewabilityHeatSelection({
    selectionMode,
    scoreType,
    selectedDateOrPeriod,
    targetCells,
    heatResolution,
    modelId,
    heatMode,
    heatPercentile,
  });

  useEffect(() => {
    if (scoreType === "base" && selectionMode === "heat") {
      setSelectionMode("cell");
    }
  }, [scoreType, selectionMode]);

  useEffect(() => {
    let cancelled = false;

    if (selectedSourceCellIds.length === 0) {
      setSourceTargetVisibility([]);
      return;
    }

    Promise.all(selectedSourceCellIds.map((sourceCellId) => loadSourceTargetVisibility(sourceCellId)))
      .then((groups) => {
        if (cancelled) return;
        setSourceTargetVisibility(groups.flat());
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        setSourceTargetVisibility([]);
        setError(reason instanceof Error ? reason.message : "Selected source viewability failed to load.");
      });

    return () => {
      cancelled = true;
    };
  }, [selectedSourceCellIds]);

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
  const loadedSourceTimeSeriesIds = useMemo(
    () => new Set(Object.keys(selectedSourceTimeSeriesBySource)),
    [selectedSourceTimeSeriesBySource]
  );

  useEffect(() => {
    let cancelled = false;

    if (inspectedSourceCellIds.length === 0) {
      return;
    }

    if (!shouldLoadSourceTimeSeries) {
      return;
    }

    const sourceCellIdsToLoad = inspectedSourceCellIds.filter((sourceCellId) => !loadedSourceTimeSeriesIds.has(sourceCellId));
    if (sourceCellIdsToLoad.length === 0) {
      return;
    }

    Promise.all(
      sourceCellIdsToLoad.map(async (sourceCellId) => [
        sourceCellId,
        await loadSourceCellTimeSeries(sourceCellId),
      ] as const)
    )
      .then((entries) => {
        if (cancelled) return;
        setSelectedSourceTimeSeriesBySource((current) => ({
          ...current,
          ...Object.fromEntries(entries),
        }));
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        setSelectedSourceTimeSeriesBySource({});
        setError(reason instanceof Error ? reason.message : "Source time series failed to load.");
      });

    return () => {
      cancelled = true;
    };
  }, [inspectedSourceCellIds, loadedSourceTimeSeriesIds, shouldLoadSourceTimeSeries]);

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
    selectedTargetCellIds,
    selectedSourceTimeSeriesBySource,
    selectedVisibility,
    selectedTargetSources,
    areaConditions,
    colorScaleSettings,
    poiFilters,
    loading,
    error,
    targetCells,
    sourceCells,
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
