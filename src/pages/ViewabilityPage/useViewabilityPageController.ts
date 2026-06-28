import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  SourceCellConditions,
  SourceCellTimeSeriesPoint,
  SourceTargetVisibilityRecord,
  ViewabilityAreaConditionPoint,
  ViewabilityColorScaleSettings,
  ViewabilityMapMode,
  ViewabilityScoreType,
  ViewabilitySourceFeature,
  ViewabilitySourceFeatureCollection,
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

export type ViewabilityPageController = ReturnType<typeof useViewabilityPageController>;
export type ViewabilityAnalysisTab = "conditions" | "source";
export type ViewabilityDrawSelectionKind = "target" | "source";
export type ViewabilitySelectionMode = "cell" | "area";
export type ViewabilityAreaSelectionTool = "freehand" | "polygon" | "circle";

const DEFAULT_COLOR_SETTINGS: ViewabilityColorScaleSettings = {
  paletteId: "mediterranean_atlas",
  normalizeValues: true,
  reversePalette: false,
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
  const [areaSelectionTool, setAreaSelectionTool] = useState<ViewabilityAreaSelectionTool>("freehand");
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
        const baseWeight = mean(baseWeights);
        const dynamicWeight = mean(dynamicWeights);
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

  const closeAreaSelection = useCallback(() => {
    setSelectionMode("cell");
    setAreaSelectionAreaKm2(0);
    setAreaSelectionReady(false);
  }, []);

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
    drawSelectionKind,
    areaSelectionTool,
    setAreaSelectionTool,
    areaSelectionAreaKm2,
    areaSelectionReady,
    openAreaSelection,
    closeAreaSelection,
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
