import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, type MutableRefObject } from "react";
import maplibregl, { Map as MapLibreMap, type DataDrivenPropertyValueSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { FeatureCollection } from "geojson";
import type {
  SourceTargetVisibilityRecord,
  ViewabilityColorScaleSettings,
  ViewabilityMapMode,
  ViewabilityScoreType,
  ViewabilitySourceFeatureCollection,
  ViewabilityTargetFeatureCollection,
} from "../../../data/viewabilityTypes";
import { applyBasemapVisualTuning, DARK_STYLE, DEFAULT_CENTER, DEFAULT_ZOOM, VOYAGER_STYLE } from "../../../components/ForecastMap/buildLayers";
import { buildInspectorTargetCells } from "../utils/viewabilityLayerBuilders";
import { buildViewabilityColorExpression, formatScore, getViewabilityScoreProperty } from "../utils/viewabilityColorScales";

const TARGET_SOURCE_ID = "viewability-target-cells";
const SOURCE_SOURCE_ID = "viewability-source-cells";
const TARGET_FILL_LAYER_ID = "viewability-target-fill";
const TARGET_LINE_LAYER_ID = "viewability-target-line";
const SOURCE_FILL_LAYER_ID = "viewability-source-fill";
const SOURCE_LINE_LAYER_ID = "viewability-source-line";
const SOURCE_SELECTED_LAYER_ID = "viewability-source-selected";

type Props = {
  darkMode: boolean;
  targetCells: ViewabilityTargetFeatureCollection | null;
  sourceCells: ViewabilitySourceFeatureCollection | null;
  selectedVisibility: SourceTargetVisibilityRecord[];
  poiFilters: { Park: boolean; Marina: boolean; Ferry: boolean };
  mode: ViewabilityMapMode;
  scoreType: ViewabilityScoreType;
  showTargetCells: boolean;
  showSourceCells: boolean;
  selectedSourceCellId: string | null;
  colorScaleSettings: ViewabilityColorScaleSettings;
  onSelectSourceCell: (sourceCellId: string) => void;
};

export type ViewabilityMapHandle = {
  captureSnapshot: () => Promise<Blob | null>;
};

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function setVisibility(map: MapLibreMap, layerId: string, visible: boolean) {
  if (map.getLayer(layerId)) {
    map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
  }
}

function extendBoundsFromCoordinates(bounds: maplibregl.LngLatBounds, coordinates: unknown) {
  if (!Array.isArray(coordinates)) return;

  if (
    coordinates.length >= 2 &&
    typeof coordinates[0] === "number" &&
    Number.isFinite(coordinates[0]) &&
    typeof coordinates[1] === "number" &&
    Number.isFinite(coordinates[1])
  ) {
    bounds.extend([coordinates[0], coordinates[1]]);
    return;
  }

  for (const child of coordinates) {
    extendBoundsFromCoordinates(bounds, child);
  }
}

function extendBoundsFromFeatureCollection(bounds: maplibregl.LngLatBounds, collection: FeatureCollection | null | undefined) {
  for (const feature of collection?.features ?? []) {
    const geometry = feature.geometry;
    if (!geometry) continue;
    if (geometry.type === "Point") {
      bounds.extend(geometry.coordinates as [number, number]);
      continue;
    }
    if ("coordinates" in geometry) {
      extendBoundsFromCoordinates(bounds, geometry.coordinates);
    }
  }
}

export const ViewabilityMap = forwardRef<ViewabilityMapHandle, Props>(function ViewabilityMap({
  darkMode,
  targetCells,
  sourceCells,
  selectedVisibility,
  poiFilters,
  mode,
  scoreType,
  showTargetCells,
  showSourceCells,
  selectedSourceCellId,
  colorScaleSettings,
  onSelectSourceCell,
}, ref) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const poiMarkersRef = useRef<maplibregl.Marker[]>([]);
  const poiLoadedRef = useRef(false);
  const poiDataRef = useRef<Array<{ type: string; name: string; latitude: number; longitude: number }> | null>(null);
  const onSelectSourceCellRef = useRef(onSelectSourceCell);
  const mapTargetsRef = useRef<FeatureCollection | null>(null);
  const sourceCellsRef = useRef(sourceCells);
  const scoreTypeRef = useRef(scoreType);
  const colorScaleSettingsRef = useRef(colorScaleSettings);
  const showTargetCellsRef = useRef(showTargetCells);
  const showSourceCellsRef = useRef(showSourceCells);
  const selectedSourceCellIdRef = useRef(selectedSourceCellId);
  const lastInspectorFitKeyRef = useRef<string | null>(null);

  useImperativeHandle(
    ref,
    () => ({
      captureSnapshot: async () => {
        const map = mapRef.current;
        if (!map) return null;
        return await new Promise<Blob | null>((resolve) => {
          try {
            map.getCanvas().toBlob((blob) => resolve(blob), "image/png");
          } catch {
            resolve(null);
          }
        });
      },
    }),
    []
  );

  useEffect(() => {
    onSelectSourceCellRef.current = onSelectSourceCell;
  }, [onSelectSourceCell]);

  const mapTargets = useMemo(
    () => (mode === "source-inspector" ? buildInspectorTargetCells(targetCells, selectedVisibility, scoreType) : targetCells),
    [mode, scoreType, selectedVisibility, targetCells]
  );

  useEffect(() => {
    mapTargetsRef.current = mapTargets;
    sourceCellsRef.current = sourceCells;
    scoreTypeRef.current = scoreType;
    colorScaleSettingsRef.current = colorScaleSettings;
    showTargetCellsRef.current = showTargetCells;
    showSourceCellsRef.current = showSourceCells;
    selectedSourceCellIdRef.current = selectedSourceCellId;
  }, [colorScaleSettings, mapTargets, scoreType, selectedSourceCellId, showSourceCells, showTargetCells, sourceCells]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: darkMode ? DARK_STYLE : VOYAGER_STYLE,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      attributionControl: false,
    });
    mapRef.current = map;
    popupRef.current = new maplibregl.Popup({ closeButton: false, closeOnClick: false, className: "viewabilityPopup" });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-left");

    map.on("load", () => {
      applyBasemapVisualTuning(map, darkMode);
      if (!map.getSource(TARGET_SOURCE_ID)) {
        map.addSource(TARGET_SOURCE_ID, { type: "geojson", data: mapTargetsRef.current ?? { type: "FeatureCollection", features: [] } });
      }
      if (!map.getSource(SOURCE_SOURCE_ID)) {
        map.addSource(SOURCE_SOURCE_ID, { type: "geojson", data: sourceCellsRef.current ?? { type: "FeatureCollection", features: [] } });
      }
      addLayers(map, colorScaleSettingsRef.current, getViewabilityScoreProperty(scoreTypeRef.current), {
        showTargetCells: showTargetCellsRef.current,
        showSourceCells: showSourceCellsRef.current,
        selectedSourceCellId: selectedSourceCellIdRef.current,
      });
      bindInteractions(map, popupRef, onSelectSourceCellRef);
    });

    return () => {
      popupRef.current?.remove();
      poiMarkersRef.current.forEach((marker) => marker.remove());
      poiMarkersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [darkMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const showPoi = poiFilters.Park || poiFilters.Marina || poiFilters.Ferry;
    if (!showPoi) {
      poiMarkersRef.current.forEach((marker) => marker.remove());
      poiMarkersRef.current = [];
      return;
    }

    let cancelled = false;

    const renderPoiMarkers = (items: Array<{ type: string; name: string; latitude: number; longitude: number }>) => {
      if (cancelled || !mapRef.current) return;
      poiMarkersRef.current.forEach((marker) => marker.remove());
      poiMarkersRef.current = [];

      const iconMap: Record<string, string> = { Park: "park", Marina: "sailing", Ferry: "directions_boat" };
      const typeToFilterKey = (value: string): keyof typeof poiFilters | null => {
        const normalized = value.trim().toLowerCase();
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
        .filter((poi) => poi.filterKey !== null && Number.isFinite(poi.latitude) && Number.isFinite(poi.longitude));
      const filteredItems = safeItems.filter((poi) => poi.filterKey && (poiFilters[poi.filterKey] ?? false));
      const itemsToRender = filteredItems.length > 0 ? filteredItems : safeItems;

      poiMarkersRef.current = itemsToRender.map((poi) => {
        const el = document.createElement("button");
        el.type = "button";
        el.className = "poiMarker";
        el.setAttribute("aria-label", poi.name);
        el.innerHTML = `<span class="material-symbols-rounded">${poi.filterKey ? iconMap[poi.filterKey] : "directions_boat"}</span>`;

        const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: true }).setHTML(
          `<div class="poiPopup"><div class="poiPopup__title">${escapeHtml(poi.name)}</div><div class="poiPopup__meta">${poi.latitude.toFixed(4)}, ${poi.longitude.toFixed(4)}</div></div>`
        );

        return new maplibregl.Marker({ element: el, anchor: "bottom" })
          .setLngLat([poi.longitude, poi.latitude])
          .setPopup(popup)
          .addTo(mapRef.current as MapLibreMap);
      });
    };

    loadPoiData(poiLoadedRef, poiDataRef)
      .then((items) => {
        if (cancelled || !mapRef.current) return;
        if (!mapRef.current.isStyleLoaded()) {
          mapRef.current.once("load", () => renderPoiMarkers(items));
          return;
        }
        renderPoiMarkers(items);
      })
      .catch((err) => {
        if (!cancelled) console.warn("[POI] failed to load places_of_interest.json", err);
      });

    return () => {
      cancelled = true;
    };
  }, [poiFilters]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const targetSource = map.getSource(TARGET_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    targetSource?.setData(mapTargets ?? { type: "FeatureCollection", features: [] });
  }, [mapTargets]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const source = map.getSource(SOURCE_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    source?.setData(sourceCells ?? { type: "FeatureCollection", features: [] });
  }, [sourceCells]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer(TARGET_FILL_LAYER_ID)) return;
    const propertyName = mode === "source-inspector" ? "source_target_weight" : getViewabilityScoreProperty(scoreType);
    const lineColors = getViewabilityLineColors(colorScaleSettings.paletteId);
    const hideUnselectedSourcesExpression = [
      "all",
      ["==", ["literal", mode], "source-inspector"],
      ["!=", ["get", "h3"], selectedSourceCellId ?? ""],
    ] as const;
    map.setPaintProperty(TARGET_FILL_LAYER_ID, "fill-color", buildViewabilityColorExpression(colorScaleSettings, propertyName));
    map.setPaintProperty(TARGET_LINE_LAYER_ID, "line-color", lineColors.target);
    map.setPaintProperty(SOURCE_FILL_LAYER_ID, "fill-color", buildViewabilityColorExpression(colorScaleSettings, "source_viewyness_score"));
    map.setPaintProperty(SOURCE_LINE_LAYER_ID, "line-color", lineColors.source);
    map.setPaintProperty(TARGET_FILL_LAYER_ID, "fill-opacity", [
      "case",
      ["all", ["==", ["literal", mode], "source-inspector"], ["!", ["coalesce", ["get", "visible_from_selected_source"], false]]],
      0,
      0.88,
    ]);
    map.setPaintProperty(TARGET_LINE_LAYER_ID, "line-opacity", [
      "case",
      ["all", ["==", ["literal", mode], "source-inspector"], ["!", ["coalesce", ["get", "visible_from_selected_source"], false]]],
      0,
      1,
    ]);
    map.setPaintProperty(SOURCE_FILL_LAYER_ID, "fill-opacity", ["case", hideUnselectedSourcesExpression, 0, 0.8]);
    map.setPaintProperty(SOURCE_LINE_LAYER_ID, "line-opacity", ["case", hideUnselectedSourcesExpression, 0, 0.9]);
  }, [colorScaleSettings, mode, scoreType, selectedSourceCellId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const showInspectorTargets = mode === "source-inspector";
    setVisibility(map, TARGET_FILL_LAYER_ID, showTargetCells || showInspectorTargets);
    setVisibility(map, TARGET_LINE_LAYER_ID, showTargetCells || showInspectorTargets);
    setVisibility(map, SOURCE_FILL_LAYER_ID, showSourceCells);
    setVisibility(map, SOURCE_LINE_LAYER_ID, showSourceCells);
    setVisibility(map, SOURCE_SELECTED_LAYER_ID, showSourceCells && Boolean(selectedSourceCellId));
  }, [mode, selectedSourceCellId, showSourceCells, showTargetCells]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer(SOURCE_SELECTED_LAYER_ID)) return;
    map.setFilter(SOURCE_SELECTED_LAYER_ID, ["==", ["get", "h3"], selectedSourceCellId ?? ""]);
  }, [selectedSourceCellId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || mode !== "source-inspector" || !selectedSourceCellId) {
      lastInspectorFitKeyRef.current = null;
      return;
    }

    const inspectorTargetCount = mapTargets?.features.length ?? 0;
    const fitKey = `${selectedSourceCellId}:${inspectorTargetCount}`;
    if (fitKey === lastInspectorFitKeyRef.current) return;

    const selectedSourceFeatureCollection: FeatureCollection = {
      type: "FeatureCollection",
      features: (sourceCells?.features ?? []).filter((feature) => feature.properties.h3 === selectedSourceCellId),
    };
    const bounds = new maplibregl.LngLatBounds();
    extendBoundsFromFeatureCollection(bounds, selectedSourceFeatureCollection);
    extendBoundsFromFeatureCollection(bounds, mapTargets);
    if (bounds.isEmpty()) return;

    lastInspectorFitKeyRef.current = fitKey;
    map.fitBounds(bounds, {
      padding: { top: 88, right: 88, bottom: 360, left: 88 },
      duration: 700,
      maxZoom: 9,
    });
  }, [mapTargets, mode, selectedSourceCellId, sourceCells]);

  return (
    <div className="mapStage viewabilityMapStage">
      <div ref={containerRef} className="map" data-tour="viewability-map-canvas" />
    </div>
  );
});

function addLayers(
  map: MapLibreMap,
  colorScaleSettings: ViewabilityColorScaleSettings,
  propertyName: string,
  visibility: { showTargetCells: boolean; showSourceCells: boolean; selectedSourceCellId: string | null }
) {
  const lineColors = getViewabilityLineColors(colorScaleSettings.paletteId);
  const targetVisibility = visibility.showTargetCells ? "visible" : "none";
  const sourceVisibility = visibility.showSourceCells ? "visible" : "none";
  const selectedSourceVisibility = visibility.showSourceCells && visibility.selectedSourceCellId ? "visible" : "none";
  if (!map.getLayer(TARGET_FILL_LAYER_ID)) {
    map.addLayer({
      id: TARGET_FILL_LAYER_ID,
      type: "fill",
      source: TARGET_SOURCE_ID,
      layout: {
        visibility: targetVisibility,
      },
      paint: {
        "fill-color": buildViewabilityColorExpression(colorScaleSettings, propertyName) as DataDrivenPropertyValueSpecification<string>,
        "fill-opacity": 0.88,
      },
    });
  }
  if (!map.getLayer(TARGET_LINE_LAYER_ID)) {
    map.addLayer({
      id: TARGET_LINE_LAYER_ID,
      type: "line",
      source: TARGET_SOURCE_ID,
      layout: {
        visibility: targetVisibility,
      },
      paint: {
        "line-color": lineColors.target,
        "line-width": ["interpolate", ["linear"], ["zoom"], 5, 0.6, 9, 1.4],
      },
    });
  }
  if (!map.getLayer(SOURCE_FILL_LAYER_ID)) {
    map.addLayer({
      id: SOURCE_FILL_LAYER_ID,
      type: "fill",
      source: SOURCE_SOURCE_ID,
      layout: {
        visibility: sourceVisibility,
      },
      paint: {
        "fill-color": buildViewabilityColorExpression(colorScaleSettings, "source_viewyness_score") as DataDrivenPropertyValueSpecification<string>,
        "fill-opacity": 0.8,
      },
    });
  }
  if (!map.getLayer(SOURCE_LINE_LAYER_ID)) {
    map.addLayer({
      id: SOURCE_LINE_LAYER_ID,
      type: "line",
      source: SOURCE_SOURCE_ID,
      layout: {
        visibility: sourceVisibility,
      },
      paint: {
        "line-color": lineColors.source,
        "line-width": ["interpolate", ["linear"], ["zoom"], 5, 1.4, 9, 2.8],
        "line-dasharray": [1.4, 1],
        "line-opacity": 0.9,
      },
    });
  }
  if (!map.getLayer(SOURCE_SELECTED_LAYER_ID)) {
    map.addLayer({
      id: SOURCE_SELECTED_LAYER_ID,
      type: "line",
      source: SOURCE_SOURCE_ID,
      filter: ["==", ["get", "h3"], ""],
      layout: {
        visibility: selectedSourceVisibility,
      },
      paint: {
        "line-color": "rgba(255,255,255,0.72)",
        "line-width": ["interpolate", ["linear"], ["zoom"], 5, 3, 9, 5],
      },
    });
  }
}

function getViewabilityLineColors(paletteId: ViewabilityColorScaleSettings["paletteId"]) {
  if (paletteId === "relief_atlas") {
    return {
      target: "rgba(247,244,232,0.2)",
      source: "rgba(31,102,112,0.42)",
    };
  }
  if (paletteId === "red_atlas") {
    return {
      target: "rgba(220,164,154,0.2)",
      source: "rgba(190,76,68,0.42)",
    };
  }
  return {
    target: "rgba(193,255,250,0.18)",
    source: "rgba(25,240,215,0.42)",
  };
}

function bindInteractions(
  map: MapLibreMap,
  popupRef: MutableRefObject<maplibregl.Popup | null>,
  onSelectSourceCellRef: MutableRefObject<(sourceCellId: string) => void>
) {
  map.on("mouseenter", SOURCE_FILL_LAYER_ID, () => {
    map.getCanvas().style.cursor = "pointer";
  });
  map.on("mouseleave", SOURCE_FILL_LAYER_ID, () => {
    map.getCanvas().style.cursor = "";
    popupRef.current?.remove();
  });
  map.on("click", SOURCE_FILL_LAYER_ID, (event) => {
    const h3 = event.features?.[0]?.properties?.h3;
    popupRef.current?.remove();
    if (typeof h3 === "string") onSelectSourceCellRef.current(h3);
  });
  map.on("mousemove", TARGET_FILL_LAYER_ID, (event) => {
    const feature = event.features?.[0];
    if (!feature || !event.lngLat) return;
    const props = feature.properties as Record<string, unknown>;
    popupRef.current?.setLngLat(event.lngLat).setHTML(targetTooltipHtml(props)).addTo(map);
  });
  map.on("mouseleave", TARGET_FILL_LAYER_ID, () => {
    popupRef.current?.remove();
  });
}

async function loadPoiData(
  loadedRef: MutableRefObject<boolean>,
  dataRef: MutableRefObject<Array<{ type: string; name: string; latitude: number; longitude: number }> | null>
) {
  if (loadedRef.current && dataRef.current) return dataRef.current;
  const base = import.meta.env.BASE_URL || "/";
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  const candidates = Array.from(new Set([
    `${normalizedBase}data/places_of_interest.json`,
    "/data/places_of_interest.json",
    "data/places_of_interest.json",
  ]));
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
        | { features?: Array<{ properties?: Record<string, unknown>; geometry?: { coordinates?: [number, number] } }> };

      const items = Array.isArray(payload)
        ? payload.map((entry) => ({
            type: String((entry as { type?: string }).type ?? ""),
            name: String((entry as { name?: string }).name ?? "POI"),
            latitude: Number((entry as { latitude?: number }).latitude),
            longitude: Number((entry as { longitude?: number }).longitude),
          }))
        : "items" in payload && Array.isArray(payload.items)
          ? payload.items.map((entry) => ({
              type: String(entry.type ?? ""),
              name: String(entry.name ?? "POI"),
              latitude: Number(entry.latitude),
              longitude: Number(entry.longitude),
            }))
          : "features" in payload && Array.isArray(payload.features)
            ? payload.features.map((feature) => {
                const props = feature.properties ?? {};
                const coordinates = feature.geometry?.coordinates ?? [Number.NaN, Number.NaN];
                return {
                  type: String(props.type ?? props.category ?? ""),
                  name: String(props.name ?? "POI"),
                  latitude: Number(coordinates[1]),
                  longitude: Number(coordinates[0]),
                };
              })
            : [];

      loadedRef.current = true;
      dataRef.current = items;
      return items;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError ?? new Error("Failed to load POI data");
}

function targetTooltipHtml(props: Record<string, unknown>) {
  if (props.source_target_weight !== undefined) {
    return `
      <div class="viewabilityPopup__title">Target cell</div>
      <div>${escapeHtml(String(props.h3 ?? "-"))}</div>
      <dl>
        <dt>Active source-target weight</dt><dd>${formatScore(Number(props.source_target_weight))}</dd>
        <dt>Base source-target weight</dt><dd>${formatScore(Number(props.base_source_target_weight))}</dd>
        <dt>Dynamic source-target weight</dt><dd>${formatScore(Number(props.dynamic_source_target_weight))}</dd>
        <dt>Dynamic modifier</dt><dd>${formatScore(Number(props.source_target_modifier))}</dd>
        <dt>Distance km</dt><dd>${formatScore(Number(props.distance_km))}</dd>
        <dt>Terrain weight</dt><dd>${formatScore(Number(props.weight_terrain))}</dd>
        <dt>Vegetation weight</dt><dd>${formatScore(Number(props.weight_vegetation))}</dd>
        <dt>Distance weight</dt><dd>${formatScore(Number(props.weight_distance))}</dd>
      </dl>
    `;
  }
  return `
    <div class="viewabilityPopup__title">Target cell</div>
    <div>${escapeHtml(String(props.h3 ?? "-"))}</div>
    <dl>
      <dt>Base score</dt><dd>${formatScore(Number(props.base_viewability_score))}</dd>
      <dt>Dynamic score</dt><dd>${formatScore(Number(props.dynamic_viewability_score))}</dd>
    </dl>
  `;
}
