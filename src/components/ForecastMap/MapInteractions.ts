import maplibregl, { type Map as MapLibreMap } from "maplibre-gl";
import type { FeatureCollection } from "geojson";
import type { MutableRefObject } from "react";
import { getForecastPathForPeriod, type H3Resolution } from "../../config/dataPaths";
import { loadForecast } from "../../data/forecastIO";
import type { Period } from "../../data/periods";
import { isoWeekToDateRange } from "../../core/time/forecastPeriodToIsoWeek";
import { setGridHoverCell } from "../../map/gridOverlay";
import type { LngLat, SparklineSeries } from "./types";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatModelLabel(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

export function getFeatureCellId(feature: { properties?: Record<string, unknown> } | undefined): string {
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
    if (geometry.type === "Polygon") return [geometry.coordinates as number[][][]];
    if (geometry.type === "MultiPolygon") return geometry.coordinates as number[][][][];
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
  const marker = selectedIndex >= 0 && selectedIndex < points.length ? points[selectedIndex] : null;
  const markerX =
    selectedIndex >= 0 && selectedIndex < points.length ? (paddingLeft + step * selectedIndex).toFixed(1) : null;
  const axisY = chartBottom + 3;
  const weekTicks = periods.map((period, i) => ({ x: paddingLeft + step * i, label: String(period.stat_week) }));
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
      ${monthTicks.map((tick) => `<text class="sparkPopup__axisLabelMonth" x="${tick.x.toFixed(1)}" y="${(chartTop - 1).toFixed(1)}" text-anchor="middle">${tick.label}</text>`).join("")}
      ${weekTicks.map((tick) => `<line class="sparkPopup__axisTick" x1="${tick.x.toFixed(1)}" x2="${tick.x.toFixed(1)}" y1="${axisY}" y2="${axisY + 3}" /><text class="sparkPopup__axisLabelWeek" x="${tick.x.toFixed(1)}" y="${height - paddingY}" text-anchor="middle">${tick.label}</text>`).join("")}
    </svg>
  `.trim();
}

type GridInteractionOptions = {
  map: MapLibreMap;
  overlayRef: MutableRefObject<FeatureCollection | null>;
  periodsRef: MutableRefObject<Period[]>;
  modelIdRef: MutableRefObject<string>;
  resolutionRef: MutableRefObject<H3Resolution>;
  selectedWeekRef: MutableRefObject<number>;
  selectedWeekYearRef: MutableRefObject<number>;
  sparklineCacheRef: MutableRefObject<Map<string, SparklineSeries>>;
  sightingsWeekCacheRef: MutableRefObject<Map<string, LngLat[]>>;
  sparkPopupRef: MutableRefObject<maplibregl.Popup | null>;
  sparkRequestIdRef: MutableRefObject<number>;
  hoveredCellRef: MutableRefObject<string | null>;
  onGridCellSelect?: (h3: string) => void;
  cellPopupHtmlBuilder?: (cellId: string) => string | null | undefined;
  enableSparklinePopup: boolean;
};

export function createGridInteractionHandlers({
  map,
  overlayRef,
  periodsRef,
  modelIdRef,
  resolutionRef,
  selectedWeekRef,
  selectedWeekYearRef,
  sparklineCacheRef,
  sightingsWeekCacheRef,
  sparkPopupRef,
  sparkRequestIdRef,
  hoveredCellRef,
  onGridCellSelect,
  cellPopupHtmlBuilder,
  enableSparklinePopup,
}: GridInteractionOptions) {
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
          sparkPopupRef.current = new maplibregl.Popup({ closeButton: false, closeOnClick: true, offset: 10 });
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
    const selectedIndex = selectedFullIndex >= 0 ? selectedFullIndex - startIndex : periodsList.length - 1;

    if (!sparkPopupRef.current) {
      sparkPopupRef.current = new maplibregl.Popup({ closeButton: false, closeOnClick: true, offset: 10 });
    }

    const modelLabel = formatModelLabel(modelIdRef.current);
    sparkPopupRef.current.setLngLat(event.lngLat).setHTML(`
      <div class="sparkPopup">
        <div class="sparkPopup__title">Cell ${escapeHtml(cellId)}</div>
        <div class="sparkPopup__meta">Model: ${escapeHtml(modelLabel)}</div>
        <div class="sparkPopup__seriesMeta">Forecast (cyan) + Sightings 0/1 (amber)</div>
        <div class="sparkPopup__loading">Loading sparkline…</div>
      </div>
    `).addTo(map);

    const requestId = (sparkRequestIdRef.current += 1);
    const cacheKey = [resolutionRef.current, modelIdRef.current, cellId, periodsList.map((p) => p.periodKey).join("|")].join("|");
    const cached = sparklineCacheRef.current.get(cacheKey);
    if (cached) {
      sparkPopupRef.current.setHTML(`
        <div class="sparkPopup">
          <div class="sparkPopup__title">Cell ${escapeHtml(cellId)}</div>
          <div class="sparkPopup__meta">Model: ${escapeHtml(modelLabel)}</div>
          <div class="sparkPopup__seriesMeta">Forecast (cyan) + Sightings 0/1 (amber)</div>
          ${buildSparklineSvg(cached.forecast, cached.sightings, selectedIndex, periodsList)}
        </div>
      `);
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
                let weekPoints = sightingsWeekCacheRef.current.get(weekKey);
                if (!weekPoints) {
                  try {
                    weekPoints = await loadWeeklySightingPoints(period.year, period.stat_week);
                  } catch {
                    weekPoints = [];
                  }
                  sightingsWeekCacheRef.current.set(weekKey, weekPoints);
                }
                return weekPoints.some((point) => cellPolygons.some((polygon) => pointInPolygon(point, polygon))) ? 1 : 0;
              })
            );

      return { forecast: forecastValues, sightings };
    };

    fetchSeries()
      .then((series) => {
        if (sparkRequestIdRef.current !== requestId) return;
        sparklineCacheRef.current.set(cacheKey, series);
        sparkPopupRef.current?.setHTML(`
          <div class="sparkPopup">
            <div class="sparkPopup__title">Cell ${escapeHtml(cellId)}</div>
            <div class="sparkPopup__meta">Model: ${escapeHtml(modelLabel)}</div>
            <div class="sparkPopup__seriesMeta">Forecast (cyan) + Sightings 0/1 (amber)</div>
            ${buildSparklineSvg(series.forecast, series.sightings, selectedIndex, periodsList)}
          </div>
        `);
      })
      .catch(() => {
        if (sparkRequestIdRef.current !== requestId) return;
        sparkPopupRef.current?.setHTML(`
          <div class="sparkPopup">
            <div class="sparkPopup__title">Cell ${escapeHtml(cellId)}</div>
            <div class="sparkPopup__meta">Model: ${escapeHtml(modelLabel)}</div>
            <div class="sparkPopup__seriesMeta">Forecast (cyan) + Sightings 0/1 (amber)</div>
            <div class="sparkPopup__loading">Unable to load sparkline.</div>
          </div>
        `);
      });
  };

  const handleMouseEnter = () => {
    map.getCanvas().style.cursor = "pointer";
  };

  const handleMouseMove = (event: maplibregl.MapMouseEvent) => {
    const features = map.queryRenderedFeatures(event.point, { layers: ["grid-fill"] });
    const cellId = getFeatureCellId(features[0] as { properties?: Record<string, unknown> } | undefined);
    if (!cellId || hoveredCellRef.current === cellId) return;
    hoveredCellRef.current = cellId;
    setGridHoverCell(map, cellId);
  };

  const handleMouseLeave = () => {
    hoveredCellRef.current = null;
    setGridHoverCell(map, null);
    map.getCanvas().style.cursor = "";
  };

  return { handleSparklineClick, handleMouseEnter, handleMouseMove, handleMouseLeave };
}
