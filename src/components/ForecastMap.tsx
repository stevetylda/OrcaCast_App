import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { Map as MapLibreMap } from "maplibre-gl";
import type { FeatureCollection } from "geojson";
import { GeoJsonLayer } from "@deck.gl/layers";
import { MapboxOverlay } from "@deck.gl/mapbox";
import "maplibre-gl/dist/maplibre-gl.css";
import { appConfig } from "../config/appConfig";
import type { H3Resolution } from "../config/dataPaths";
import { getForecastPathForPeriod, getKdeBandsPathForPeriod } from "../config/dataPaths";
import { attachProbabilities, loadForecast, loadGrid } from "../data/forecastIO";
import { buildKdeBandsCacheKey, loadKdeBandsGeojson } from "../data/kdeBandsIO";
import type { Period } from "../data/periods";
import {
  addGridOverlay,
  setGridHoverCell,
  setGridBaseVisibility,
  setGridVisibility,
  setHotspotVisibility,
} from "../map/gridOverlay";
import {
  buildAutoColorExprFromValues,
  buildFillExprFromScale,
  buildHotspotOnlyExpr,
  ZERO_COLOR,
} from "../map/colorScale";
import type { HeatScale } from "../map/colorScale";
import { isoWeekFromDate } from "../core/time/forecastPeriodToIsoWeek";
import { isoWeekToDateRange } from "../core/time/forecastPeriodToIsoWeek";
import { ProbabilityLegend } from "./ProbabilityLegend";
import type { DataDrivenPropertyValueSpecification } from "maplibre-gl";
import { getPaletteOrDefault, type PaletteId } from "../constants/palettes";
import type { DeltaLegendSpec } from "../map/deltaMap";

type FillColorSpec = DataDrivenPropertyValueSpecification<string>;
type LastWeekMode = "none" | "previous" | "selected" | "both";
type LngLat = [number, number];
type SparklineSeries = { forecast: number[]; sightings: number[] };

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatModelLabel(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function getFeatureCellId(feature: { properties?: Record<string, unknown> } | undefined): string {
  const props = feature?.properties as Record<string, unknown> | undefined;
  const cellIdRaw = props?.h3 ?? props?.H3 ?? props?.h3_id ?? props?.H3_ID ?? "";
  return String(cellIdRaw || "");
}

function pointInRing([lng, lat]: LngLat, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = Number(ring[i]?.[0]);
    const yi = Number(ring[i]?.[1]);
    const xj = Number(ring[j]?.[0]);
    const yj = Number(ring[j]?.[1]);
    const intersects =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / ((yj - yi) || Number.EPSILON) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function pointInPolygon([lng, lat]: LngLat, rings: number[][][]): boolean {
  if (rings.length === 0) return false;
  if (!pointInRing([lng, lat], rings[0])) return false;
  for (let i = 1; i < rings.length; i += 1) {
    if (pointInRing([lng, lat], rings[i])) return false;
  }
  return true;
}

function extractCellPolygons(cellId: string, fc: FeatureCollection | null): number[][][][] {
  if (!fc) return [];
  for (const feature of fc.features ?? []) {
    const featureCellId = getFeatureCellId(feature as { properties?: Record<string, unknown> });
    if (!featureCellId || featureCellId !== cellId) continue;
    const geometry = feature.geometry;
    if (!geometry) return [];
    if (geometry.type === "Polygon") {
      return [geometry.coordinates as number[][][]];
    }
    if (geometry.type === "MultiPolygon") {
      return geometry.coordinates as number[][][][];
    }
    return [];
  }
  return [];
}

function withBase(url: string): string {
  const base = import.meta.env.BASE_URL || "/";
  const normalized = base.endsWith("/") ? base : `${base}/`;
  const trimmed = url.startsWith("/") ? url.slice(1) : url;
  return `${normalized}${trimmed}`;
}

async function loadWeeklySightingPoints(year: number, week: number): Promise<LngLat[]> {
  const response = await fetch(
    withBase(`data/last_week_sightings/last_week_sightings_${year}-W${week}.geojson`),
    { cache: "force-cache" }
  );
  if (!response.ok) return [];
  const payload = (await response.json()) as FeatureCollection;
  const points: LngLat[] = [];
  for (const feature of payload.features ?? []) {
    if (feature.geometry?.type === "Point") {
      const [lng, lat] = feature.geometry.coordinates as number[];
      if (Number.isFinite(lng) && Number.isFinite(lat)) {
        points.push([lng, lat]);
        continue;
      }
    }
    const props = feature.properties as Record<string, unknown> | null;
    const lng = Number(props?.LONGITUDE);
    const lat = Number(props?.LATITUDE);
    if (Number.isFinite(lng) && Number.isFinite(lat)) points.push([lng, lat]);
  }
  return points;
}

function buildSparklineSvg(
  values: number[],
  sightings: number[],
  selectedIndex: number,
  periods: Period[],
  width = 270,
  height = 72
): string {
  const paddingLeft = 6;
  const paddingRight = 20;
  const paddingY = 6;
  const labelHeight = 12;
  const innerW = Math.max(1, width - paddingLeft - paddingRight);
  const chartTop = paddingY;
  const chartBottom = height - paddingY - labelHeight;
  const chartRight = width - paddingRight;
  const innerH = Math.max(1, chartBottom - chartTop);
  const safeValues = values.map((v) => (Number.isFinite(v) ? v : 0));
  const safeSightings = sightings.map((v) => (v >= 1 ? 1 : 0));
  const max = safeValues.length ? Math.max(...safeValues) : 0;
  const min = safeValues.length ? Math.min(...safeValues) : 0;
  const range = max - min || 1;

  const step = safeValues.length > 1 ? innerW / (safeValues.length - 1) : 0;
  const points = safeValues.map((v, i) => {
    const x = paddingLeft + step * i;
    const t = (v - min) / range;
    const y = chartTop + innerH * (1 - t);
    return [x, y] as const;
  });
  const sightingPoints = safeSightings.map((v, i) => {
    const x = paddingLeft + step * i;
    const y = v >= 1 ? chartTop : chartBottom;
    return [x, y] as const;
  });

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const sightingsPath = sightingPoints
    .map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`)
    .join(" ");
  const marker =
    selectedIndex >= 0 && selectedIndex < points.length
      ? points[selectedIndex]
      : null;

  const markerX =
    selectedIndex >= 0 && selectedIndex < points.length
      ? (paddingLeft + step * selectedIndex).toFixed(1)
      : null;

  const axisY = chartBottom + 3;
  const weekTicks = periods.map((period, i) => ({
    x: paddingLeft + step * i,
    label: String(period.stat_week),
  }));
  const monthTicks: Array<{ x: number; label: string }> = [];
  let lastMonth = -1;
  let lastYear = -1;
  periods.forEach((period, i) => {
    const range = isoWeekToDateRange(period.year, period.stat_week);
    const date = new Date(`${range.start}T00:00:00Z`);
    const month = date.getUTCMonth();
    const year = date.getUTCFullYear();
    if (month !== lastMonth || year !== lastYear) {
      monthTicks.push({ x: paddingLeft + step * i, label: String(month + 1) });
      lastMonth = month;
      lastYear = year;
    }
  });

  return `
    <svg class="sparkPopup__chart" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="Forecast probability with sightings line">
      ${markerX ? `<line class="sparkPopup__current" x1="${markerX}" x2="${markerX}" y1="${chartTop}" y2="${chartBottom}" />` : ""}
      <path class="sparkPopup__lineSightings" d="${sightingsPath}" />
      <path class="sparkPopup__line" d="${path}" />
      ${marker ? `<circle class="sparkPopup__dot" cx="${marker[0].toFixed(1)}" cy="${marker[1].toFixed(1)}" r="2.4" />` : ""}
      <line class="sparkPopup__axisLine" x1="${paddingLeft}" x2="${chartRight}" y1="${axisY}" y2="${axisY}" />
      <line class="sparkPopup__axisRight" x1="${chartRight}" x2="${chartRight}" y1="${chartTop}" y2="${chartBottom}" />
      <text class="sparkPopup__axisLabelRight" x="${(chartRight + 4).toFixed(1)}" y="${(chartTop + 3).toFixed(1)}">1</text>
      <text class="sparkPopup__axisLabelRight" x="${(chartRight + 4).toFixed(1)}" y="${(chartBottom + 3).toFixed(1)}">0</text>
      ${monthTicks
        .map(
          (tick) => `
        <text class="sparkPopup__axisLabelMonth" x="${tick.x.toFixed(1)}" y="${(chartTop - 1).toFixed(1)}" text-anchor="middle">${tick.label}</text>
      `.trim()
        )
        .join("")}
      ${weekTicks
        .map(
          (tick) => `
        <line class="sparkPopup__axisTick" x1="${tick.x.toFixed(1)}" x2="${tick.x.toFixed(1)}" y1="${axisY}" y2="${axisY + 3}" />
        <text class="sparkPopup__axisLabelWeek" x="${tick.x.toFixed(1)}" y="${height - paddingY}" text-anchor="middle">${tick.label}</text>
      `.trim()
        )
        .join("")}
    </svg>
  `.trim();
}

type CompareMapViewState = {
  center: [number, number];
  zoom: number;
  bearing: number;
  pitch: number;
};

type Props = {
  darkMode: boolean;
  paletteId: PaletteId;
  resolution: H3Resolution;
  showLastWeek: boolean;
  lastWeekMode: LastWeekMode;
  poiFilters: { Park: boolean; Marina: boolean; Ferry: boolean };
  modelId: string;
  periods: Period[];
  selectedWeek: number;
  selectedWeekYear: number;
  timeseriesOpen: boolean;
  hotspotsEnabled: boolean;
  hotspotMode: "modeled" | "custom";
  hotspotPercentile: number;
  hotspotModeledCount: number | null;
  onHotspotsEnabledChange: (next: boolean) => void;
  onGridCellCount?: (count: number) => void;
  onGridCellSelect?: (h3: string) => void;
  resizeTick?: number;
  forecastPath?: string;
  fallbackForecastPath?: string;
  colorScaleValues?: Record<string, number>;
  useExternalColorScale?: boolean;
  derivedValuesByCell?: Record<string, number>;
  derivedValueProperty?: string;
  derivedFillExpr?: unknown[];
  deltaLegend?: DeltaLegendSpec | null;
  disableHotspots?: boolean;
  enableSparklinePopup?: boolean;
  cellPopupHtmlBuilder?: (cellId: string) => string | null | undefined;
  syncViewState?: CompareMapViewState | null;
  onMoveViewState?: (viewState: CompareMapViewState) => void;
  onMoveEndViewState?: (viewState: CompareMapViewState) => void;
};

const VOYAGER_STYLE = "https://tiles.stadiamaps.com/styles/alidade_smooth.json";
const DARK_STYLE = "https://tiles.stadiamaps.com/styles/alidade_smooth_dark.json";
const KDE_ENABLED = false;
const BASEMAP_TINT_SOURCE_ID = "orcacast-basemap-tint-source";
const BASEMAP_TINT_LAYER_ID = "orcacast-basemap-tint-layer";
const DARK_LABEL_OPACITY = 0.86;

function applyBasemapVisualTuning(map: MapLibreMap, isDarkBasemap: boolean) {
  const style = map.getStyle();
  const layers = style?.layers ?? [];
  if (layers.length === 0) return;

  if (isDarkBasemap) {
    const firstSymbolLayerId = layers.find((layer) => layer.type === "symbol")?.id;
    if (!map.getSource(BASEMAP_TINT_SOURCE_ID)) {
      map.addSource(BASEMAP_TINT_SOURCE_ID, {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "Polygon",
                coordinates: [
                  [
                    [-180, -85],
                    [180, -85],
                    [180, 85],
                    [-180, 85],
                    [-180, -85],
                  ],
                ],
              },
            },
          ],
        },
      });
    }
    if (!map.getLayer(BASEMAP_TINT_LAYER_ID)) {
      map.addLayer(
        {
          id: BASEMAP_TINT_LAYER_ID,
          type: "fill",
          source: BASEMAP_TINT_SOURCE_ID,
          paint: {
            "fill-color": "#3a4148",
            "fill-opacity": 0.14,
          },
        },
        firstSymbolLayerId
      );
    } else {
      map.setPaintProperty(BASEMAP_TINT_LAYER_ID, "fill-color", "#3a4148");
      map.setPaintProperty(BASEMAP_TINT_LAYER_ID, "fill-opacity", 0.14);
      if (firstSymbolLayerId) {
        map.moveLayer(BASEMAP_TINT_LAYER_ID, firstSymbolLayerId);
      }
    }
  } else {
    if (map.getLayer(BASEMAP_TINT_LAYER_ID)) {
      map.removeLayer(BASEMAP_TINT_LAYER_ID);
    }
    if (map.getSource(BASEMAP_TINT_SOURCE_ID)) {
      map.removeSource(BASEMAP_TINT_SOURCE_ID);
    }
  }

  layers.forEach((layer) => {
    if (layer.type === "symbol") {
      const layout = (layer as { layout?: Record<string, unknown> }).layout ?? {};
      const hasText = "text-field" in layout;
      const hasIcon = "icon-image" in layout;
      if (hasText) {
        map.setPaintProperty(layer.id, "text-opacity", isDarkBasemap ? DARK_LABEL_OPACITY : 1);
      }
      if (hasIcon) {
        map.setPaintProperty(layer.id, "icon-opacity", isDarkBasemap ? 0.92 : 1);
      }
      return;
    }

    if (layer.type === "raster") {
      map.setPaintProperty(layer.id, "raster-saturation", isDarkBasemap ? -0.2 : 0);
      map.setPaintProperty(layer.id, "raster-brightness-min", isDarkBasemap ? 0.02 : 0);
      map.setPaintProperty(layer.id, "raster-brightness-max", isDarkBasemap ? 0.92 : 1);
      map.setPaintProperty(layer.id, "raster-contrast", isDarkBasemap ? -0.06 : 0);
    }
  });
}

const DEFAULT_CENTER: [number, number] = [-122.6, 47.6];
const DEFAULT_ZOOM = 7;

const LAST_WEEK_SOURCE_ID = "last-week-sightings";
const LAST_WEEK_LAYER_ID = "last-week-sightings-circle";
const LAST_WEEK_HALO_ID = "last-week-sightings-halo";
const LAST_WEEK_RING_ID = "last-week-sightings-ring";
const LAST_WEEK_WHITE_ID = "last-week-sightings-white";

export function ForecastMap({
  darkMode,
  paletteId,
  resolution,
  showLastWeek,
  lastWeekMode,
  poiFilters,
  modelId,
  periods,
  selectedWeek,
  selectedWeekYear,
  timeseriesOpen,
  hotspotsEnabled,
  hotspotMode,
  hotspotPercentile,
  hotspotModeledCount,
  onHotspotsEnabledChange,
  onGridCellCount,
  onGridCellSelect,
  resizeTick,
  forecastPath,
  fallbackForecastPath,
  colorScaleValues,
  useExternalColorScale = false,
  derivedValuesByCell,
  derivedValueProperty = "prob",
  derivedFillExpr,
  deltaLegend = null,
  disableHotspots = false,
  enableSparklinePopup = true,
  cellPopupHtmlBuilder,
  syncViewState,
  onMoveViewState,
  onMoveEndViewState,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const styleUrl = useMemo(() => (darkMode ? DARK_STYLE : VOYAGER_STYLE), [darkMode]);
  const activePalette = useMemo(() => getPaletteOrDefault(paletteId), [paletteId]);
  const gridBorderColor = useMemo(
    () => (darkMode ? "rgba(8,18,44,0.22)" : "rgba(20,42,78,0.16)"),
    [darkMode]
  );
  const overlayRef = useRef<FeatureCollection | null>(null);
  const fillExprRef = useRef<FillColorSpec | null>(null);
  const hotspotThresholdRef = useRef<number | undefined>(undefined);
  const modeledHotspotThresholdRef = useRef<number | undefined>(undefined);
  const modeledHotspotCountRef = useRef<number | null>(hotspotModeledCount);
  const valuesByCellRef = useRef<Record<string, number>>({});
  const colorScaleValuesRef = useRef<Record<string, number> | undefined>(colorScaleValues);
  const derivedValuePropertyRef = useRef(derivedValueProperty);
  const derivedFillExprRef = useRef<FillColorSpec | undefined>(derivedFillExpr as FillColorSpec | undefined);
  const sortedValuesDescRef = useRef<number[]>([]);
  const totalCellsRef = useRef(0);
  const shimmerThresholdRef = useRef<number | undefined>(undefined);
  const [legendSpec, setLegendSpec] = useState<HeatScale | null>(null);
  const [legendOpen, setLegendOpen] = useState(false);
  const [showKdeContours, setShowKdeContours] = useState(false);
  const [kdeBands, setKdeBands] = useState<FeatureCollection | null>(null);
  const [kdeWarning, setKdeWarning] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const legendSpecRef = useRef<HeatScale | null>(null);
  const poiMarkersRef = useRef<maplibregl.Marker[]>([]);
  const poiLoadedRef = useRef(false);
  const poiDataRef = useRef<
    | Array<{
        type: string;
        name: string;
        latitude: number;
        longitude: number;
      }>
    | null
  >(null);
  const hotspotsOnlyRef = useRef(false);
  const showKdeContoursRef = useRef(false);
  const hasForecastLegend = legendSpec !== null || deltaLegend !== null;
  const showLastWeekRef = useRef(false);
  const lastWeekKeyRef = useRef<string | null>(null);
  const lastWeekModeRef = useRef<LastWeekMode>(lastWeekMode);
  const selectedWeekRef = useRef(selectedWeek);
  const selectedWeekYearRef = useRef(selectedWeekYear);
  const styleUrlRef = useRef(styleUrl);
  const activeStyleUrlRef = useRef(styleUrl);
  const lastWeekDataRef = useRef<Record<string, FeatureCollection | null>>({});
  const lastWeekPopupRef = useRef<maplibregl.Popup | null>(null);
  const deckOverlayRef = useRef<MapboxOverlay | null>(null);
  const sparkPopupRef = useRef<maplibregl.Popup | null>(null);
  const sparkRequestIdRef = useRef(0);
  const hoveredCellRef = useRef<string | null>(null);
  const periodsRef = useRef<Period[]>(periods);
  const modelIdRef = useRef(modelId);
  const resolutionRef = useRef(resolution);
  const sparklineCacheRef = useRef<Map<string, SparklineSeries>>(new Map());
  const sightingsWeekCacheRef = useRef<Map<string, LngLat[]>>(new Map());
  const DEBUG_MAP =
    import.meta.env.DEV &&
    typeof window !== "undefined" &&
    ((window as { __ORCACAST_DEBUG_MAP?: boolean }).__ORCACAST_DEBUG_MAP === true ||
      window.localStorage?.getItem("orcacast.debug.map") === "true");

  const logMapDebug = (label: string) => {
    if (!DEBUG_MAP) return;
    const el = containerRef.current;
    if (!el) {
      // eslint-disable-next-line no-console
      console.info("[MapDebug]", label, { container: "missing" });
      return;
    }
    const rect = el.getBoundingClientRect();
    const hasCanvas = !!el.querySelector("canvas");
    const styleLoaded = mapRef.current?.isStyleLoaded();
    // eslint-disable-next-line no-console
    console.info("[MapDebug]", label, { rect, hasCanvas, styleLoaded });
  };

  useEffect(() => {
    styleUrlRef.current = styleUrl;
  }, [styleUrl]);

  useEffect(() => {
    colorScaleValuesRef.current = colorScaleValues;
  }, [colorScaleValues]);

  useEffect(() => {
    derivedValuePropertyRef.current = derivedValueProperty;
  }, [derivedValueProperty]);

  useEffect(() => {
    derivedFillExprRef.current = derivedFillExpr as FillColorSpec | undefined;
  }, [derivedFillExpr]);

  useEffect(() => {
    legendSpecRef.current = legendSpec;
  }, [legendSpec]);

  const resolveHotspotThreshold = () => {
    const modeled = modeledHotspotThresholdRef.current ?? hotspotThresholdRef.current;
    if (hotspotMode !== "custom") {
      const values = sortedValuesDescRef.current;
      const modeledCount = modeledHotspotCountRef.current;
      if (values.length > 0 && modeledCount !== null && Number.isFinite(modeledCount) && modeledCount > 0) {
        const count = Math.max(1, Math.round(modeledCount));
        const idx = Math.max(0, Math.min(values.length - 1, count - 1));
        return values[idx] ?? modeled;
      }
      return modeled;
    }
    const values = sortedValuesDescRef.current;
    const total = totalCellsRef.current;
    if (values.length === 0 || total === 0) return modeled;
    const clamped = Math.min(Math.max(hotspotPercentile, 0), 100);
    const count = Math.max(1, Math.round((total * clamped) / 100));
    const idx = Math.max(0, Math.min(values.length - 1, count - 1));
    return values[idx] ?? modeled;
  };

  const applyScaleToCurrentValues = (values: Record<string, number>) => {
    const scaleSourceValues =
      useExternalColorScale && colorScaleValuesRef.current && Object.keys(colorScaleValuesRef.current).length > 0
        ? colorScaleValuesRef.current
        : values;
    const { fillColorExpr, scale } = buildAutoColorExprFromValues(scaleSourceValues, activePalette.colors);
    const valueList = Object.values(values)
      .map((v) => Number(v))
      .filter((v) => Number.isFinite(v) && v > 0)
      .sort((a, b) => a - b);
    fillExprRef.current = fillColorExpr as unknown as FillColorSpec;
    legendSpecRef.current = scale;
    setLegendSpec(scale);
    modeledHotspotThresholdRef.current =
      scale?.hotspotThreshold ?? (valueList.length > 0 ? Math.max(...valueList) : undefined);
    hotspotThresholdRef.current = modeledHotspotThresholdRef.current;
    if (valueList.length > 0) {
      const idx = Math.max(0, Math.floor(valueList.length * 0.95) - 1);
      shimmerThresholdRef.current = valueList[idx];
    } else {
      shimmerThresholdRef.current = undefined;
    }
    if (!scale) {
      setLegendOpen(false);
    }
    return scale;
  };

  const scheduleForecastRender = (map: MapLibreMap, isCancelled?: () => boolean) => {
    let attempts = 0;
    let timeoutId: number | null = null;
    let done = false;

    const cleanup = () => {
      map.off("styledata", tryRender);
      map.off("load", tryRender);
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    const tryRender = () => {
      if (done) return;
      if (isCancelled?.()) {
        done = true;
        cleanup();
        return;
      }
      if (!overlayRef.current || !mapRef.current) return;
      if (!map.isStyleLoaded()) return;
      done = true;
      cleanup();
      renderForecastLayer(map);
      moveLastWeekToTop(map);
    };

    const poll = () => {
      if (done) return;
      tryRender();
      if (done) return;
      attempts += 1;
      if (attempts > 300) {
        cleanup();
        return;
      }
      timeoutId = window.setTimeout(poll, 60);
    };

    map.on("styledata", tryRender);
    map.on("load", tryRender);
    poll();
  };

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const showPoi = poiFilters.Park || poiFilters.Marina || poiFilters.Ferry;
    if (!showPoi) {
      poiMarkersRef.current.forEach((marker) => marker.remove());
      poiMarkersRef.current = [];
      return;
    }

    const loadPoi = async () => {
      if (poiLoadedRef.current && poiDataRef.current) return poiDataRef.current;
      const base = import.meta.env.BASE_URL || "/";
      const normalizedBase = base.endsWith("/") ? base : `${base}/`;
      const candidates = Array.from(
        new Set([
          `${normalizedBase}data/places_of_interest.json`,
          "/data/places_of_interest.json",
          "data/places_of_interest.json",
        ])
      );

      let lastError: Error | null = null;
      for (const url of candidates) {
        try {
          const response = await fetch(url);
          if (!response.ok) {
            lastError = new Error(`Failed to load POI data from ${url}: ${response.status}`);
            continue;
          }
          const payload = (await response.json()) as
            | { items?: Array<{ type: string; name: string; latitude: number; longitude: number }> }
            | Array<{ type: string; name: string; latitude: number; longitude: number }>
            | {
                features?: Array<{
                  properties?: Record<string, unknown>;
                  geometry?: { coordinates?: [number, number] };
                }>;
              };

          let items: Array<{ type: string; name: string; latitude: number; longitude: number }> = [];
          if (Array.isArray(payload)) {
            items = payload.map((entry) => ({
              type: String((entry as { type?: string }).type ?? ""),
              name: String((entry as { name?: string }).name ?? "POI"),
              latitude: Number((entry as { latitude?: number }).latitude),
              longitude: Number((entry as { longitude?: number }).longitude),
            }));
          } else if ("items" in payload && Array.isArray(payload.items)) {
            items = payload.items.map((entry) => ({
              type: String(entry.type ?? ""),
              name: String(entry.name ?? "POI"),
              latitude: Number(entry.latitude),
              longitude: Number(entry.longitude),
            }));
          } else if ("features" in payload && Array.isArray(payload.features)) {
            items = payload.features.map((feature) => {
              const props = feature.properties ?? {};
              const coordinates = feature.geometry?.coordinates ?? [Number.NaN, Number.NaN];
              const [lng, lat] = coordinates;
              return {
                type: String(props.type ?? props.category ?? ""),
                name: String(props.name ?? "POI"),
                latitude: Number(lat),
                longitude: Number(lng),
              };
            });
          }

          poiLoadedRef.current = true;
          poiDataRef.current = items;
          // eslint-disable-next-line no-console
          console.info(`[POI] loaded ${items.length} items from ${url}`);
          return poiDataRef.current;
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
        }
      }
      throw lastError ?? new Error("Failed to load POI data");
    };

    let cancelled = false;

    const renderPoiMarkers = (items: Array<{ type: string; name: string; latitude: number; longitude: number }>) => {
      if (cancelled || !mapRef.current) return;
        poiMarkersRef.current.forEach((marker) => marker.remove());
        poiMarkersRef.current = [];

        const iconMap: Record<string, string> = {
          Park: "park",
          Marina: "sailing",
          Ferry: "directions_boat",
        };

        const normalizeType = (value: string) => value.trim().toLowerCase();
        const typeToFilterKey = (value: string): keyof typeof poiFilters | null => {
          const normalized = normalizeType(value);
          if (normalized === "park") return "Park";
          if (normalized === "marina") return "Marina";
          if (normalized === "ferry") return "Ferry";
          return null;
        };

        const safeItems = items
          .map((poi) => ({
            ...poi,
            latitude: Number(poi.latitude),
            longitude: Number(poi.longitude),
            filterKey: typeToFilterKey(String(poi.type ?? "")),
          }))
          .filter(
            (poi) =>
              poi.filterKey !== null &&
              Number.isFinite(poi.latitude) &&
              Number.isFinite(poi.longitude)
          );

        const filteredItems = safeItems.filter(
          (poi) => poi.filterKey && (poiFilters[poi.filterKey] ?? false)
        );
        const itemsToRender = filteredItems.length > 0 ? filteredItems : safeItems;
        const markers = itemsToRender
          .map((poi) => {
          const el = document.createElement("button");
          el.type = "button";
          el.className = "poiMarker";
          el.setAttribute("aria-label", poi.name);
          const icon = poi.filterKey ? iconMap[poi.filterKey] : "directions_boat";
          el.innerHTML = `<span class=\"material-symbols-rounded\">${icon}</span>`;

          const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: true }).setHTML(
            `<div class=\"poiPopup\">` +
              `<div class=\"poiPopup__title\">${poi.name}</div>` +
              `<div class=\"poiPopup__meta\">${poi.latitude.toFixed(4)}, ${poi.longitude.toFixed(4)}</div>` +
              `</div>`
          );

          return new maplibregl.Marker({ element: el, anchor: "bottom" })
            .setLngLat([poi.longitude, poi.latitude])
            .setPopup(popup)
            .addTo(map);
        });

      poiMarkersRef.current = markers;
      // eslint-disable-next-line no-console
      console.info(
        `[POI] rendered ${markers.length} markers (valid=${safeItems.length}, matchedFilters=${filteredItems.length})`
      );
    };

    loadPoi()
      .then((items) => {
        if (cancelled || !mapRef.current) return;
        if (!mapRef.current.isStyleLoaded()) {
          mapRef.current.once("load", () => {
            renderPoiMarkers(items);
          });
          return;
        }
        renderPoiMarkers(items);
      })
      .catch((err) => {
        if (cancelled) return;
        // eslint-disable-next-line no-console
        console.warn("[POI] failed to load places_of_interest.json", err);
      });

    return () => {
      cancelled = true;
    };
  }, [poiFilters, styleUrl, mapReady]);

  useEffect(() => {
    hotspotsOnlyRef.current = disableHotspots ? false : hotspotsEnabled;
  }, [hotspotsEnabled, disableHotspots]);

  useEffect(() => {
    showKdeContoursRef.current = KDE_ENABLED && showKdeContours;
  }, [showKdeContours]);

  useEffect(() => {
    if (KDE_ENABLED && showKdeContours) return;
    setKdeBands(null);
    setKdeWarning(null);
  }, [showKdeContours]);

  useEffect(() => {
    showLastWeekRef.current = showLastWeek;
  }, [showLastWeek]);

  useEffect(() => {
    lastWeekModeRef.current = lastWeekMode;
  }, [lastWeekMode]);

  useEffect(() => {
    periodsRef.current = periods;
  }, [periods]);

  useEffect(() => {
    modelIdRef.current = modelId;
  }, [modelId]);

  useEffect(() => {
    resolutionRef.current = resolution;
  }, [resolution]);

  useEffect(() => {
    modeledHotspotCountRef.current = hotspotModeledCount;
  }, [hotspotModeledCount]);


  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (disableHotspots) return;
    renderForecastLayer(map);
  }, [hotspotMode, hotspotPercentile, hotspotModeledCount, hotspotsEnabled, mapReady, disableHotspots]);

  useEffect(() => {
    selectedWeekRef.current = selectedWeek;
    selectedWeekYearRef.current = selectedWeekYear;
  }, [selectedWeek, selectedWeekYear]);

  const applyLastWeekFromCache = (map: MapLibreMap) => {
    if (!showLastWeekRef.current) return;
    const key = lastWeekKeyRef.current;
    if (!key) return;

    const raw = lastWeekDataRef.current[key];
    if (!raw) return;

    const previous = getPreviousWeek(selectedWeekYearRef.current, selectedWeekRef.current);
    const tagged = tagSightings(
      raw,
      lastWeekModeRef.current,
      { year: selectedWeekYearRef.current, week: selectedWeekRef.current },
      previous
    );

    if ((tagged.features ?? []).length === 0) return;
    ensureLastWeekLayer(map, tagged);
    moveLastWeekToTop(map);
  };

  useEffect(() => {
    if (!mapRef.current) return;
    const id = window.requestAnimationFrame(() => {
      mapRef.current?.resize();
    });
    return () => window.cancelAnimationFrame(id);
  }, [resizeTick]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !syncViewState) return;

    const currentCenter = map.getCenter();
    const sameCenter =
      Math.abs(currentCenter.lng - syncViewState.center[0]) < 1e-6 &&
      Math.abs(currentCenter.lat - syncViewState.center[1]) < 1e-6;
    const sameZoom = Math.abs(map.getZoom() - syncViewState.zoom) < 1e-6;
    const sameBearing = Math.abs(map.getBearing() - syncViewState.bearing) < 1e-6;
    const samePitch = Math.abs(map.getPitch() - syncViewState.pitch) < 1e-6;

    if (sameCenter && sameZoom && sameBearing && samePitch) return;

    map.jumpTo({
      center: syncViewState.center,
      zoom: syncViewState.zoom,
      bearing: syncViewState.bearing,
      pitch: syncViewState.pitch,
    });
  }, [syncViewState]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    logMapDebug("before-init");

    // Some MapLibre options exist at runtime but aren't present in the published TS types.
    type MapOptionsPatched = maplibregl.MapOptions & {
      preserveDrawingBuffer?: boolean;
      cooperativeGestures?: boolean;
    };

    const mapOptions: MapOptionsPatched = {
      container: containerRef.current,
      style: styleUrl,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      attributionControl: false,
      preserveDrawingBuffer: false,
      cooperativeGestures: false,
    };

    const map = new maplibregl.Map(mapOptions);

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-left");

    map.on("error", (e: { error?: unknown }) => {
      // eslint-disable-next-line no-console
      console.error("[MapLibre] error:", e?.error || e);
    });

    lastWeekPopupRef.current = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 10,
    });

    const canvas = map.getCanvas();
    const onContextLost = (event: Event) => {
      event.preventDefault();
      // eslint-disable-next-line no-console
      console.warn("[MapLibre] WebGL context lost");
    };
    const onContextRestored = () => {
      // eslint-disable-next-line no-console
      console.warn("[MapLibre] WebGL context restored");
      if (!mapRef.current) return;

      const nextStyle = styleUrlRef.current;
      const center = mapRef.current.getCenter();
      const zoom = mapRef.current.getZoom();
      const bearing = mapRef.current.getBearing();
      const pitch = mapRef.current.getPitch();

      mapRef.current.setStyle(nextStyle);
      activeStyleUrlRef.current = nextStyle;
      mapRef.current.once("styledata", () => {
        if (!mapRef.current) return;
        try {
          mapRef.current.jumpTo({ center, zoom, bearing, pitch });
        } catch {
          // no-op
        }
        applyBasemapVisualTuning(mapRef.current, styleUrlRef.current === DARK_STYLE);
        mapRef.current.resize();
        renderForecastLayer(mapRef.current);
        applyLastWeekFromCache(mapRef.current);
      });
    };

    canvas.addEventListener("webglcontextlost", onContextLost, false);
    canvas.addEventListener("webglcontextrestored", onContextRestored, false);

    const handleSparklineClick = (event: maplibregl.MapMouseEvent) => {
      const features = map.queryRenderedFeatures(event.point, { layers: ["grid-fill"] });
      const feature = features[0];
      if (!feature) return;
      const cellId = getFeatureCellId(feature as { properties?: Record<string, unknown> });
      if (!cellId) return;
      onGridCellSelect?.(cellId);
      if (cellPopupHtmlBuilder) {
        const popupHtml = cellPopupHtmlBuilder(cellId);
        if (popupHtml) {
          if (!sparkPopupRef.current) {
            sparkPopupRef.current = new maplibregl.Popup({
              closeButton: false,
              closeOnClick: true,
              offset: 10,
            });
          }
          sparkPopupRef.current.setLngLat(event.lngLat).setHTML(popupHtml).addTo(map);
          return;
        }
      }
      if (!enableSparklinePopup) return;

      const fullPeriods = periodsRef.current ?? [];
      if (fullPeriods.length === 0) return;

      const selectedFullIndex = fullPeriods.findIndex(
        (p) => p.year === selectedWeekYearRef.current && p.stat_week === selectedWeekRef.current
      );
      const endIndex = selectedFullIndex >= 0 ? selectedFullIndex : fullPeriods.length - 1;
      const startIndex = Math.max(0, endIndex - 11);
      const periodsList = fullPeriods.slice(startIndex, endIndex + 1);
      const selectedIndex =
        selectedFullIndex >= 0 ? selectedFullIndex - startIndex : periodsList.length - 1;

      if (!sparkPopupRef.current) {
        sparkPopupRef.current = new maplibregl.Popup({
          closeButton: false,
          closeOnClick: true,
          offset: 10,
        });
      }

      const modelLabel = formatModelLabel(modelIdRef.current);
      const initialHtml = `
        <div class="sparkPopup">
          <div class="sparkPopup__title">Cell ${escapeHtml(cellId)}</div>
          <div class="sparkPopup__meta">Model: ${escapeHtml(modelLabel)}</div>
          <div class="sparkPopup__seriesMeta">Forecast (cyan) + Sightings 0/1 (amber)</div>
          <div class="sparkPopup__loading">Loading sparkline…</div>
        </div>
      `;

      sparkPopupRef.current.setLngLat(event.lngLat).setHTML(initialHtml).addTo(map);

      const requestId = (sparkRequestIdRef.current += 1);
      const cacheKey = [
        resolutionRef.current,
        modelIdRef.current,
        cellId,
        periodsList.map((p) => p.periodKey).join("|"),
      ].join("|");

      const cached = sparklineCacheRef.current.get(cacheKey);
      if (cached) {
        const svg = buildSparklineSvg(cached.forecast, cached.sightings, selectedIndex, periodsList);
        const html = `
          <div class="sparkPopup">
            <div class="sparkPopup__title">Cell ${escapeHtml(cellId)}</div>
            <div class="sparkPopup__meta">Model: ${escapeHtml(modelLabel)}</div>
            <div class="sparkPopup__seriesMeta">Forecast (cyan) + Sightings 0/1 (amber)</div>
            ${svg}
          </div>
        `;
        sparkPopupRef.current.setHTML(html);
        return;
      }

      const fetchSeries = async (): Promise<SparklineSeries> => {
        const forecastValues = await Promise.all(
          periodsList.map(async (period) => {
            const path = getForecastPathForPeriod(resolutionRef.current, period.fileId);
            try {
              const forecast = await loadForecast(resolutionRef.current, {
                kind: "explicit",
                explicitPath: path,
                modelId: modelIdRef.current,
              });
              const value = Number(forecast.values?.[cellId] ?? 0);
              return Number.isFinite(value) ? value : 0;
            } catch {
              return 0;
            }
          })
        );
        const cellPolygons = extractCellPolygons(cellId, overlayRef.current);
        const sightings =
          cellPolygons.length === 0
            ? periodsList.map(() => 0)
            : await Promise.all(
              periodsList.map(async (period) => {
                  const weekKey = `${period.year}-W${period.stat_week}`;
                  const cachedWeek = sightingsWeekCacheRef.current.get(weekKey);
                  let weekPoints = cachedWeek;
                  if (!weekPoints) {
                    try {
                      weekPoints = await loadWeeklySightingPoints(period.year, period.stat_week);
                    } catch {
                      weekPoints = [];
                    }
                    sightingsWeekCacheRef.current.set(weekKey, weekPoints);
                  }
                  const hasSighting = weekPoints.some((point) =>
                    cellPolygons.some((polygon) => pointInPolygon(point, polygon))
                  );
                  return hasSighting ? 1 : 0;
                })
              );
        return { forecast: forecastValues, sightings };
      };

      fetchSeries()
        .then((series) => {
          if (sparkRequestIdRef.current !== requestId) return;
          sparklineCacheRef.current.set(cacheKey, series);
          const svg = buildSparklineSvg(series.forecast, series.sightings, selectedIndex, periodsList);
          const html = `
            <div class="sparkPopup">
              <div class="sparkPopup__title">Cell ${escapeHtml(cellId)}</div>
              <div class="sparkPopup__meta">Model: ${escapeHtml(modelLabel)}</div>
              <div class="sparkPopup__seriesMeta">Forecast (cyan) + Sightings 0/1 (amber)</div>
              ${svg}
            </div>
          `;
          sparkPopupRef.current?.setHTML(html);
        })
        .catch(() => {
          if (sparkRequestIdRef.current !== requestId) return;
          const html = `
            <div class="sparkPopup">
              <div class="sparkPopup__title">Cell ${escapeHtml(cellId)}</div>
              <div class="sparkPopup__meta">Model: ${escapeHtml(modelLabel)}</div>
              <div class="sparkPopup__seriesMeta">Forecast (cyan) + Sightings 0/1 (amber)</div>
              <div class="sparkPopup__loading">Unable to load sparkline.</div>
            </div>
          `;
          sparkPopupRef.current?.setHTML(html);
        });
    };

    const handleMouseEnter = () => {
      map.getCanvas().style.cursor = "pointer";
    };
    const handleMouseMove = (event: maplibregl.MapMouseEvent) => {
      const features = map.queryRenderedFeatures(event.point, { layers: ["grid-fill"] });
      const cellId = getFeatureCellId(
        features[0] as { properties?: Record<string, unknown> } | undefined
      );
      if (!cellId || hoveredCellRef.current === cellId) return;
      hoveredCellRef.current = cellId;
      setGridHoverCell(map, cellId);
    };
    const handleMouseLeave = () => {
      hoveredCellRef.current = null;
      setGridHoverCell(map, null);
      map.getCanvas().style.cursor = "";
    };

    map.on("click", "grid-fill", handleSparklineClick);
    map.on("mouseenter", "grid-fill", handleMouseEnter);
    map.on("mousemove", "grid-fill", handleMouseMove);
    map.on("mouseleave", "grid-fill", handleMouseLeave);

    map.once("load", () => {
      applyBasemapVisualTuning(map, styleUrlRef.current === DARK_STYLE);
      map.resize();
      logMapDebug("load");
      setMapReady(true);
    });

    const handleStyleData = () => {
      if (!mapRef.current) return;
      applyBasemapVisualTuning(mapRef.current, styleUrlRef.current === DARK_STYLE);
    };
    map.on("styledata", handleStyleData);

    const handleMoveEnd = () => {
      if (!onMoveEndViewState) return;
      const center = map.getCenter();
      onMoveEndViewState({
        center: [center.lng, center.lat],
        zoom: map.getZoom(),
        bearing: map.getBearing(),
        pitch: map.getPitch(),
      });
    };
    const handleMove = () => {
      if (!onMoveViewState) return;
      const center = map.getCenter();
      onMoveViewState({
        center: [center.lng, center.lat],
        zoom: map.getZoom(),
        bearing: map.getBearing(),
        pitch: map.getPitch(),
      });
    };
    map.on("moveend", handleMoveEnd);
    map.on("move", handleMove);

    mapRef.current = map;
    if (import.meta.env.DEV && typeof window !== "undefined") {
      (window as { __ORCACAST_MAP?: MapLibreMap }).__ORCACAST_MAP = map;
    }
    logMapDebug("after-init");

    // Lazy-loaded CSS + flex/grid layouts can report 0px initially; schedule a few resizes.
    const raf = window.requestAnimationFrame(() => map.resize());
    const t1 = window.setTimeout(() => map.resize(), 50);
    const t2 = window.setTimeout(() => map.resize(), 250);
    const t3 = window.setTimeout(() => {
      if (!DEBUG_MAP) return;
      // eslint-disable-next-line no-console
      console.info("[MapDebug] style status", {
        styleLoaded: map.isStyleLoaded(),
        styleName: map.getStyle()?.name ?? null,
      });
    }, 1000);

    if (DEBUG_MAP) {
      map.once("styledata", () => logMapDebug("styledata"));
      map.once("sourcedata", () => logMapDebug("sourcedata"));
      map.once("render", () => logMapDebug("render"));
    }

    const deckOverlay = new MapboxOverlay({ interleaved: true, layers: [] });
    map.addControl(deckOverlay);
    deckOverlayRef.current = deckOverlay;

    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      if (import.meta.env.DEV && typeof window !== "undefined") {
        const win = window as { __ORCACAST_MAP?: MapLibreMap };
        if (win.__ORCACAST_MAP === map) delete win.__ORCACAST_MAP;
      }
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", onContextRestored);
      map.off("click", "grid-fill", handleSparklineClick);
      map.off("mouseenter", "grid-fill", handleMouseEnter);
      map.off("mousemove", "grid-fill", handleMouseMove);
      map.off("mouseleave", "grid-fill", handleMouseLeave);
      map.off("styledata", handleStyleData);
      map.off("moveend", handleMoveEnd);
      map.off("move", handleMove);
      if (sparkPopupRef.current) {
        sparkPopupRef.current.remove();
        sparkPopupRef.current = null;
      }
      if (deckOverlayRef.current) {
        map.removeControl(deckOverlayRef.current);
        deckOverlayRef.current = null;
      }
      map.remove();
      mapRef.current = null;
    };
  }, [cellPopupHtmlBuilder, enableSparklinePopup, onGridCellSelect, onMoveEndViewState, onMoveViewState]);

  const renderForecastLayer = (map: MapLibreMap) => {
    if (!overlayRef.current) return;

    const scale = legendSpecRef.current;
    const threshold = disableHotspots ? undefined : resolveHotspotThreshold();
    const hotspots = disableHotspots ? false : hotspotsOnlyRef.current;

    const fillExpr: FillColorSpec | undefined =
      hotspots && threshold !== undefined
        ? (buildHotspotOnlyExpr(threshold) as unknown as FillColorSpec)
        : scale
          ? (buildFillExprFromScale(scale) as unknown as FillColorSpec)
          : fillExprRef.current ?? undefined;

    if (fillExpr) {
      fillExprRef.current = fillExpr;
    }

    addGridOverlay(
      map,
      overlayRef.current,
      fillExpr,
      threshold,
      hotspots,
      shimmerThresholdRef.current,
      gridBorderColor
    );

    if (showKdeContoursRef.current) {
      setGridVisibility(map, false);
    } else if (hotspots) {
      setGridBaseVisibility(map, false);
      setHotspotVisibility(map, true);
    } else {
      setGridVisibility(map, true);
      setHotspotVisibility(map, false);
    }
    setGridHoverCell(map, hoveredCellRef.current);
    moveLastWeekToTop(map);
  };

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    let rafId = 0;
    let lastTick = 0;
    const shimmerId = "grid-shimmer-fill";
    const peakId = "grid-peak-shine";
    const bioGlowId = "grid-bio-glow-fill";
    const bioCoreId = "grid-bio-core-fill";
    const bioEdgeId = "grid-bio-edge";
    const hoverFillId = "grid-hover-fill";
    const hoverGlowId = "grid-hover-glow";
    const hoverCoreId = "grid-hover-core";

    const tick = (time: number) => {
      if (time - lastTick > 120) {
        lastTick = time;
        const t = time / 1000;
        const shimmerOpacity = 0.16 + 0.06 * Math.sin(t * 0.6);
        const glowOpacity = 0.22 + 0.06 * Math.sin(t * 0.5 + 0.8);
        const bioGlowOpacity = 0.13 + 0.06 * Math.sin(t * 1.35 + 0.4);
        const bioCoreOpacity = 0.06 + 0.035 * Math.sin(t * 1.9 + 1.2);
        const bioEdgeOpacity = 0.28 + 0.08 * Math.sin(t * 1.4 + 0.2);
        const wandFillOpacity = 0.16 + 0.06 * Math.sin(t * 1.5 + 0.2);
        const wandGlowOpacity = 0.42 + 0.18 * Math.sin(t * 1.9);
        const wandCoreOpacity = 0.72 + 0.18 * Math.sin(t * 1.2 + 0.9);
        const hideGrid = showKdeContoursRef.current || hotspotsOnlyRef.current;
        const z = map.getZoom();
        const edgeBaseWidth =
          z <= 6 ? 0.9 : z <= 9 ? 0.9 + ((z - 6) / 3) * 0.35 : z <= 12 ? 1.25 + ((z - 9) / 3) * 0.55 : 1.8;
        const edgePulseWidth = edgeBaseWidth + 0.1 * Math.sin(t * 1.7 + 0.5);
        if (map.getLayer(shimmerId)) {
          map.setPaintProperty(shimmerId, "fill-opacity", hideGrid ? 0 : shimmerOpacity);
          map.setPaintProperty(
            shimmerId,
            "fill-color",
            `rgba(140,255,245,${0.28 + 0.08 * Math.sin(t * 0.35)})`
          );
        }
        if (map.getLayer(peakId)) {
          map.setPaintProperty(peakId, "line-opacity", hideGrid ? 0 : glowOpacity);
        }
        if (map.getLayer(bioGlowId)) {
          map.setPaintProperty(bioGlowId, "fill-opacity", hideGrid ? 0 : bioGlowOpacity);
        }
        if (map.getLayer(bioCoreId)) {
          map.setPaintProperty(bioCoreId, "fill-opacity", hideGrid ? 0 : bioCoreOpacity);
        }
        if (map.getLayer(bioEdgeId)) {
          map.setPaintProperty(bioEdgeId, "line-opacity", hideGrid ? 0 : bioEdgeOpacity);
          map.setPaintProperty(bioEdgeId, "line-width", edgePulseWidth);
        }
        if (map.getLayer(hoverFillId)) {
          map.setPaintProperty(hoverFillId, "fill-opacity", hideGrid ? 0 : wandFillOpacity);
        }
        if (map.getLayer(hoverGlowId)) {
          map.setPaintProperty(hoverGlowId, "line-opacity", hideGrid ? 0 : wandGlowOpacity);
        }
        if (map.getLayer(hoverCoreId)) {
          map.setPaintProperty(hoverCoreId, "line-opacity", hideGrid ? 0 : wandCoreOpacity);
        }
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [mapReady, resolution, forecastPath]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    if (activeStyleUrlRef.current === styleUrl) return;

    const center = map.getCenter();
    const zoom = map.getZoom();
    const bearing = map.getBearing();
    const pitch = map.getPitch();

    map.setStyle(styleUrl);
    activeStyleUrlRef.current = styleUrl;

    map.once("styledata", () => {
      try {
        map.jumpTo({ center, zoom, bearing, pitch });
      } catch {
        // no-op
      }
      applyBasemapVisualTuning(map, styleUrl === DARK_STYLE);
      map.resize();
      renderForecastLayer(map);
      applyLastWeekFromCache(map);
    });
  }, [styleUrl, mapReady]);

  const getPreviousWeek = (year: number, week: number) => {
    if (week > 1) {
      return { year, week: week - 1 };
    }
    const dec28 = new Date(Date.UTC(year - 1, 11, 28));
    return { year: year - 1, week: isoWeekFromDate(dec28) };
  };

  const buildLastWeekUrl = (key: string) => {
    const base = import.meta.env.BASE_URL || "/";
    const cleanBase = base.endsWith("/") ? base : `${base}/`;
    return `${cleanBase}data/last_week_sightings/last_week_sightings_${key}.geojson`;
  };

  const tagSightings = (
    data: FeatureCollection,
    mode: LastWeekMode,
    selected: { year: number; week: number },
    previous: { year: number; week: number }
  ): FeatureCollection => {
    // ✅ "none" means show nothing
    if (mode === "none") {
      return { ...data, features: [] };
    }

    const parseNum = (value: unknown): number => {
      if (typeof value === "number") return value;
      if (typeof value === "string") {
        const cleaned = value.trim().replace(/[^0-9]/g, "");
        return cleaned.length ? Number(cleaned) : Number.NaN;
      }
      return Number.NaN;
    };

    const rows = (data.features ?? []).map((feature) => {
      const props = (feature.properties ?? {}) as Record<string, unknown>;
      const year = parseNum(props.YEAR ?? props.year ?? props.Year);
      const week = parseNum(
        props.WEEK ??
          props.week ??
          props.Week ??
          props.STAT_WEEK ??
          props.stat_week ??
          props.Stat_Week
      );
      return { feature, props, year, week };
    });

    // eslint-disable-next-line no-console
    console.debug(
      "[Sightings] sample rows",
      rows.slice(0, 5).map((r) => ({ year: r.year, week: r.week }))
    );
    // eslint-disable-next-line no-console
    console.debug("[Sightings] first props", rows[0]?.props ?? null);

    const counts = rows.reduce(
      (acc, row) => {
        if (Number.isFinite(row.year) && Number.isFinite(row.week)) {
          if (row.year === selected.year && row.week === selected.week) acc.selected += 1;
          if (row.year === previous.year && row.week === previous.week) acc.previous += 1;
        }
        return acc;
      },
      { selected: 0, previous: 0 }
    );

    // eslint-disable-next-line no-console
    console.debug("[Sightings] classify", {
      selected,
      previous,
      mode,
      counts,
      total: rows.length,
    });

    return {
      ...data,
      features: rows.flatMap((row) => {
        let sightingMode: "previous" | "selected" | null = null;

        if (Number.isFinite(row.week)) {
          if (Number.isFinite(row.year)) {
            if (row.year === previous.year && row.week === previous.week) sightingMode = "previous";
            if (row.year === selected.year && row.week === selected.week) sightingMode = "selected";
          } else {
            if (row.week === previous.week) sightingMode = "previous";
            if (row.week === selected.week) sightingMode = "selected";
          }
        } else {
          sightingMode = mode === "previous" ? "previous" : "selected";
        }

        if (!sightingMode) return [];
        if (mode === "previous" && sightingMode !== "previous") return [];
        if (mode === "selected" && sightingMode !== "selected") return [];

        return [
          {
            ...row.feature,
            properties: {
              ...row.props,
              sightingMode,
            },
          },
        ];
      }),
    };
  };

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    let cancelled = false;

    const loadOverlay = async () => {
      try {
        const grid = await loadGrid(resolution);
        let values: Record<string, number> = {};
        const usingDerivedValues = Boolean(derivedValuesByCell);
        const valueProperty = derivedValuePropertyRef.current || "prob";

        if (usingDerivedValues) {
          values = derivedValuesByCell ?? {};
        } else {
          try {
            let forecast;
            if (forecastPath) {
              try {
                forecast = await loadForecast(resolution, {
                  kind: "explicit",
                  explicitPath: forecastPath,
                  modelId,
                });
              } catch (err) {
                if (fallbackForecastPath && fallbackForecastPath !== forecastPath) {
                  // eslint-disable-next-line no-console
                  console.warn("[Forecast] explicit path failed, falling back to latest period", err);
                  forecast = await loadForecast(resolution, {
                    kind: "explicit",
                    explicitPath: fallbackForecastPath,
                    modelId,
                  });
                } else {
                  throw err;
                }
              }
            } else if (fallbackForecastPath) {
              forecast = await loadForecast(resolution, {
                kind: "explicit",
                explicitPath: fallbackForecastPath,
                modelId,
              });
            }
            values = forecast?.values ?? {};
          } catch (err) {
            // eslint-disable-next-line no-console
            console.warn("[Forecast] failed to load, rendering empty layer", err);
          }
        }

        if (cancelled) return;

        const joined = attachProbabilities(grid, values, "h3", valueProperty);
        if (usingDerivedValues) {
          legendSpecRef.current = null;
          setLegendSpec(null);
          fillExprRef.current = derivedFillExprRef.current ?? fillExprRef.current;
          hotspotThresholdRef.current = undefined;
          modeledHotspotThresholdRef.current = undefined;
          shimmerThresholdRef.current = undefined;
        } else {
          applyScaleToCurrentValues(values);
        }
        const featureValues = (joined.features ?? [])
          .map((feature) => Number((feature.properties as Record<string, unknown> | null)?.[valueProperty] ?? 0))
          .filter((v) => Number.isFinite(v));
        sortedValuesDescRef.current = [...featureValues].sort((a, b) => b - a);
        totalCellsRef.current = featureValues.length;
        if (onGridCellCount) {
          onGridCellCount(featureValues.length);
        }

        valuesByCellRef.current = values;
        overlayRef.current = joined;

        if (map.isStyleLoaded()) {
          renderForecastLayer(map);
          moveLastWeekToTop(map);
        } else {
          scheduleForecastRender(map, () => cancelled);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("[Forecast] failed to load grid", err);
      }
    };

    loadOverlay();

    return () => {
      cancelled = true;
    };
  }, [resolution, mapReady, forecastPath, fallbackForecastPath, modelId, derivedValuesByCell, derivedValueProperty, derivedFillExpr]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !overlayRef.current) return;
    if (derivedValuesByCell) return;
    const values = valuesByCellRef.current ?? {};
    applyScaleToCurrentValues(values);
    renderForecastLayer(map);
    moveLastWeekToTop(map);
  }, [colorScaleValues, mapReady, useExternalColorScale, activePalette, derivedValuesByCell]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const applyVisibility = (visible: boolean) => {
      const visibility = visible ? "visible" : "none";
      if (map.getLayer(LAST_WEEK_LAYER_ID)) {
        map.setLayoutProperty(LAST_WEEK_LAYER_ID, "visibility", visibility);
      }
      if (map.getLayer(LAST_WEEK_HALO_ID)) {
        map.setLayoutProperty(LAST_WEEK_HALO_ID, "visibility", visibility);
      }
      if (map.getLayer(LAST_WEEK_RING_ID)) {
        map.setLayoutProperty(LAST_WEEK_RING_ID, "visibility", visibility);
      }
      if (map.getLayer(LAST_WEEK_WHITE_ID)) {
        map.setLayoutProperty(LAST_WEEK_WHITE_ID, "visibility", visibility);
      }
    };

    if (!showLastWeek) {
      applyVisibility(false);
      return;
    }

    // ✅ explicit "none" => hide and bail early
    if (lastWeekMode === "none") {
      applyVisibility(false);
      return;
    }

    const attach = (data: FeatureCollection) => {
      ensureLastWeekLayer(map, data);
      applyVisibility(true);
    };

    if (!Number.isFinite(selectedWeekYear) || !Number.isFinite(selectedWeek) || selectedWeek <= 0) {
      applyVisibility(false);
      return;
    }

    const previous = getPreviousWeek(selectedWeekYear, selectedWeek);
    const key = `${selectedWeekYear}-W${selectedWeek}`;
    lastWeekKeyRef.current = key;

    ensureLastWeekLayer(map, { type: "FeatureCollection", features: [] });
    applyVisibility(false);

    const applyTagged = (raw: FeatureCollection | null) => {
      if (!raw) {
        applyVisibility(false);
        return;
      }
      const tagged = tagSightings(
        raw,
        lastWeekMode,
        { year: selectedWeekYear, week: selectedWeek },
        previous
      );
      if ((tagged.features ?? []).length === 0) {
        applyVisibility(false);
        return;
      }
      attach(tagged);
    };

    if (key in lastWeekDataRef.current) {
      applyTagged(lastWeekDataRef.current[key] ?? null);
      return;
    }

    let active = true;

    const load = async () => {
      try {
        const url = `${buildLastWeekUrl(key)}?v=${Date.now()}`;
        const res = await fetch(url, { cache: "no-store" });

        if (res.status === 404 || res.status === 204) {
          lastWeekDataRef.current[key] = null;
          if (active) applyVisibility(false);
          return;
        }
        if (!res.ok) throw new Error(`Failed to fetch last week sightings: ${res.status}`);

        const text = await res.text();
        const trimmed = text.trim();

        if (trimmed.startsWith("<") || trimmed.length === 0) {
          lastWeekDataRef.current[key] = null;
          if (active) applyVisibility(false);
          return;
        }

        const data = JSON.parse(trimmed) as FeatureCollection;

        // eslint-disable-next-line no-console
        console.debug("[Sightings] loaded", {
          url,
          first: data.features?.[0]?.properties ?? null,
        });

        lastWeekDataRef.current[key] = data;
        if (!active) return;

        if (!map.isStyleLoaded()) {
          map.once("styledata", () => {
            if (active) applyTagged(data);
          });
        } else {
          applyTagged(data);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("[Sightings] failed to load last week sightings", err);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [showLastWeek, lastWeekMode, selectedWeek, selectedWeekYear]);

  useEffect(() => {
    const map = mapRef.current;
    const el = containerRef.current;
    if (!map || !el) return;

    const ro = new ResizeObserver(() => {
      map.resize();
    });
    ro.observe(el);

    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const raf = window.requestAnimationFrame(() => {
      map.resize();
      map.triggerRepaint();
    });
    const t1 = window.setTimeout(() => {
      map.resize();
      map.triggerRepaint();
    }, 80);
    const t2 = window.setTimeout(() => {
      map.resize();
      map.triggerRepaint();
    }, 240);
    const t3 = window.setTimeout(() => {
      if (!map.isStyleLoaded()) {
        const nextStyle = styleUrlRef.current;
        const center = map.getCenter();
        const zoom = map.getZoom();
        const bearing = map.getBearing();
        const pitch = map.getPitch();
        map.setStyle(nextStyle);
        map.once("styledata", () => {
          try {
            map.jumpTo({ center, zoom, bearing, pitch });
          } catch {
            // no-op
          }
          map.resize();
          renderForecastLayer(map);
          applyLastWeekFromCache(map);
        });
      }
    }, 420);

    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [timeseriesOpen]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const id = window.setTimeout(() => {
      map.resize();
      map.triggerRepaint();
    }, 50);
    return () => window.clearTimeout(id);
  }, [legendSpec, deltaLegend]);

  type MapMouseEventWithFeatures = maplibregl.MapMouseEvent & {
    features?: Array<{ properties?: { datetime?: string } }>;
  };

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !lastWeekPopupRef.current) return;

    const popup = lastWeekPopupRef.current;
    const onMove = (e: MapMouseEventWithFeatures) => {
      const feature = e.features?.[0] as { properties?: { datetime?: string } } | undefined;
      const datetime = feature?.properties?.datetime;
      if (!datetime) return;
      popup
        .setLngLat(e.lngLat)
        .setHTML(`<div style="font-size:12px;">${datetime}</div>`)
        .addTo(map);
    };
    const onLeave = () => popup.remove();

    map.on("mousemove", LAST_WEEK_LAYER_ID, onMove);
    map.on("mouseleave", LAST_WEEK_LAYER_ID, onLeave);

    return () => {
      map.off("mousemove", LAST_WEEK_LAYER_ID, onMove);
      map.off("mouseleave", LAST_WEEK_LAYER_ID, onLeave);
      popup.remove();
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !overlayRef.current) return;

    if (!map.isStyleLoaded()) {
      scheduleForecastRender(map);
      return;
    }

    renderForecastLayer(map);
    moveLastWeekToTop(map);
  }, [hotspotsEnabled, legendSpec, deltaLegend, disableHotspots]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (!hasForecastLegend) {
      setGridVisibility(map, true);
      setHotspotVisibility(map, false);
      return;
    }
    if (KDE_ENABLED && showKdeContours) {
      setGridVisibility(map, false);
    } else if (!disableHotspots && hotspotsEnabled) {
      setGridBaseVisibility(map, false);
      setHotspotVisibility(map, true);
    } else {
      setGridVisibility(map, true);
      setHotspotVisibility(map, false);
    }
  }, [showKdeContours, hotspotsEnabled, mapReady, hasForecastLegend, disableHotspots]);

  useEffect(() => {
    if (hasForecastLegend) return;
    if (KDE_ENABLED && showKdeContours) setShowKdeContours(false);
    if (hotspotsEnabled) onHotspotsEnabledChange(false);
  }, [hasForecastLegend, showKdeContours, hotspotsEnabled, onHotspotsEnabledChange]);

  useEffect(() => {
    if (!disableHotspots) return;
    if (hotspotsEnabled) onHotspotsEnabledChange(false);
  }, [disableHotspots, hotspotsEnabled, onHotspotsEnabledChange]);

  useEffect(() => {
    if (!KDE_ENABLED) {
      setKdeBands(null);
      setKdeWarning(null);
      return;
    }
    const map = mapRef.current;
    if (!map || !showKdeContours) return;

    if (!Number.isFinite(selectedWeekYear) || !Number.isFinite(selectedWeek) || selectedWeek <= 0) {
      setKdeWarning("No blurred KDE GeoJSON available for this period.");
      setKdeBands(null);
      return;
    }

    let active = true;

    const runId = appConfig.kdeBandsRunId;
    const areaMinKm2 = appConfig.kdeBandsAreaMinKm2;
    const holeMinKm2 = appConfig.kdeBandsHoleMinKm2;

    const path = getKdeBandsPathForPeriod(
      resolution,
      selectedWeekYear,
      selectedWeek,
      runId,
      appConfig.kdeBandsFolder
    );

    const cacheKey = buildKdeBandsCacheKey({
      runId,
      folder: appConfig.kdeBandsFolder,
      resolution,
      year: selectedWeekYear,
      statWeek: selectedWeek,
      areaMinKm2,
      holeMinKm2,
    });

    loadKdeBandsGeojson(path, cacheKey)
      .then((data) => {
        if (!active) return;
        setKdeBands(data);
        setKdeWarning(null);
      })
      .catch(() => {
        if (!active) return;
        setKdeBands(null);
        setKdeWarning("No blurred KDE GeoJSON available for this period.");
      });

    return () => {
      active = false;
    };
  }, [showKdeContours, selectedWeekYear, selectedWeek, resolution]);

  useEffect(() => {
    const overlay = deckOverlayRef.current;
    if (!overlay) return;

    if (!KDE_ENABLED || !showKdeContours || !kdeBands) {
      overlay.setProps({ layers: [] });
      return;
    }

    const layer = new GeoJsonLayer({
      id: "kde-bands",
      data: kdeBands,
      filled: true,
      stroked: true,
      opacity: 0.8,
      lineWidthMinPixels: 0.2,
      getFillColor: (feature) => rgbaStringToArray(getKdeBandColor(feature, legendSpec)) ?? [0, 0, 0, 0],
      getLineColor: (feature) => rgbaStringToArray(getKdeBandColor(feature, legendSpec)) ?? [0, 0, 0, 0],
      getLineWidth: 0.4,
      pickable: false,
      parameters: { depthTest: false },
    });

    overlay.setProps({ layers: [layer] });
  }, [showKdeContours, kdeBands, legendSpec]);

  return (
    <div className="mapStage">
      <div ref={containerRef} className="map" data-tour="map-canvas" />
      <div className="map__cornerRightBottom" data-tour="legend-controls">
        <div className="legendClusterItem">
          {/* {hotspotsOnly && hotspotCount !== null && (
            <div
              className={`map__hotspotCount${
                hotspotToastVisible ? " map__hotspotCount--visible" : ""
              }`}
              role="status"
              aria-live="polite"
            >
              Hotspots: {hotspotCount.toLocaleString()} cells
            </div>
          )} */}
          <button
            className={
              hotspotsEnabled
                ? `iconBtn legendClusterBtn legendHotspots legendHotspots--active${(!hasForecastLegend || disableHotspots) ? " legendClusterBtn--disabled" : ""}`
                : `iconBtn legendClusterBtn legendHotspots${(!hasForecastLegend || disableHotspots) ? " legendClusterBtn--disabled" : ""}`
            }
            onClick={() => {
              if (disableHotspots) return;
              const next = !hotspotsEnabled;
              onHotspotsEnabledChange(next);
            }}
            aria-label="Toggle hotspots"
            data-tour="hotspots"
            disabled={!hasForecastLegend || disableHotspots}
          >
            <span className="material-symbols-rounded">local_fire_department</span>
          </button>
        </div>
        <button
          className={`iconBtn legendClusterBtn${!hasForecastLegend ? " legendClusterBtn--disabled" : ""}`}
          onClick={() => setLegendOpen((v) => !v)}
          aria-label={legendOpen ? "Hide legend" : "Show legend"}
          data-tour="legend-toggle"
          disabled={!hasForecastLegend}
        >
          <span className="material-symbols-rounded">legend_toggle</span>
        </button>
      </div>
      {legendOpen && <ProbabilityLegend scale={legendSpec} deltaLegend={deltaLegend} />}
      {KDE_ENABLED && kdeWarning && (
        <div className="map__kdeWarning" role="status" aria-live="polite">
          <span className="material-symbols-rounded" aria-hidden="true">
            warning
          </span>
          <span>{kdeWarning}</span>
        </div>
      )}
    </div>
  );
}

function getKdeBandColor(
  feature: { properties?: Record<string, unknown> },
  scale: HeatScale | null
): string {
  if (!feature?.properties) return "";
  const { properties } = feature;
  const label = typeof properties.label === "string" ? properties.label.toLowerCase() : "";
  const level = Number(properties.level);
  const bin = Number(properties.bin ?? properties.band_index);
  if (
    label.includes("no probability") ||
    (Number.isFinite(level) && level <= 0) ||
    (Number.isFinite(bin) && bin < 0)
  ) {
    return ZERO_COLOR;
  }
  if (scale && scale.binColorsRgba.length > 0) {
    if (label) {
      const labelIndex = scale.labels.findIndex((entry) => entry.toLowerCase() === label);
      if (labelIndex > 0) {
        const swatch = scale.binColorsRgba[labelIndex - 1];
        if (typeof swatch === "string") {
          return swatch;
        }
      }
    }
    if (Number.isFinite(bin)) {
      const idx = Math.max(0, Math.min(scale.binColorsRgba.length - 1, Math.floor(bin)));
      const swatch = scale.binColorsRgba[idx];
      if (typeof swatch === "string") {
        return swatch;
      }
    }
  }
  const value = properties.color ?? properties.fill;
  return typeof value === "string" ? value : "";
}

function rgbaStringToArray(value: string): [number, number, number, number] | null {
  const hexMatch = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hexMatch) {
    const cleaned = hexMatch[1];
    const full =
      cleaned.length === 3
        ? cleaned
            .split("")
            .map((c) => c + c)
            .join("")
        : cleaned;
    const numeric = parseInt(full, 16);
    const r = (numeric >> 16) & 255;
    const g = (numeric >> 8) & 255;
    const b = numeric & 255;
    return [r, g, b, 255];
  }
  const match = value.match(/rgba?\(([^)]+)\)/i);
  if (!match) return null;
  const parts = match[1].split(",").map((part) => Number(part.trim()));
  if (parts.length < 3) return null;
  const [r, g, b] = parts;
  const a = parts.length >= 4 ? parts[3] : 1;
  if (![r, g, b, a].every((v) => Number.isFinite(v))) return null;
  return [Math.round(r), Math.round(g), Math.round(b), Math.round(a * 255)];
}

function ensureLastWeekLayer(map: MapLibreMap, data: FeatureCollection) {
  if (map.getSource(LAST_WEEK_SOURCE_ID)) {
    const source = map.getSource(LAST_WEEK_SOURCE_ID) as maplibregl.GeoJSONSource;
    source.setData(data);
  } else {
    map.addSource(LAST_WEEK_SOURCE_ID, { type: "geojson", data });
  }

  if (!map.getLayer(LAST_WEEK_HALO_ID)) {
    map.addLayer({
      id: LAST_WEEK_HALO_ID,
      type: "circle",
      source: LAST_WEEK_SOURCE_ID,
      paint: {
        "circle-color": "rgba(0,255,240,0.18)",
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 2.8, 8, 4, 11, 5],
        "circle-blur": 0.9,
        "circle-opacity": 0.65,
      },
    });
  }

  if (map.getLayer(LAST_WEEK_RING_ID)) {
    map.setPaintProperty(LAST_WEEK_RING_ID, "circle-stroke-color", [
      "match",
      ["get", "sightingMode"],
      "previous",
      "#FF3B5C",
      "selected",
      "#7CFF6B",
      "#FF3B5C",
    ]);
    map.setPaintProperty(LAST_WEEK_RING_ID, "circle-radius", [
      "interpolate",
      ["linear"],
      ["zoom"],
      5,
      2.6,
      8,
      3.6,
      11,
      4.6,
    ]);
    map.setPaintProperty(LAST_WEEK_RING_ID, "circle-stroke-width", 2.2);
  } else {
    map.addLayer({
      id: LAST_WEEK_RING_ID,
      type: "circle",
      source: LAST_WEEK_SOURCE_ID,
      paint: {
        "circle-color": "rgba(0,0,0,0)",
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 2.6, 8, 3.6, 11, 4.6],
        "circle-stroke-width": 2.2,
        "circle-stroke-color": [
          "match",
          ["get", "sightingMode"],
          "previous",
          "#FF3B5C",
          "selected",
          "#7CFF6B",
          "#FF3B5C",
        ],
        "circle-opacity": 0.9,
      },
    });
  }

  if (map.getLayer(LAST_WEEK_WHITE_ID)) {
    map.setPaintProperty(LAST_WEEK_WHITE_ID, "circle-radius", [
      "interpolate",
      ["linear"],
      ["zoom"],
      5,
      3.1,
      8,
      4.2,
      11,
      5.4,
    ]);
    map.setPaintProperty(LAST_WEEK_WHITE_ID, "circle-stroke-width", 1.2);
  } else {
    map.addLayer({
      id: LAST_WEEK_WHITE_ID,
      type: "circle",
      source: LAST_WEEK_SOURCE_ID,
      paint: {
        "circle-color": "rgba(0,0,0,0)",
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 3.1, 8, 4.2, 11, 5.4],
        "circle-stroke-width": 1.2,
        "circle-stroke-color": "rgba(255,255,255,0.9)",
        "circle-opacity": 0.9,
      },
    });
  }

  if (!map.getLayer(LAST_WEEK_LAYER_ID)) {
    map.addLayer({
      id: LAST_WEEK_LAYER_ID,
      type: "circle",
      source: LAST_WEEK_SOURCE_ID,
      paint: {
        "circle-color": "rgba(255,255,255,0.98)",
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 1.2, 8, 1.9, 11, 2.8],
        "circle-stroke-color": "#06184a",
        "circle-stroke-width": 1.4,
        "circle-opacity": 0.95,
      },
    });
  }

  moveLastWeekToTop(map);
}

function moveLastWeekToTop(map: MapLibreMap) {
  if (map.getLayer(LAST_WEEK_HALO_ID)) {
    map.moveLayer(LAST_WEEK_HALO_ID);
  }
  if (map.getLayer(LAST_WEEK_WHITE_ID)) {
    map.moveLayer(LAST_WEEK_WHITE_ID);
  }
  if (map.getLayer(LAST_WEEK_RING_ID)) {
    map.moveLayer(LAST_WEEK_RING_ID);
  }
  if (map.getLayer(LAST_WEEK_LAYER_ID)) {
    map.moveLayer(LAST_WEEK_LAYER_ID);
  }
}
