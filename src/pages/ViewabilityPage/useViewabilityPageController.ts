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
  const [selectedSourceCellId, setSelectedSourceCellId] = useState<string | null>(null);
  const [targetCells, setTargetCells] = useState<ViewabilityTargetFeatureCollection | null>(null);
  const [sourceCells, setSourceCells] = useState<ViewabilitySourceFeatureCollection | null>(null);
  const [sourceTargetVisibility, setSourceTargetVisibility] = useState<SourceTargetVisibilityRecord[]>([]);
  const [selectedSourceConditions, setSelectedSourceConditions] = useState<SourceCellConditions | null>(null);
  const [selectedSourceTimeSeries, setSelectedSourceTimeSeries] = useState<SourceCellTimeSeriesPoint[]>([]);
  const [areaConditions, setAreaConditions] = useState<ViewabilityAreaConditionPoint[]>([]);
  const [colorScaleSettings, setColorScaleSettings] = useState<ViewabilityColorScaleSettings>(DEFAULT_COLOR_SETTINGS);
  const [poiFilters, setPoiFilters] = useState({ Park: false, Marina: false, Ferry: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bottomDrawerOpen, setBottomDrawerOpen] = useState(false);
  const [analysisTab, setAnalysisTab] = useState<ViewabilityAnalysisTab>("conditions");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const mapMode: ViewabilityMapMode = selectedSourceCellId ? "source-inspector" : "overview";

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

    Promise.all([
      loadSourceTargetVisibility(selectedSourceCellId ?? undefined),
      loadSourceCellConditions(selectedSourceCellId ?? undefined, selectedDateOrPeriod),
      loadSourceCellTimeSeries(selectedSourceCellId ?? undefined),
    ])
      .then(([visibility, conditions, timeSeries]) => {
        if (cancelled) return;
        setSourceTargetVisibility(visibility);
        setSelectedSourceConditions(conditions);
        setSelectedSourceTimeSeries(timeSeries);
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        setSourceTargetVisibility([]);
        setSelectedSourceConditions(null);
        setSelectedSourceTimeSeries([]);
        setError(reason instanceof Error ? reason.message : "Selected source viewability failed to load.");
      });

    return () => {
      cancelled = true;
    };
  }, [selectedDateOrPeriod, selectedSourceCellId]);

  const selectedSourceSummary = useMemo<ViewabilitySourceFeature | null>(() => {
    if (!selectedSourceCellId) return null;
    return sourceCells?.features.find((feature) => feature.properties.h3 === selectedSourceCellId) ?? null;
  }, [selectedSourceCellId, sourceCells]);

  const selectedVisibility = useMemo(() => {
    if (!selectedSourceCellId) return [];

    const modifierByTargetH3 = new Map(
      (targetCells?.features ?? []).map((feature) => [
        feature.properties.h3,
        targetDynamicModifier(feature.properties),
      ])
    );

    return sourceTargetVisibility
      .filter((record) => record.source_h3 === selectedSourceCellId)
      .map((record) => {
        const baseWeight = finiteNumber(record.source_target_weight) ?? 0;
        const modifier = modifierByTargetH3.get(record.target_h3) ?? 1;
        const dynamicWeight = clamp01(baseWeight * modifier);
        return {
          ...record,
          base_source_target_weight: baseWeight,
          dynamic_source_target_weight: dynamicWeight,
          source_target_modifier: modifier,
          source_target_weight: scoreType === "dynamic" ? dynamicWeight : baseWeight,
        };
      });
  }, [scoreType, selectedSourceCellId, sourceTargetVisibility, targetCells]);

  const selectSourceCell = useCallback((sourceCellId: string) => {
    setSelectedSourceCellId(sourceCellId);
    setBottomDrawerOpen(true);
    setAnalysisTab("source");
  }, []);

  const resetSelection = useCallback(() => {
    setSelectedSourceCellId(null);
    setSelectedSourceConditions(null);
    setSelectedSourceTimeSeries([]);
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
    selectedSourceSummary,
    selectedSourceConditions,
    selectedSourceTimeSeries,
    selectedVisibility,
    areaConditions,
    colorScaleSettings,
    poiFilters,
    loading,
    error,
    targetCells,
    sourceCells,
    sourceTargetVisibility,
    bottomDrawerOpen,
    setBottomDrawerOpen,
    analysisTab,
    setAnalysisTab,
    settingsOpen,
    setSettingsOpen,
    toggleTargetCells: () => setShowTargetCells((value) => !value),
    toggleSourceCells: () => setShowSourceCells((value) => !value),
    selectSourceCell,
    resetSelection,
    setColorScale,
    togglePoiAll,
    togglePoiType,
  };
}
