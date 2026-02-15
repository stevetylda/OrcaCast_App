import { useEffect, useMemo, useRef, useState, lazy, Suspense } from "react";
import { AppHeader } from "../components/AppHeader";
import { AppFooter } from "../components/AppFooter";
import { ToolDrawer } from "../components/ToolDrawer";
import { WelcomeModal } from "../components/WelcomeModal";

import { ForecastMap } from "../components/ForecastMap";
import { SwipeComparePills } from "../components/Compare/SwipeComparePills";
import { DualMapCompare } from "../components/Compare/DualMapCompare";
import { SingleSwipeMap } from "../components/Compare/SingleSwipeMap";
// import { InfoModal } from "../components/InfoModal";
// import { TimeseriesModal } from "../components/modals/TimeseriesModal";

// const ForecastMap = lazy(() =>
//   import("../components/ForecastMap").then((m) => ({ default: m.ForecastMap }))
// );

const InfoModal = lazy(() =>
  import("../components/InfoModal").then((m) => ({ default: m.InfoModal }))
);

const TimeseriesModal = lazy(() =>
  import("../components/modals/TimeseriesModal").then((m) => ({ default: m.TimeseriesModal }))
);


import { appConfig, formatForecastPeriod } from "../config/appConfig";
import { getForecastPathForPeriod } from "../config/dataPaths";
import type { H3Resolution } from "../config/dataPaths";
import {
  forecastPeriodToIsoWeek,
  forecastPeriodToIsoWeekYear,
  isoWeekFromDate,
  isoWeekYearFromDate,
  isoWeekToDateRange,
} from "../core/time/forecastPeriodToIsoWeek";
import { loadPeriods } from "../data/periods";
import { loadActualActivitySeries, loadExpectedCountSeries } from "../data/expectedCount";
import { loadForecast, loadForecastModelIds, loadGrid } from "../data/forecastIO";
import type { ModelInfo } from "../features/models/data/dummyModels";
import type { Period } from "../data/periods";
import { useMenu } from "../state/MenuContext";
import { useMapState } from "../state/MapStateContext";
import { startMapTour } from "../tour/startMapTour";
import { DEFAULT_PALETTE_ID } from "../constants/palettes";
import {
  DEFAULT_DELTA_LEGEND,
  LruCache,
  buildDeltaCacheKey,
  buildDeltaFillExpr,
  computeDeltaPercentilesByCell,
} from "../map/deltaMap";
import "../features/models/models.css";

type LastWeekMode = "none" | "previous" | "selected" | "both";
type NonNoneLastWeekMode = Exclude<LastWeekMode, "none">;
type DeltaMapData = {
  deltaByCell: Record<string, number>;
  valueAByCell: Record<string, number>;
  valueBByCell: Record<string, number>;
  percentileAByCell: Record<string, number>;
  percentileBByCell: Record<string, number>;
  domainSize: number;
  deltaMin: number;
  deltaMax: number;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatCellValue(value: number): string {
  if (!Number.isFinite(value)) return "0";
  if (value === 0) return "0";
  if (Math.abs(value) >= 0.1) return value.toFixed(3);
  if (Math.abs(value) >= 0.01) return value.toFixed(4);
  return value.toFixed(5);
}

export function MapPage() {
  const {
    darkMode,
    setThemeMode,
    resolution,
    setResolution,
    modelId,
    setModelId,
    forecastIndex,
    setForecastIndex,
    lastWeekMode,
    setLastWeekMode,
    hotspotsEnabled,
    setHotspotsEnabled,
    hotspotMode,
    setHotspotMode,
    hotspotPercentile,
    setHotspotPercentile,
    compareEnabled,
    setCompareEnabled,
    compareSettings,
    setCompareSettings,
    selectedPaletteId,
    setSelectedPaletteId,
    setSelectedCompareH3,
  } = useMapState();

  const { setMenuOpen } = useMenu();

  const [infoOpen, setInfoOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [timeseriesOpen, setTimeseriesOpen] = useState(false);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [hotspotTotalCells, setHotspotTotalCells] = useState<number | null>(null);
  const [poiFilters, setPoiFilters] = useState({
    Park: false,
    Marina: false,
    Ferry: false,
  });
  const [modelOptions, setModelOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [compareModelA, setCompareModelA] = useState("");
  const [compareModelB, setCompareModelB] = useState("");
  const [comparePeriodA, setComparePeriodA] = useState("");
  const [comparePeriodB, setComparePeriodB] = useState("");
  const [compareResolutionA, setCompareResolutionA] = useState<H3Resolution>(resolution);
  const [compareResolutionB, setCompareResolutionB] = useState<H3Resolution>(resolution);
  const [mapResizeTick] = useState(0);
  const [compareViewState, setCompareViewState] = useState<{
    center: [number, number];
    zoom: number;
    bearing: number;
    pitch: number;
  } | null>(null);
  const [mapResetNonce, setMapResetNonce] = useState(0);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [deltaMapData, setDeltaMapData] = useState<DeltaMapData | null>(null);
  const [selectedPeriodHasForecast, setSelectedPeriodHasForecast] = useState<boolean | null>(null);
  const [showNoForecastNotice, setShowNoForecastNotice] = useState(false);
  const lastMissingNoticePeriodKeyRef = useRef<string | null>(null);
  const didInitializeForecastIndexRef = useRef(false);
  const deltaCacheRef = useRef(new LruCache<string, DeltaMapData>(20));
  const [expectedSeries, setExpectedSeries] = useState<
    Array<{
      year: number;
      stat_week: number;
      expected_count: number;
      lower_ci?: number;
      upper_ci?: number;
      typical_error?: number;
    }>
  >([]);
  const [actualSeries, setActualSeries] = useState<
    Array<{ year: number; stat_week: number; actual_count: number }>
  >([]);

  const modelVersion = useMemo(() => "vPhase2", []);
  const showLastWeek = lastWeekMode !== "none";
  const configForecastWeek = useMemo(
    () => forecastPeriodToIsoWeek(appConfig.forecastPeriod),
    []
  );
  const configForecastYear = useMemo(
    () => forecastPeriodToIsoWeekYear(appConfig.forecastPeriod),
    []
  );
  const configPeriod = useMemo<Period>(() => {
    const range = isoWeekToDateRange(configForecastYear, configForecastWeek);
    return {
      year: configForecastYear,
      stat_week: configForecastWeek,
      label: `${range.start} → ${range.end}`,
      periodKey: `${configForecastYear}-${String(configForecastWeek).padStart(2, "0")}`,
      fileId: `${configForecastYear}_${configForecastWeek}`,
    };
  }, [configForecastYear, configForecastWeek]);

  const buildPeriod = (year: number, statWeek: number): Period => {
    const range = isoWeekToDateRange(year, statWeek);
    return {
      year,
      stat_week: statWeek,
      label: `${range.start} → ${range.end}`,
      periodKey: `${year}-${String(statWeek).padStart(2, "0")}`,
      fileId: `${year}_${statWeek}`,
    };
  };

  const comparePeriods = (
    a: Pick<Period, "year" | "stat_week">,
    b: Pick<Period, "year" | "stat_week">
  ) => (a.year - b.year) || (a.stat_week - b.stat_week);

  const shiftIsoWeek = (year: number, statWeek: number, weekOffset: number) => {
    const start = isoWeekToDateRange(year, statWeek).start;
    const baseDate = new Date(`${start}T00:00:00Z`);
    baseDate.setUTCDate(baseDate.getUTCDate() + weekOffset * 7);
    return {
      year: isoWeekYearFromDate(baseDate),
      statWeek: isoWeekFromDate(baseDate),
    };
  };

  const fillToConfiguredPeriod = (list: Period[]): Period[] => {
    const byKey = new Map<string, Period>();
    list.forEach((p) => byKey.set(p.periodKey, p));

    const sortedExisting = Array.from(byKey.values()).sort(comparePeriods);
    if (sortedExisting.length === 0) return [configPeriod];

    const earliestExisting = sortedExisting[0];
    const latestExisting = sortedExisting[sortedExisting.length - 1];

    byKey.set(configPeriod.periodKey, configPeriod);

    const start =
      comparePeriods(configPeriod, earliestExisting) < 0 ? configPeriod : earliestExisting;
    const end = comparePeriods(configPeriod, latestExisting) > 0 ? configPeriod : latestExisting;

    let cursorYear = start.year;
    let cursorWeek = start.stat_week;
    while (comparePeriods({ year: cursorYear, stat_week: cursorWeek }, end) <= 0) {
      const period = buildPeriod(cursorYear, cursorWeek);
      if (!byKey.has(period.periodKey)) byKey.set(period.periodKey, period);
      const next = shiftIsoWeek(cursorYear, cursorWeek, 1);
      cursorYear = next.year;
      cursorWeek = next.statWeek;
    }

    return Array.from(byKey.values()).sort(comparePeriods);
  };

  useEffect(() => {
    const seen = localStorage.getItem("orcacast.welcome.seen");
    if (!seen) {
      setWelcomeOpen(true);
      localStorage.setItem("orcacast.welcome.seen", "true");
    }
  }, []);

  useEffect(() => {
    let active = true;
    loadPeriods()
      .then((list) => {
        if (!active) return;
        const merged = fillToConfiguredPeriod(list);
        const configuredIndex = merged.findIndex(
          (p) => p.year === configPeriod.year && p.stat_week === configPeriod.stat_week
        );
        setPeriods(merged);
        if (!didInitializeForecastIndexRef.current) {
          didInitializeForecastIndexRef.current = true;
          setForecastIndex(Math.max(0, configuredIndex));
        } else if (merged.length > 0) {
          setForecastIndex((idx) => (idx >= merged.length ? merged.length - 1 : idx));
        }
      })
      .catch(() => {
        if (!active) return;
        setPeriods([configPeriod]);
        if (!didInitializeForecastIndexRef.current) {
          didInitializeForecastIndexRef.current = true;
          setForecastIndex(0);
        } else {
          setForecastIndex((idx) => (idx < 0 ? 0 : idx));
        }
      });

    return () => {
      active = false;
    };
  }, [configPeriod, setForecastIndex]);

  useEffect(() => {
    if (periods.length === 0) return;
    setForecastIndex((idx) => (idx >= periods.length ? periods.length - 1 : idx));
  }, [periods, setForecastIndex]);

  const selectedForecast = useMemo(
    () => (forecastIndex >= 0 && forecastIndex < periods.length ? periods[forecastIndex] : null),
    [forecastIndex, periods]
  );
  const selectedPeriodKeyForNotice = selectedForecast?.periodKey ?? configPeriod.periodKey;
  const selectedPeriodYear = selectedForecast?.year ?? configPeriod.year;
  const selectedPeriodWeek = selectedForecast?.stat_week ?? configPeriod.stat_week;

  const forecastPeriodText = useMemo(
    () => selectedForecast?.label ?? formatForecastPeriod(appConfig.forecastPeriod),
    [selectedForecast]
  );

  const forecastPath = useMemo(
    () =>
      selectedForecast ? getForecastPathForPeriod(resolution, selectedForecast.fileId) : undefined,
    [resolution, selectedForecast]
  );

  const latestForecastPath = useMemo(() => {
    if (periods.length === 0) return undefined;
    const latest = periods[periods.length - 1];
    return getForecastPathForPeriod(resolution, latest.fileId);
  }, [periods, resolution]);

  useEffect(() => {
    let active = true;
    Promise.all([
      loadExpectedCountSeries(resolution).catch(() => []),
      loadActualActivitySeries(resolution).catch(() => []),
    ])
      .then(([expectedRows, actualRows]) => {
        if (!active) return;
        setExpectedSeries(expectedRows);
        setActualSeries(actualRows);
      })
      .catch(() => {
        if (!active) return;
        setExpectedSeries([]);
        setActualSeries([]);
      });
    return () => {
      active = false;
    };
  }, [resolution]);

  const expectedSummary = useMemo(() => {
    const keyFor = (year: number, statWeek: number) => `${year}-${String(statWeek).padStart(2, "0")}`;
    const lookup = new Map<
      string,
      { expected_count: number; lower_ci?: number; upper_ci?: number; typical_error?: number }
    >();
    expectedSeries.forEach((row) => {
      lookup.set(keyFor(row.year, row.stat_week), {
        expected_count: row.expected_count,
        lower_ci: row.lower_ci,
        upper_ci: row.upper_ci,
        typical_error: row.typical_error,
      });
    });
    const actualLookup = new Map<string, number>();
    actualSeries.forEach((row) => {
      actualLookup.set(keyFor(row.year, row.stat_week), row.actual_count);
    });

    const selectedKey = keyFor(selectedPeriodYear, selectedPeriodWeek);
    const selectedForecast = lookup.get(selectedKey);
    const current = selectedForecast?.expected_count ?? null;
    const previous = shiftIsoWeek(selectedPeriodYear, selectedPeriodWeek, -1);
    const previousValue = actualLookup.get(keyFor(previous.year, previous.statWeek)) ?? null;

    const baselineWeeks = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
      .map((n) => shiftIsoWeek(selectedPeriodYear, selectedPeriodWeek, -n))
      .map((wk) => actualLookup.get(keyFor(wk.year, wk.statWeek)))
      .filter((v): v is number => v !== undefined);
    const vs12WeekAvg =
      baselineWeeks.length > 0
        ? baselineWeeks.reduce((sum, value) => sum + value, 0) / baselineWeeks.length
        : null;

    let trend: "up" | "down" | "steady" | "none" = "none";
    if (current !== null && previousValue !== null) {
      if (current > previousValue) trend = "up";
      else if (current < previousValue) trend = "down";
      else trend = "steady";
    }

    const last12Actual = [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]
      .map((n) => shiftIsoWeek(selectedPeriodYear, selectedPeriodWeek, -n))
      .map((wk) => actualLookup.get(keyFor(wk.year, wk.statWeek)))
      .filter((v): v is number => v !== undefined);
    const chartValues = current !== null ? [...last12Actual, current] : last12Actual;
    const forecastIndex = chartValues.length > 0 && current !== null ? chartValues.length - 1 : -1;

    const ciLow = current !== null ? Math.max(0, current - 6) : undefined;
    const ciHigh = current !== null ? current + 6 : undefined;

    return {
      current,
      vsPriorWeek: previousValue,
      vs12WeekAvg,
      trend,
      chartValues,
      forecastIndex,
      ciLow,
      ciHigh,
    };
  }, [actualSeries, expectedSeries, selectedPeriodWeek, selectedPeriodYear]);

  useEffect(() => {
    let active = true;

    const toLabel = (value: string) =>
      value
        .replace(/_/g, " ")
        .replace(/\b\w/g, (match) => match.toUpperCase());

    const loadModels = async () => {
      try {
        let ids: string[] = [];
        let hasForecastForSelectedPeriod: boolean | null = null;

        if (forecastPath) {
          try {
            await loadForecast(resolution, {
              kind: "explicit",
              explicitPath: forecastPath,
              modelId,
            });
            hasForecastForSelectedPeriod = true;
            ids = await loadForecastModelIds(resolution, {
              kind: "explicit",
              explicitPath: forecastPath,
            });
          } catch {
            hasForecastForSelectedPeriod = false;
          }
        }
        if (ids.length === 0 && latestForecastPath && latestForecastPath !== forecastPath) {
          try {
            ids = await loadForecastModelIds(resolution, {
              kind: "explicit",
              explicitPath: latestForecastPath,
            });
          } catch {
            ids = [];
          }
        }
        if (!active) return;
        setSelectedPeriodHasForecast(hasForecastForSelectedPeriod);
        const unique = Array.from(new Set(ids.filter((id) => Boolean(id?.trim()))));
        const options = unique.map((id) => ({ value: id, label: toLabel(id) }));
        setModelOptions(options);

        if (options.length > 0) {
          const hasCurrent = options.some((opt) => opt.value === modelId);
          if (!hasCurrent) {
            const best = options.find((opt) => opt.value === appConfig.bestModelId);
            setModelId(best?.value ?? options[0].value);
          }
        }
      } catch {
        if (!active) return;
        setSelectedPeriodHasForecast(false);
        setModelOptions([]);
      }
    };

    loadModels();
    return () => {
      active = false;
    };
  }, [forecastPath, latestForecastPath, resolution, modelId, setModelId]);

  useEffect(() => {
    if (selectedPeriodHasForecast === true) {
      lastMissingNoticePeriodKeyRef.current = null;
      setShowNoForecastNotice(false);
      return;
    }
    if (selectedPeriodHasForecast !== false) {
      setShowNoForecastNotice(false);
      return;
    }
    if (lastMissingNoticePeriodKeyRef.current === selectedPeriodKeyForNotice) return;
    lastMissingNoticePeriodKeyRef.current = selectedPeriodKeyForNotice;
    setShowNoForecastNotice(true);
    const timeoutId = window.setTimeout(() => {
      setShowNoForecastNotice(false);
    }, 3200);
    return () => window.clearTimeout(timeoutId);
  }, [selectedPeriodHasForecast, selectedPeriodKeyForNotice]);

  const compareModels = useMemo<ModelInfo[]>(
    () =>
      modelOptions.map((option) => ({
        id: option.value,
        name: option.label,
        family: "baseline",
        tags: [],
        hero: { label: "", value: "" },
        rows: [],
        blurb: "",
      })),
    [modelOptions]
  );

  useEffect(() => {
    if (modelOptions.length === 0) return;
    setCompareModelA((prev) => prev || modelOptions[0].value);
    setCompareModelB((prev) => prev || modelOptions[Math.min(1, modelOptions.length - 1)].value);
  }, [modelOptions]);

  useEffect(() => {
    if (periods.length === 0) return;
    setComparePeriodA((prev) => prev || periods[periods.length - 1].periodKey);
    setComparePeriodB((prev) => prev || periods[Math.max(0, periods.length - 2)].periodKey);
  }, [periods]);

  useEffect(() => {
    if (compareEnabled) return;
    setCompareResolutionA(resolution);
    setCompareResolutionB(resolution);
  }, [compareEnabled, resolution]);

  const periodOptions = useMemo(() => periods.map((p) => p.periodKey), [periods]);
  const compareDisabled = modelOptions.length === 0 || periods.length === 0;
  const compareDisabledReason = compareDisabled ? "Compare will enable after forecast options load" : undefined;
  const compareModelIds = useMemo(() => compareModels.map((model) => model.id), [compareModels]);
  const resolvedCompareModelA = useMemo(() => {
    if (compareModelIds.length === 0) return "";
    if (compareModelIds.includes(compareModelA)) return compareModelA;
    if (compareModelIds.includes(modelId)) return modelId;
    return compareModelIds[0];
  }, [compareModelIds, compareModelA, modelId]);
  const resolvedCompareModelB = useMemo(() => {
    if (compareModelIds.length === 0) return "";
    if (compareModelIds.includes(compareModelB)) return compareModelB;
    const fallback =
      compareModelIds.length > 1 && compareModelIds[1] !== resolvedCompareModelA
        ? compareModelIds[1]
        : compareModelIds[0];
    return fallback;
  }, [compareModelIds, compareModelB, resolvedCompareModelA]);
  const resolvedComparePeriodA = useMemo(() => {
    if (periodOptions.length === 0) return "";
    if (periodOptions.includes(comparePeriodA)) return comparePeriodA;
    return periodOptions[periodOptions.length - 1];
  }, [periodOptions, comparePeriodA]);
  const resolvedComparePeriodB = useMemo(() => {
    if (periodOptions.length === 0) return "";
    if (periodOptions.includes(comparePeriodB)) return comparePeriodB;
    return periodOptions[Math.max(0, periodOptions.length - 2)];
  }, [periodOptions, comparePeriodB]);

  useEffect(() => {
    if (resolvedCompareModelA && compareModelA !== resolvedCompareModelA) {
      setCompareModelA(resolvedCompareModelA);
    }
  }, [compareModelA, resolvedCompareModelA]);

  useEffect(() => {
    if (resolvedCompareModelB && compareModelB !== resolvedCompareModelB) {
      setCompareModelB(resolvedCompareModelB);
    }
  }, [compareModelB, resolvedCompareModelB]);

  useEffect(() => {
    if (resolvedComparePeriodA && comparePeriodA !== resolvedComparePeriodA) {
      setComparePeriodA(resolvedComparePeriodA);
    }
  }, [comparePeriodA, resolvedComparePeriodA]);

  useEffect(() => {
    if (resolvedComparePeriodB && comparePeriodB !== resolvedComparePeriodB) {
      setComparePeriodB(resolvedComparePeriodB);
    }
  }, [comparePeriodB, resolvedComparePeriodB]);

  const resolveForecastPathByPeriodKey = (periodKey: string, targetResolution: H3Resolution) => {
    const period = periods.find((item) => item.periodKey === periodKey);
    if (!period) return undefined;
    return getForecastPathForPeriod(targetResolution, period.fileId);
  };

  const currentWeek = useMemo(
    () => selectedForecast?.stat_week ?? forecastPeriodToIsoWeek(appConfig.forecastPeriod),
    [selectedForecast]
  );

  const currentWeekYear = useMemo(
    () => selectedForecast?.year ?? forecastPeriodToIsoWeekYear(appConfig.forecastPeriod),
    [selectedForecast]
  );

  const comparePeriodAObj = periods.find((p) => p.periodKey === resolvedComparePeriodA) ?? selectedForecast ?? configPeriod;
  const comparePeriodBObj = periods.find((p) => p.periodKey === resolvedComparePeriodB) ?? selectedForecast ?? configPeriod;
  const deltaMode = compareEnabled && compareSettings.showDelta;
  const effectiveCompareResolutionB = deltaMode ? compareResolutionA : compareResolutionB;
  const comparePathA = resolveForecastPathByPeriodKey(comparePeriodAObj.periodKey, compareResolutionA);
  const comparePathB = resolveForecastPathByPeriodKey(comparePeriodBObj.periodKey, effectiveCompareResolutionB);
  const deltaFillExpr = useMemo(() => buildDeltaFillExpr("delta_pctl"), []);
  const compareRenderMode: "single" | "dual" | "delta" = compareEnabled
    ? deltaMode
      ? "delta"
      : compareSettings.dualMapMode
        ? "dual"
        : "single"
    : "single";
  const syncEnabled = true;
  const deltaCellPopupHtmlBuilder = useMemo(() => {
    if (!deltaMapData) return undefined;
    return (cellId: string) => {
      const valueA = Number(deltaMapData.valueAByCell[cellId] ?? 0);
      const valueB = Number(deltaMapData.valueBByCell[cellId] ?? 0);
      const pA = Number(deltaMapData.percentileAByCell[cellId] ?? 0.5);
      const pB = Number(deltaMapData.percentileBByCell[cellId] ?? 0.5);
      const delta = Number(deltaMapData.deltaByCell[cellId] ?? 0);

      const modelA = escapeHtml(resolvedCompareModelA || modelId);
      const modelB = escapeHtml(resolvedCompareModelB || modelId);

      return `
        <div class="sparkPopup">
          <div class="sparkPopup__title">Cell ${escapeHtml(cellId)}</div>
          <div class="sparkPopup__meta">A (${modelA}): value ${formatCellValue(valueA)} · percentile ${(pA * 100).toFixed(1)}%</div>
          <div class="sparkPopup__meta">B (${modelB}): value ${formatCellValue(valueB)} · percentile ${(pB * 100).toFixed(1)}%</div>
          <div class="sparkPopup__meta">Δ Percentile (A − B): ${delta.toFixed(3)}</div>
        </div>
      `;
    };
  }, [deltaMapData, modelId, resolvedCompareModelA, resolvedCompareModelB]);

  useEffect(() => {
    if (!compareEnabled || !deltaMode) return;
    if (compareResolutionB !== compareResolutionA) {
      setCompareResolutionB(compareResolutionA);
    }
  }, [compareEnabled, compareResolutionA, compareResolutionB, deltaMode]);

  useEffect(() => {
    if (!compareEnabled || !deltaMode) {
      setDeltaMapData(null);
      return;
    }

    let active = true;

    const computeDelta = async () => {
      const cacheKey = buildDeltaCacheKey({
        weekA: comparePeriodAObj.periodKey,
        weekB: comparePeriodBObj.periodKey,
        resolutionA: compareResolutionA,
        resolutionB: effectiveCompareResolutionB,
        modelA: resolvedCompareModelA || modelId,
        modelB: resolvedCompareModelB || modelId,
      });

      const cached = deltaCacheRef.current.get(cacheKey);
      if (cached) {
        setDeltaMapData(cached);
        return;
      }

      const [gridA, forecastA, forecastB] = await Promise.all([
        loadGrid(compareResolutionA),
        comparePathA
          ? loadForecast(compareResolutionA, {
              kind: "explicit",
              explicitPath: comparePathA,
              modelId: resolvedCompareModelA || modelId,
            }).catch(() => ({ values: {} }))
          : Promise.resolve({ values: {} }),
        comparePathB
          ? loadForecast(effectiveCompareResolutionB, {
              kind: "explicit",
              explicitPath: comparePathB,
              modelId: resolvedCompareModelB || modelId,
            }).catch(() => ({ values: {} }))
          : Promise.resolve({ values: {} }),
      ]);

      if (!active) return;

      const valuesA = forecastA.values ?? {};
      const valuesB = forecastB.values ?? {};
      const domainCellIds = new Set<string>();
      // Use visible A-grid cells plus all A/B value keys so both layers rank against one shared domain.
      // Missing values are interpreted as 0 by the rank transform utility.
      (gridA.features ?? []).forEach((feature) => {
        const props = (feature.properties ?? {}) as Record<string, unknown>;
        const cellIdRaw = props.h3 ?? props.H3 ?? props.h3_id ?? props.H3_ID;
        const cellId = String(cellIdRaw ?? "");
        if (cellId) domainCellIds.add(cellId);
      });
      Object.keys(valuesA).forEach((id) => domainCellIds.add(id));
      Object.keys(valuesB).forEach((id) => domainCellIds.add(id));

      const delta = computeDeltaPercentilesByCell(valuesA, valuesB, Array.from(domainCellIds));
      const result: DeltaMapData = {
        deltaByCell: delta.deltaByCell,
        valueAByCell: valuesA,
        valueBByCell: valuesB,
        percentileAByCell: delta.percentileA,
        percentileBByCell: delta.percentileB,
        domainSize: delta.domainSize,
        deltaMin: delta.deltaMin,
        deltaMax: delta.deltaMax,
      };
      deltaCacheRef.current.set(cacheKey, result);
      setDeltaMapData(result);
    };

    computeDelta().catch((err) => {
      if (!active) return;
      // eslint-disable-next-line no-console
      console.warn("[DeltaMap] Failed to compute delta layer", err);
      setDeltaMapData(null);
    });

    return () => {
      active = false;
    };
  }, [
    compareEnabled,
    comparePathA,
    comparePathB,
    comparePeriodAObj.periodKey,
    comparePeriodBObj.periodKey,
    compareResolutionA,
    effectiveCompareResolutionB,
    deltaMode,
    modelId,
    resolvedCompareModelA,
    resolvedCompareModelB,
  ]);

  const handleResetMap = () => {
    setCompareEnabled(false);
    setCompareViewState(null);
    setToolsOpen(false);
    setTimeseriesOpen(false);

    setResolution("H4");
    setModelId(appConfig.bestModelId);
    setLastWeekMode("none");
    setHotspotsEnabled(false);
    setHotspotMode("modeled");
    setHotspotPercentile(1);
    setSelectedPaletteId(DEFAULT_PALETTE_ID);
    setPoiFilters({ Park: false, Marina: false, Ferry: false });
    setSelectedCompareH3(null);

    setCompareModelA("");
    setCompareModelB("");
    setComparePeriodA("");
    setComparePeriodB("");
    setCompareResolutionA("H4");
    setCompareResolutionB("H4");

    const configuredIndex = periods.findIndex(
      (p) => p.year === configPeriod.year && p.stat_week === configPeriod.stat_week
    );
    setForecastIndex(configuredIndex >= 0 ? configuredIndex : 0);
    setMapResetNonce((prev) => prev + 1);
  };

  useEffect(() => {
    if (!compareSettings.sharedScale) return;
    setCompareSettings((prev) => ({ ...prev, sharedScale: false }));
  }, [compareSettings.sharedScale, setCompareSettings]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const id = window.setTimeout(() => {
      const count = document.querySelectorAll(".maplibregl-canvas").length;
      if (compareRenderMode === "dual" && count < 2) {
        throw new Error(`DualMapCompare invariant failed: expected 2 canvases, found ${count}`);
      }
      // eslint-disable-next-line no-console
      console.info(`[CompareDebug] mode=${compareRenderMode} canvases=${count}`);
    }, 250);
    return () => window.clearTimeout(id);
  }, [compareRenderMode, compareEnabled, compareModelA, compareModelB, comparePeriodA, comparePeriodB]);

  return (
    <>
      <AppHeader
        title="OrcaCast"
        subtitle="Orca Sightings Forecast"
        forecastPeriods={periods}
        forecastIndex={Math.max(0, forecastIndex)}
        onForecastIndexChange={setForecastIndex}
        expectedActivityCount={expectedSummary.current}
        expectedActivityVsPriorWeek={expectedSummary.vsPriorWeek}
        expectedActivityVs12WeekAvg={expectedSummary.vs12WeekAvg}
        expectedActivityTrend={expectedSummary.trend}
        expectedActivityChart={{
          values: expectedSummary.chartValues,
          forecastIndex: expectedSummary.forecastIndex,
          ciLow: expectedSummary.ciLow,
          ciHigh: expectedSummary.ciHigh,
        }}
        showForecastNotice={showNoForecastNotice}
        forecastNoticeText="Forecast data is not available for the selected period."
        resolution={resolution}
        onResolutionChange={setResolution}
        darkMode={darkMode}
        onToggleDarkMode={() => setThemeMode(darkMode ? "light" : "dark")}
        onOpenInfo={() => setInfoOpen(true)}
        onOpenMenu={() => setMenuOpen(true)}
        onBrandClick={handleResetMap}
        compareEnabled={compareEnabled}
        onExitCompareMode={() => setCompareEnabled(false)}
      />

      <main className="app__main">
        {/* <Suspense fallback={<div className="mapStage mapLoading">Loading map…</div>}> */}
        {!compareEnabled ? (
          <ForecastMap
            key={`map-main-${selectedPaletteId}-${mapResetNonce}`}
            darkMode={darkMode}
            paletteId={selectedPaletteId}
            resolution={resolution}
            showLastWeek={showLastWeek}
            lastWeekMode={lastWeekMode}
            poiFilters={poiFilters}
            modelId={modelId}
            periods={periods}
            selectedWeek={currentWeek}
            selectedWeekYear={currentWeekYear}
            timeseriesOpen={timeseriesOpen}
            hotspotsEnabled={hotspotsEnabled}
            hotspotMode={hotspotMode}
            hotspotPercentile={hotspotPercentile}
            hotspotModeledCount={expectedSummary.current}
            onHotspotsEnabledChange={setHotspotsEnabled}
            onGridCellCount={setHotspotTotalCells}
            onGridCellSelect={setSelectedCompareH3}
            forecastPath={forecastPath}
          />
        ) : (
          <div className="compareModeStage compareModeStage--map">
            {compareRenderMode === "delta" ? (
              <div className="compareMapPane">
                <ForecastMap
                  key={`map-delta-${selectedPaletteId}-${mapResetNonce}-${comparePeriodAObj.periodKey}-${comparePeriodBObj.periodKey}-${compareResolutionA}-${effectiveCompareResolutionB}-${resolvedCompareModelA}-${resolvedCompareModelB}`}
                  darkMode={darkMode}
                  paletteId={selectedPaletteId}
                  resolution={compareResolutionA}
                  showLastWeek={showLastWeek}
                  lastWeekMode={lastWeekMode}
                  poiFilters={poiFilters}
                  modelId={resolvedCompareModelA || modelId}
                  periods={periods}
                  selectedWeek={comparePeriodAObj.stat_week}
                  selectedWeekYear={comparePeriodAObj.year}
                  timeseriesOpen={timeseriesOpen}
                  hotspotsEnabled={hotspotsEnabled}
                  hotspotMode={hotspotMode}
                  hotspotPercentile={hotspotPercentile}
                  hotspotModeledCount={expectedSummary.current}
                  onHotspotsEnabledChange={setHotspotsEnabled}
                  onGridCellCount={setHotspotTotalCells}
                  onGridCellSelect={setSelectedCompareH3}
                  resizeTick={mapResizeTick}
                  derivedValuesByCell={deltaMapData?.deltaByCell ?? {}}
                  derivedValueProperty="delta_pctl"
                  derivedFillExpr={deltaFillExpr}
                  deltaLegend={DEFAULT_DELTA_LEGEND}
                  disableHotspots
                  enableSparklinePopup={false}
                  cellPopupHtmlBuilder={deltaCellPopupHtmlBuilder}
                  useExternalColorScale={false}
                  syncViewState={syncEnabled ? compareViewState : null}
                  onMoveViewState={setCompareViewState}
                  onMoveEndViewState={setCompareViewState}
                />
              </div>
            ) : compareRenderMode === "dual" ? (
              <DualMapCompare
                childrenLeft={
                  <div className="compareMapPane">
                    <ForecastMap
                      key={`map-dual-a-${selectedPaletteId}-${mapResetNonce}`}
                      darkMode={darkMode}
                      paletteId={selectedPaletteId}
                      resolution={compareResolutionA}
                      showLastWeek={showLastWeek}
                      lastWeekMode={lastWeekMode}
                      poiFilters={poiFilters}
                      modelId={resolvedCompareModelA || modelId}
                      periods={periods}
                      selectedWeek={comparePeriodAObj.stat_week}
                      selectedWeekYear={comparePeriodAObj.year}
                      timeseriesOpen={timeseriesOpen}
                      hotspotsEnabled={hotspotsEnabled}
                      hotspotMode={hotspotMode}
                      hotspotPercentile={hotspotPercentile}
                      hotspotModeledCount={expectedSummary.current}
                      onHotspotsEnabledChange={setHotspotsEnabled}
                      onGridCellCount={setHotspotTotalCells}
                      onGridCellSelect={setSelectedCompareH3}
                      resizeTick={mapResizeTick}
                      forecastPath={comparePathA}
                      useExternalColorScale={false}
                      syncViewState={syncEnabled ? compareViewState : null}
                      onMoveViewState={setCompareViewState}
                      onMoveEndViewState={setCompareViewState}
                    />
                  </div>
                }
                childrenRight={
                  <div className="compareMapPane">
                    <ForecastMap
                      key={`map-dual-b-${selectedPaletteId}-${mapResetNonce}`}
                      darkMode={darkMode}
                      paletteId={selectedPaletteId}
                      resolution={compareResolutionB}
                      showLastWeek={showLastWeek}
                      lastWeekMode={lastWeekMode}
                      poiFilters={poiFilters}
                      modelId={resolvedCompareModelB || modelId}
                      periods={periods}
                      selectedWeek={comparePeriodBObj.stat_week}
                      selectedWeekYear={comparePeriodBObj.year}
                      timeseriesOpen={timeseriesOpen}
                      hotspotsEnabled={hotspotsEnabled}
                      hotspotMode={hotspotMode}
                      hotspotPercentile={hotspotPercentile}
                      hotspotModeledCount={expectedSummary.current}
                      onHotspotsEnabledChange={setHotspotsEnabled}
                      onGridCellCount={setHotspotTotalCells}
                      onGridCellSelect={setSelectedCompareH3}
                      resizeTick={mapResizeTick}
                      forecastPath={comparePathB}
                      useExternalColorScale={false}
                      syncViewState={syncEnabled ? compareViewState : null}
                      onMoveViewState={setCompareViewState}
                      onMoveEndViewState={setCompareViewState}
                    />
                  </div>
                }
              />
            ) : (
              <SingleSwipeMap
                splitPct={compareSettings.splitPct}
                onSplitCommit={(pct) => setCompareSettings((prev) => ({ ...prev, splitPct: pct }))}
                childrenLeft={
                  <div className="compareMapPane">
                    <ForecastMap
                      key={`map-swipe-a-${selectedPaletteId}-${mapResetNonce}`}
                      darkMode={darkMode}
                      paletteId={selectedPaletteId}
                      resolution={compareResolutionA}
                      showLastWeek={showLastWeek}
                      lastWeekMode={lastWeekMode}
                      poiFilters={poiFilters}
                      modelId={resolvedCompareModelA || modelId}
                      periods={periods}
                      selectedWeek={comparePeriodAObj.stat_week}
                      selectedWeekYear={comparePeriodAObj.year}
                      timeseriesOpen={timeseriesOpen}
                      hotspotsEnabled={hotspotsEnabled}
                      hotspotMode={hotspotMode}
                      hotspotPercentile={hotspotPercentile}
                      hotspotModeledCount={expectedSummary.current}
                      onHotspotsEnabledChange={setHotspotsEnabled}
                      onGridCellCount={setHotspotTotalCells}
                      onGridCellSelect={setSelectedCompareH3}
                      resizeTick={mapResizeTick}
                      forecastPath={comparePathA}
                      useExternalColorScale={false}
                      syncViewState={syncEnabled ? compareViewState : null}
                      onMoveEndViewState={setCompareViewState}
                    />
                  </div>
                }
                childrenRight={
                  <div className="compareMapPane">
                    <ForecastMap
                      key={`map-swipe-b-${selectedPaletteId}-${mapResetNonce}`}
                      darkMode={darkMode}
                      paletteId={selectedPaletteId}
                      resolution={compareResolutionB}
                      showLastWeek={showLastWeek}
                      lastWeekMode={lastWeekMode}
                      poiFilters={poiFilters}
                      modelId={resolvedCompareModelB || modelId}
                      periods={periods}
                      selectedWeek={comparePeriodBObj.stat_week}
                      selectedWeekYear={comparePeriodBObj.year}
                      timeseriesOpen={timeseriesOpen}
                      hotspotsEnabled={hotspotsEnabled}
                      hotspotMode={hotspotMode}
                      hotspotPercentile={hotspotPercentile}
                      hotspotModeledCount={expectedSummary.current}
                      onHotspotsEnabledChange={setHotspotsEnabled}
                      onGridCellCount={setHotspotTotalCells}
                      onGridCellSelect={setSelectedCompareH3}
                      resizeTick={mapResizeTick}
                      forecastPath={comparePathB}
                      useExternalColorScale={false}
                      syncViewState={syncEnabled ? compareViewState : null}
                      onMoveEndViewState={setCompareViewState}
                    />
                  </div>
                }
              />
            )}

            <SwipeComparePills
              modelLeftId={resolvedCompareModelA || modelId}
              modelRightId={resolvedCompareModelB || modelId}
              periodLeft={comparePeriodAObj.periodKey}
              periodRight={comparePeriodBObj.periodKey}
              resolutionLeft={compareResolutionA}
              resolutionRight={effectiveCompareResolutionB}
              periodOptions={periodOptions}
              models={compareModels}
              dualMapMode={compareSettings.dualMapMode}
              deltaMode={deltaMode}
              onChangeModelLeft={setCompareModelA}
              onChangeModelRight={setCompareModelB}
              onChangePeriodLeft={setComparePeriodA}
              onChangePeriodRight={setComparePeriodB}
              onChangeResolutionLeft={(next) => {
                setCompareResolutionA(next);
                if (deltaMode) setCompareResolutionB(next);
              }}
              onChangeResolutionRight={setCompareResolutionB}
              onToggleDeltaMode={() =>
                setCompareSettings((prev) => ({
                  ...prev,
                  showDelta: !prev.showDelta,
                }))
              }
              onToggleLocked={() =>
                setCompareSettings((prev) => ({
                  ...prev,
                  dualMapMode: !prev.dualMapMode,
                  splitPct: !prev.dualMapMode ? 50 : prev.splitPct,
                }))
              }
            />
          </div>
        )}
        {/* </Suspense> */}


        <ToolDrawer
          open={toolsOpen}
          onToggle={() => setToolsOpen((v) => !v)}
          onClose={() => setToolsOpen(false)}
          onSelectLastWeek={(mode: NonNoneLastWeekMode) => {
            // ✅ setLastWeekMode in your context appears to accept a VALUE, not an updater fn.
            // So compute next from current `lastWeekMode` in scope.
            const prev = lastWeekMode as LastWeekMode;

            let next: LastWeekMode;
            if (prev === "none") next = mode;
            else if (prev === mode) next = "none";
            else if (prev === "both") next = mode === "previous" ? "selected" : "previous";
            else next = "both";

            setLastWeekMode(next);
          }}
          lastWeekMode={lastWeekMode}
          showLastWeek={showLastWeek}
          hotspotsEnabled={hotspotsEnabled}
          onHotspotsEnabledChange={setHotspotsEnabled}
          hotspotMode={hotspotMode}
          onHotspotModeChange={setHotspotMode}
          hotspotPercentile={hotspotPercentile}
          onHotspotPercentileChange={setHotspotPercentile}
          hotspotTotalCells={hotspotTotalCells}
          hotspotModeledCount={expectedSummary.current}
          onOpenTimeseries={() => setTimeseriesOpen(true)}
          poiFilters={poiFilters}
          onTogglePoiAll={() =>
            setPoiFilters((prev) => {
              const allOn = prev.Park && prev.Marina && prev.Ferry;
              return { Park: !allOn, Marina: !allOn, Ferry: !allOn };
            })
          }
          onTogglePoiType={(type) =>
            setPoiFilters((prev) => ({ ...prev, [type]: !prev[type] }))
          }
          compareEnabled={compareEnabled}
          compareDisabled={compareDisabled}
          compareDisabledReason={compareDisabledReason}
          selectedPaletteId={selectedPaletteId}
          onPaletteChange={setSelectedPaletteId}
          onToggleCompare={() => {
            if (!compareEnabled) {
              setCompareResolutionA(resolution);
              setCompareResolutionB(resolution);
            }
            setCompareEnabled(!compareEnabled);
          }}
        />

        <div className="app__footer">
          <AppFooter
            modelVersion={modelVersion}
            modelId={modelId}
            modelOptions={modelOptions}
            onModelChange={setModelId}
            compareEnabled={compareEnabled}
          />
        </div>
      </main>

      <Suspense fallback={<div className="modalLoading">Loading…</div>}>
        {welcomeOpen && (
          <WelcomeModal
            open={welcomeOpen}
            onClose={() => setWelcomeOpen(false)}
            onStartTour={() => startMapTour()}
            onLearnMore={() => {
              setWelcomeOpen(false);
              setInfoOpen(true);
            }}
          />
        )}

        {infoOpen && (
          <InfoModal
            open={infoOpen}
            onClose={() => setInfoOpen(false)}
            onStartTour={() => startMapTour()}
          />
        )}

        {timeseriesOpen && (
          <TimeseriesModal
            open={timeseriesOpen}
            onClose={() => setTimeseriesOpen(false)}
            darkMode={darkMode}
            currentWeek={currentWeek}
            forecastPeriodLabel={forecastPeriodText}
            forecastPath={forecastPath}
            resolution={resolution}
          />
        )}
      </Suspense>


    </>
  );
}
