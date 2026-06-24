import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  SourceCellConditions,
  SourceCellTimeSeriesPoint,
  SourceTargetVisibilityRecord,
  ViewabilityColorScaleSettings,
  ViewabilityMapMode,
  ViewabilityScoreType,
  ViewabilitySightingsBin,
  ViewabilitySourceFeature,
  ViewabilitySourceFeatureCollection,
  ViewabilityTargetFeatureCollection,
} from "../../data/viewabilityTypes";
import {
  loadSourceCellConditions,
  loadSourceCellTimeSeries,
  loadSourceTargetVisibility,
  loadViewabilitySightingsBins,
  loadViewabilitySourceCells,
  loadViewabilityTargetCells,
} from "../../data/viewabilityIO";

export type ViewabilityPageController = ReturnType<typeof useViewabilityPageController>;

const DEFAULT_COLOR_SETTINGS: ViewabilityColorScaleSettings = {
  paletteId: "orcacast_classic",
  normalizeValues: true,
  reversePalette: false,
};

export function useViewabilityPageController() {
  const [selectedDateOrPeriod, setSelectedDateOrPeriod] = useState("2026-05-04 -> 2026-05-10");
  const [scoreType, setScoreType] = useState<ViewabilityScoreType>("dynamic");
  const [showTargetCells, setShowTargetCells] = useState(true);
  const [showSourceCells, setShowSourceCells] = useState(true);
  const [selectedSourceCellId, setSelectedSourceCellId] = useState<string | null>(null);
  const [targetCells, setTargetCells] = useState<ViewabilityTargetFeatureCollection | null>(null);
  const [sourceCells, setSourceCells] = useState<ViewabilitySourceFeatureCollection | null>(null);
  const [sourceTargetVisibility, setSourceTargetVisibility] = useState<SourceTargetVisibilityRecord[]>([]);
  const [selectedSourceConditions, setSelectedSourceConditions] = useState<SourceCellConditions | null>(null);
  const [selectedSourceTimeSeries, setSelectedSourceTimeSeries] = useState<SourceCellTimeSeriesPoint[]>([]);
  const [relationshipBins, setRelationshipBins] = useState<ViewabilitySightingsBin[]>([]);
  const [colorScaleSettings, setColorScaleSettings] = useState<ViewabilityColorScaleSettings>(DEFAULT_COLOR_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bottomDrawerOpen, setBottomDrawerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const mapMode: ViewabilityMapMode = selectedSourceCellId ? "source-inspector" : "overview";

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      loadViewabilityTargetCells(),
      loadViewabilitySourceCells(),
      loadSourceTargetVisibility(),
      loadViewabilitySightingsBins(),
    ])
      .then(([targets, sources, visibility, bins]) => {
        if (cancelled) return;
        setTargetCells(targets);
        setSourceCells(sources);
        setSourceTargetVisibility(visibility);
        setRelationshipBins(bins);
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
  }, []);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      loadSourceCellConditions(selectedSourceCellId ?? undefined),
      loadSourceCellTimeSeries(selectedSourceCellId ?? undefined),
    ]).then(([conditions, timeSeries]) => {
      if (cancelled) return;
      setSelectedSourceConditions(conditions);
      setSelectedSourceTimeSeries(timeSeries);
    });

    return () => {
      cancelled = true;
    };
  }, [selectedSourceCellId]);

  const selectedSourceSummary = useMemo<ViewabilitySourceFeature | null>(() => {
    if (!selectedSourceCellId) return null;
    return sourceCells?.features.find((feature) => feature.properties.h3 === selectedSourceCellId) ?? null;
  }, [selectedSourceCellId, sourceCells]);

  const selectedVisibility = useMemo(
    () =>
      selectedSourceCellId
        ? sourceTargetVisibility.filter((record) => record.source_h3 === selectedSourceCellId)
        : [],
    [selectedSourceCellId, sourceTargetVisibility]
  );

  const selectSourceCell = useCallback((sourceCellId: string) => {
    setSelectedSourceCellId(sourceCellId);
  }, []);

  const resetSelection = useCallback(() => {
    setSelectedSourceCellId(null);
    setSelectedSourceConditions(null);
    setSelectedSourceTimeSeries([]);
  }, []);

  const setColorScale = useCallback((next: Partial<ViewabilityColorScaleSettings>) => {
    setColorScaleSettings((current) => ({ ...current, ...next }));
  }, []);

  return {
    selectedDateOrPeriod,
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
    relationshipBins,
    colorScaleSettings,
    loading,
    error,
    targetCells,
    sourceCells,
    sourceTargetVisibility,
    bottomDrawerOpen,
    setBottomDrawerOpen,
    settingsOpen,
    setSettingsOpen,
    toggleTargetCells: () => setShowTargetCells((value) => !value),
    toggleSourceCells: () => setShowSourceCells((value) => !value),
    selectSourceCell,
    resetSelection,
    setColorScale,
  };
}
