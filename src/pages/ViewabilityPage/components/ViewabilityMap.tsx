import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import maplibregl, { Map as MapLibreMap, type FilterSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Feature, GeoJsonProperties, MultiPolygon, Point, Polygon, Position } from "geojson";
import type {
  SourceTargetVisibilityRecord,
  ViewabilityColorScaleSettings,
  ViewabilityDisplayMode,
  ViewabilityMapMode,
  ViewabilityScoreType,
  ViewabilitySourceFeatureCollection,
  ViewabilityTargetFeatureCollection,
} from "../../../data/viewabilityTypes";
import { applyBasemapVisualTuning, DARK_STYLE, DEFAULT_CENTER, DEFAULT_ZOOM, VOYAGER_STYLE } from "../../../components/ForecastMap/buildLayers";
import type { ViewabilityAreaSelectionTool, ViewabilitySelectionMode } from "../useViewabilityPageController";
import { buildInspectorSourceCells, buildInspectorTargetCells } from "../utils/viewabilityLayerBuilders";
import { buildViewabilityColorExpression, getViewabilityScoreProperty } from "../utils/viewabilityColorScales";
import {
  addLayers,
  DRAW_SOURCE_ID,
  SOURCE_FILL_LAYER_ID,
  SOURCE_HIT_LAYER_ID,
  SOURCE_HOVER_LAYER_ID,
  SOURCE_LINE_LAYER_ID,
  SOURCE_SELECTED_LAYER_ID,
  SOURCE_SMOOTH_LAYER_ID,
  SOURCE_SMOOTH_SOURCE_ID,
  SOURCE_SOURCE_ID,
  getViewabilityLineColors,
  setLayerVisibility,
  TARGET_FILL_LAYER_ID,
  TARGET_HIT_LAYER_ID,
  TARGET_LINE_LAYER_ID,
  TARGET_SELECTED_LAYER_ID,
  TARGET_SMOOTH_LAYER_ID,
  TARGET_SMOOTH_SOURCE_ID,
  TARGET_SOURCE_ID,
} from "./ViewabilityMap/viewabilityMapLayers";
import { bindInteractions } from "./ViewabilityMap/viewabilityMapInteractions";
import { loadPoiData } from "./ViewabilityMap/viewabilityPoiMarkers";
import {
  applyAreaSelectionDraft,
  createEmptyAreaSelectionDraft,
  emptyFeatureCollection,
  type AreaSelectionDraft,
  syncAreaSelectionDraft,
} from "./ViewabilityMap/viewabilityAreaDrawing";
import { buildSmoothSurfaceOverlay, upsertSmoothSurface } from "./ViewabilityMap/viewabilitySmoothSurface";
import { distanceKm } from "./ViewabilityMap/viewabilityGeometryMath";
import { escapeHtml } from "./ViewabilityMap/viewabilityTooltips";

type Props = {
  darkMode: boolean;
  targetCells: ViewabilityTargetFeatureCollection | null;
  sourceCells: ViewabilitySourceFeatureCollection | null;
  selectedTargetVisibility: SourceTargetVisibilityRecord[];
  selectedSourceVisibility: SourceTargetVisibilityRecord[];
  poiFilters: { Park: boolean; Marina: boolean; Ferry: boolean };
  mode: ViewabilityMapMode;
  scoreType: ViewabilityScoreType;
  displayMode: ViewabilityDisplayMode;
  showTargetCells: boolean;
  showSourceCells: boolean;
  selectedSourceCellId: string | null;
  selectedSourceCellIds: string[];
  selectedTargetCellIds: string[];
  hoveredSourceCellId: string | null;
  colorScaleSettings: ViewabilityColorScaleSettings;
  selectionMode: ViewabilitySelectionMode;
  areaSelectionTool: ViewabilityAreaSelectionTool;
  drawSelectionKind: "target" | "source";
  onAreaSelectionMetricsChange: (areaKm2: number, ready: boolean) => void;
  onSelectSourceCell: (sourceCellId: string, additive?: boolean) => void;
  onSelectSourceCells: (sourceCellIds: string[], additive?: boolean) => void;
  onSelectTargetCell: (targetCellId: string, additive?: boolean) => void;
  onSelectTargetCells: (targetCellIds: string[], additive?: boolean) => void;
};

export type ViewabilityMapHandle = {
  captureSnapshot: () => Promise<Blob | null>;
  clearAreaSelection: () => void;
  confirmAreaSelection: () => boolean;
};

export const ViewabilityMap = forwardRef<ViewabilityMapHandle, Props>(function ViewabilityMap({
  darkMode,
  targetCells,
  sourceCells,
  selectedTargetVisibility,
  selectedSourceVisibility,
  poiFilters,
  mode,
  scoreType,
  displayMode,
  showTargetCells,
  showSourceCells,
  selectedSourceCellId,
  selectedSourceCellIds,
  selectedTargetCellIds,
  hoveredSourceCellId,
  colorScaleSettings,
  selectionMode,
  areaSelectionTool,
  drawSelectionKind,
  onAreaSelectionMetricsChange,
  onSelectSourceCell,
  onSelectSourceCells,
  onSelectTargetCell,
  onSelectTargetCells,
}, ref) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const poiMarkersRef = useRef<maplibregl.Marker[]>([]);
  const poiLoadedRef = useRef(false);
  const poiDataRef = useRef<Array<{ type: string; name: string; latitude: number; longitude: number }> | null>(null);
  const onSelectSourceCellRef = useRef(onSelectSourceCell);
  const onSelectSourceCellsRef = useRef(onSelectSourceCells);
  const onSelectTargetCellRef = useRef(onSelectTargetCell);
  const onSelectTargetCellsRef = useRef(onSelectTargetCells);
  const mapTargetsRef = useRef<ViewabilityTargetFeatureCollection | null>(null);
  const mapSourcesRef = useRef<ViewabilitySourceFeatureCollection | null>(null);
  const scoreTypeRef = useRef(scoreType);
  const displayModeRef = useRef(displayMode);
  const colorScaleSettingsRef = useRef(colorScaleSettings);
  const showTargetCellsRef = useRef(showTargetCells);
  const showSourceCellsRef = useRef(showSourceCells);
  const selectedSourceCellIdRef = useRef(selectedSourceCellId);
  const selectionModeRef = useRef(selectionMode);
  const areaSelectionToolRef = useRef(areaSelectionTool);
  const drawSelectionKindRef = useRef(drawSelectionKind);
  const onAreaSelectionMetricsChangeRef = useRef(onAreaSelectionMetricsChange);
  const areaSelectionDraftRef = useRef<AreaSelectionDraft>(createEmptyAreaSelectionDraft(areaSelectionTool));
  const [mapReady, setMapReady] = useState(false);
  const mapReadyRef = useRef(false);

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
      clearAreaSelection: () => {
        const map = mapRef.current;
        if (!map) return;
        areaSelectionDraftRef.current = createEmptyAreaSelectionDraft(areaSelectionToolRef.current);
        syncAreaSelectionDraft(map, areaSelectionDraftRef.current, onAreaSelectionMetricsChangeRef);
        if (!map.dragPan.isEnabled()) {
          map.dragPan.enable();
        }
      },
      confirmAreaSelection: () => {
        const map = mapRef.current;
        if (!map) return false;
        return applyAreaSelectionDraft(
          areaSelectionDraftRef.current,
          drawSelectionKindRef.current,
          mapSourcesRef.current?.features ?? [],
          mapTargetsRef.current?.features ?? [],
          onSelectSourceCellsRef,
          onSelectTargetCellsRef
        );
      },
    }),
    []
  );

  useEffect(() => {
    onSelectSourceCellRef.current = onSelectSourceCell;
  }, [onSelectSourceCell]);

  useEffect(() => {
    onSelectSourceCellsRef.current = onSelectSourceCells;
  }, [onSelectSourceCells]);

  useEffect(() => {
    onSelectTargetCellRef.current = onSelectTargetCell;
  }, [onSelectTargetCell]);

  useEffect(() => {
    onSelectTargetCellsRef.current = onSelectTargetCells;
  }, [onSelectTargetCells]);

  useEffect(() => {
    onAreaSelectionMetricsChangeRef.current = onAreaSelectionMetricsChange;
  }, [onAreaSelectionMetricsChange]);

  const mapTargets = useMemo(
    () => (mode === "source-inspector" ? buildInspectorTargetCells(targetCells, selectedTargetVisibility, scoreType) : targetCells),
    [mode, scoreType, selectedTargetVisibility, targetCells]
  );

  const mapSources = useMemo(
    () => (mode === "target-inspector" ? buildInspectorSourceCells(sourceCells, selectedSourceVisibility, scoreType) : sourceCells),
    [mode, scoreType, selectedSourceVisibility, sourceCells]
  );

  const sharedSourceTargetCellIds = useMemo(
    () =>
      new Set(
        (sourceCells?.features ?? [])
          .map((feature) => feature.properties.h3)
          .filter((h3): h3 is string => typeof h3 === "string" && h3.length > 0)
      ),
    [sourceCells]
  );

  const smoothTargetFeatures = useMemo(() => {
    const features = mapTargets?.features ?? [];
    if (mode === "target-inspector") {
      const selectedIds = new Set(selectedTargetCellIds);
      return features.filter((feature) => {
        const h3 = feature.properties.h3;
        return typeof h3 === "string" && selectedIds.has(h3);
      });
    }
    if (mode === "source-inspector") {
      return features.filter((feature) => Boolean((feature.properties as Record<string, unknown>).visible_from_selected_source));
    }
    return features;
  }, [mapTargets, mode, selectedTargetCellIds]);

  const smoothSourceFeatures = useMemo(() => {
    const features = mapSources?.features ?? [];
    if (mode === "target-inspector") {
      return features.filter((feature) => Boolean((feature.properties as Record<string, unknown>).visible_to_selected_target));
    }
    if (mode === "source-inspector") {
      const selectedIds = new Set(selectedSourceCellIds);
      return features.filter((feature) => {
        const h3 = feature.properties.h3;
        return typeof h3 === "string" && selectedIds.has(h3);
      });
    }
    return features;
  }, [mapSources, mode, selectedSourceCellIds]);

  useEffect(() => {
    mapTargetsRef.current = mapTargets;
    mapSourcesRef.current = mapSources;
    scoreTypeRef.current = scoreType;
    displayModeRef.current = displayMode;
    colorScaleSettingsRef.current = colorScaleSettings;
    showTargetCellsRef.current = showTargetCells;
    showSourceCellsRef.current = showSourceCells;
    selectedSourceCellIdRef.current = selectedSourceCellId;
    selectionModeRef.current = selectionMode;
    areaSelectionToolRef.current = areaSelectionTool;
    drawSelectionKindRef.current = drawSelectionKind;
    mapReadyRef.current = mapReady;
  }, [
    areaSelectionTool,
    colorScaleSettings,
    displayMode,
    drawSelectionKind,
    mapReady,
    mapSources,
    mapTargets,
    scoreType,
    selectedSourceCellId,
    selectedSourceCellIds,
    selectedTargetCellIds,
    selectionMode,
    showSourceCells,
    showTargetCells,
  ]);

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
        map.addSource(SOURCE_SOURCE_ID, { type: "geojson", data: mapSourcesRef.current ?? { type: "FeatureCollection", features: [] } });
      }
      if (!map.getSource(DRAW_SOURCE_ID)) {
        map.addSource(DRAW_SOURCE_ID, { type: "geojson", data: emptyFeatureCollection() });
      }
      addLayers(map, colorScaleSettingsRef.current, getViewabilityScoreProperty(scoreTypeRef.current), {
        displayMode: displayModeRef.current,
        showTargetCells: showTargetCellsRef.current,
        showSourceCells: showSourceCellsRef.current,
        selectedSourceCellId: selectedSourceCellIdRef.current,
      });
      bindInteractions(map, popupRef, onSelectSourceCellRef, onSelectTargetCellRef, selectionModeRef);
      mapReadyRef.current = true;
      setMapReady(true);
    });

    return () => {
      mapReadyRef.current = false;
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
    if (!map || !mapReady) return;
    const targetSource = map.getSource(TARGET_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    targetSource?.setData(mapTargets ?? { type: "FeatureCollection", features: [] });
  }, [mapReady, mapTargets]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const source = map.getSource(SOURCE_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    source?.setData(mapSources ?? { type: "FeatureCollection", features: [] });
  }, [mapReady, mapSources]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !map.getLayer(TARGET_FILL_LAYER_ID)) return;
    const targetPropertyName = getViewabilityScoreProperty(scoreType);
    const sourcePropertyName = mode === "target-inspector" ? "source_target_weight" : "source_viewyness_score";
    const selectedTargetIds = selectedTargetCellIds.length > 0 ? selectedTargetCellIds : ["__none__"];
    const sharedIds = sharedSourceTargetCellIds.size > 0 ? Array.from(sharedSourceTargetCellIds) : ["__none__"];
    const hideTargetInvisibleSourcesExpression = [
      "all",
      ["==", ["literal", mode], "target-inspector"],
      ["!", ["coalesce", ["get", "visible_to_selected_target"], false]],
    ] as const;
    const dimUnselectedSourcesExpression = [
      "all",
      ["==", ["literal", mode], "source-inspector"],
      [">", ["literal", selectedSourceCellIds.length], 0],
      ["!", ["in", ["get", "h3"], ["literal", selectedSourceCellIds.length > 0 ? selectedSourceCellIds : ["__none__"]]]],
    ] as const;
    const lineColors = getViewabilityLineColors(colorScaleSettings.paletteId);

    map.setPaintProperty(TARGET_FILL_LAYER_ID, "fill-color", buildViewabilityColorExpression(colorScaleSettings, targetPropertyName));
    map.setPaintProperty(TARGET_LINE_LAYER_ID, "line-color", lineColors.target);
    map.setPaintProperty(SOURCE_FILL_LAYER_ID, "fill-color", buildViewabilityColorExpression(colorScaleSettings, sourcePropertyName));
    map.setPaintProperty(TARGET_FILL_LAYER_ID, "fill-opacity", [
      "case",
      ["all", ["==", ["literal", mode], "source-inspector"], ["!", ["coalesce", ["get", "visible_from_selected_source"], false]]],
      0,
      [
        "all",
        ["in", ["get", "h3"], ["literal", selectedTargetIds]],
        ["!", ["in", ["get", "h3"], ["literal", sharedIds]]],
      ],
      0,
      0.88,
    ]);
    map.setPaintProperty(TARGET_LINE_LAYER_ID, "line-opacity", [
      "case",
      ["all", ["==", ["literal", mode], "source-inspector"], ["!", ["coalesce", ["get", "visible_from_selected_source"], false]]],
      0,
      1,
    ]);
    map.setPaintProperty(SOURCE_FILL_LAYER_ID, "fill-opacity", [
      "case",
      hideTargetInvisibleSourcesExpression,
      0,
      dimUnselectedSourcesExpression,
      0.18,
      0.8,
    ]);
    map.setPaintProperty(SOURCE_LINE_LAYER_ID, "line-opacity", [
      "case",
      hideTargetInvisibleSourcesExpression,
      0,
      dimUnselectedSourcesExpression,
      0.22,
      0.95,
    ]);
    map.setPaintProperty(SOURCE_LINE_LAYER_ID, "line-width", [
      "interpolate",
      ["linear"],
      ["zoom"],
      5,
      ["case", hideTargetInvisibleSourcesExpression, 0, dimUnselectedSourcesExpression, 1.1, 1.6],
      9,
      ["case", hideTargetInvisibleSourcesExpression, 0, dimUnselectedSourcesExpression, 2.2, 3.0],
    ]);
  }, [colorScaleSettings, mapReady, mode, scoreType, selectedSourceCellIds, selectedTargetCellIds, sharedSourceTargetCellIds]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const showInspectorTargets = mode !== "overview";
    const showSmoothSurface = displayMode === "smooth";
    const showInspectorSources = mode !== "overview";
    setLayerVisibility(map, TARGET_SMOOTH_LAYER_ID, showSmoothSurface && (showTargetCells || showInspectorTargets));
    setLayerVisibility(map, SOURCE_SMOOTH_LAYER_ID, showSmoothSurface && (showSourceCells || showInspectorSources));
    setLayerVisibility(map, TARGET_FILL_LAYER_ID, !showSmoothSurface && (showTargetCells || showInspectorTargets));
    setLayerVisibility(map, TARGET_LINE_LAYER_ID, !showSmoothSurface && (showTargetCells || showInspectorTargets));
    setLayerVisibility(map, TARGET_HIT_LAYER_ID, showTargetCells || showInspectorTargets);
    setLayerVisibility(map, TARGET_SELECTED_LAYER_ID, selectedTargetCellIds.length > 0);
    setLayerVisibility(map, SOURCE_FILL_LAYER_ID, !showSmoothSurface && (showSourceCells || showInspectorSources));
    setLayerVisibility(map, SOURCE_LINE_LAYER_ID, !showSmoothSurface && (showSourceCells || showInspectorSources));
    setLayerVisibility(map, SOURCE_HIT_LAYER_ID, showSourceCells || showInspectorSources);
    setLayerVisibility(map, SOURCE_SELECTED_LAYER_ID, selectedSourceCellIds.length > 0);
    setLayerVisibility(map, SOURCE_HOVER_LAYER_ID, (showSourceCells || showInspectorSources) && Boolean(hoveredSourceCellId));
  }, [displayMode, hoveredSourceCellId, mapReady, mode, selectedSourceCellIds, selectedTargetCellIds, showSourceCells, showTargetCells]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (displayMode !== "smooth") return;
    const targetOverlay = buildSmoothSurfaceOverlay(
      smoothTargetFeatures as Array<Feature<Polygon | MultiPolygon | Point, GeoJsonProperties>>,
      getViewabilityScoreProperty(scoreType),
      colorScaleSettings
    );
    const sourceOverlay = buildSmoothSurfaceOverlay(
      smoothSourceFeatures as Array<Feature<Polygon | MultiPolygon | Point, GeoJsonProperties>>,
      mode === "target-inspector" ? "source_target_weight" : "source_viewyness_score",
      colorScaleSettings
    );
    upsertSmoothSurface(map, TARGET_SMOOTH_SOURCE_ID, targetOverlay);
    upsertSmoothSurface(map, SOURCE_SMOOTH_SOURCE_ID, sourceOverlay);
  }, [colorScaleSettings, displayMode, mapReady, mode, scoreType, smoothSourceFeatures, smoothTargetFeatures]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !map.getLayer(TARGET_SELECTED_LAYER_ID)) return;
    map.setFilter(
      TARGET_SELECTED_LAYER_ID,
      selectedTargetCellIds.length > 0
        ? ["in", ["get", "h3"], ["literal", selectedTargetCellIds]]
        : ["==", ["get", "h3"], ""]
    );
  }, [mapReady, selectedTargetCellIds]);

  useEffect(() => {
    const map = mapRef.current;
    if (
      !map ||
      !mapReady ||
      !map.getLayer(TARGET_FILL_LAYER_ID) ||
      !map.getLayer(TARGET_LINE_LAYER_ID) ||
      !map.getLayer(TARGET_HIT_LAYER_ID) ||
      !map.getLayer(SOURCE_FILL_LAYER_ID) ||
      !map.getLayer(SOURCE_LINE_LAYER_ID) ||
      !map.getLayer(SOURCE_HIT_LAYER_ID)
    ) {
      return;
    }

    if (mode === "target-inspector") {
      const selectedFilter: FilterSpecification =
        selectedTargetCellIds.length > 0
          ? ["in", ["get", "h3"], ["literal", selectedTargetCellIds]]
          : ["==", ["get", "h3"], ""];
      const visibleSourceFilter: FilterSpecification = ["==", ["get", "visible_to_selected_target"], true];
      map.setFilter(TARGET_FILL_LAYER_ID, selectedFilter);
      map.setFilter(TARGET_LINE_LAYER_ID, null);
      map.setFilter(TARGET_HIT_LAYER_ID, null);
      map.setFilter(SOURCE_FILL_LAYER_ID, visibleSourceFilter);
      map.setFilter(SOURCE_LINE_LAYER_ID, visibleSourceFilter);
      map.setFilter(SOURCE_HIT_LAYER_ID, visibleSourceFilter);
      return;
    }

    map.setFilter(TARGET_FILL_LAYER_ID, null);
    map.setFilter(TARGET_LINE_LAYER_ID, null);
    map.setFilter(TARGET_HIT_LAYER_ID, null);
    map.setFilter(SOURCE_FILL_LAYER_ID, null);
    map.setFilter(SOURCE_LINE_LAYER_ID, null);
    map.setFilter(SOURCE_HIT_LAYER_ID, null);
  }, [mapReady, mode, selectedTargetCellIds]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !map.getLayer(SOURCE_SELECTED_LAYER_ID)) return;
    map.setFilter(
      SOURCE_SELECTED_LAYER_ID,
      selectedSourceCellIds.length > 0
        ? ["in", ["get", "h3"], ["literal", selectedSourceCellIds]]
        : ["==", ["get", "h3"], ""]
    );
  }, [mapReady, selectedSourceCellIds]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !map.getLayer(SOURCE_HOVER_LAYER_ID)) return;
    map.setFilter(SOURCE_HOVER_LAYER_ID, ["==", ["get", "h3"], hoveredSourceCellId ?? ""]);
  }, [hoveredSourceCellId, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReadyRef.current || !map.getSource(DRAW_SOURCE_ID)) return;
    syncAreaSelectionDraft(map, areaSelectionDraftRef.current, onAreaSelectionMetricsChangeRef);

    const handleMouseDown = (event: maplibregl.MapMouseEvent) => {
      if (selectionModeRef.current !== "area" || event.originalEvent.button !== 0) return;
      const point: Position = [event.lngLat.lng, event.lngLat.lat];
      const tool = areaSelectionToolRef.current;
      if (tool === "freehand") {
        event.preventDefault();
        map.dragPan.disable();
        areaSelectionDraftRef.current = {
          tool,
          points: [point],
          active: true,
          cursorPoint: null,
          circleCenter: null,
          circleRadiusKm: 0,
        };
        syncAreaSelectionDraft(map, areaSelectionDraftRef.current, onAreaSelectionMetricsChangeRef);
        return;
      }
      if (tool === "circle") {
        event.preventDefault();
        map.dragPan.disable();
        areaSelectionDraftRef.current = {
          tool,
          points: [],
          active: true,
          cursorPoint: null,
          circleCenter: point,
          circleRadiusKm: 0,
        };
        syncAreaSelectionDraft(map, areaSelectionDraftRef.current, onAreaSelectionMetricsChangeRef);
      }
    };

    const handleMouseMove = (event: maplibregl.MapMouseEvent) => {
      const point: Position = [event.lngLat.lng, event.lngLat.lat];
      const draft = areaSelectionDraftRef.current;
      if (selectionModeRef.current !== "area") return;
      if (draft.tool === "freehand" && draft.active) {
        areaSelectionDraftRef.current = {
          ...draft,
          points: [...draft.points, point],
        };
        syncAreaSelectionDraft(map, areaSelectionDraftRef.current, onAreaSelectionMetricsChangeRef);
        return;
      }
      if (draft.tool === "polygon" && draft.points.length > 0) {
        areaSelectionDraftRef.current = {
          ...draft,
          cursorPoint: point,
        };
        syncAreaSelectionDraft(map, areaSelectionDraftRef.current, onAreaSelectionMetricsChangeRef);
        return;
      }
      if (draft.tool === "circle" && draft.active && draft.circleCenter) {
        areaSelectionDraftRef.current = {
          ...draft,
          circleRadiusKm: distanceKm(draft.circleCenter, point),
        };
        syncAreaSelectionDraft(map, areaSelectionDraftRef.current, onAreaSelectionMetricsChangeRef);
      }
    };

    const handleMouseUp = () => {
      const draft = areaSelectionDraftRef.current;
      if (!draft.active) return;
      if (!map.dragPan.isEnabled()) {
        map.dragPan.enable();
      }
      areaSelectionDraftRef.current = {
        ...draft,
        active: false,
      };
      syncAreaSelectionDraft(map, areaSelectionDraftRef.current, onAreaSelectionMetricsChangeRef);
    };

    const handleClick = (event: maplibregl.MapMouseEvent) => {
      if (selectionModeRef.current !== "area" || areaSelectionToolRef.current !== "polygon") return;
      const point: Position = [event.lngLat.lng, event.lngLat.lat];
      const draft = areaSelectionDraftRef.current;
      areaSelectionDraftRef.current = {
        tool: "polygon",
        points: [...draft.points, point],
        active: false,
        cursorPoint: point,
        circleCenter: null,
        circleRadiusKm: 0,
      };
      syncAreaSelectionDraft(map, areaSelectionDraftRef.current, onAreaSelectionMetricsChangeRef);
    };

    const finalizePolygonDraft = (event?: maplibregl.MapMouseEvent) => {
      if (selectionModeRef.current !== "area" || areaSelectionToolRef.current !== "polygon") return;
      const draft = areaSelectionDraftRef.current;
      if (draft.points.length === 0) return;

      const finalPoint = event ? ([event.lngLat.lng, event.lngLat.lat] as Position) : null;
      const lastPoint = draft.points.at(-1) ?? null;
      const shouldAppendFinalPoint = finalPoint
        && (!lastPoint || lastPoint[0] !== finalPoint[0] || lastPoint[1] !== finalPoint[1]);

      areaSelectionDraftRef.current = {
        tool: "polygon",
        points: shouldAppendFinalPoint ? [...draft.points, finalPoint] : draft.points,
        active: false,
        cursorPoint: null,
        circleCenter: null,
        circleRadiusKm: 0,
      };
      syncAreaSelectionDraft(map, areaSelectionDraftRef.current, onAreaSelectionMetricsChangeRef);
    };

    const handleDoubleClick = (event: maplibregl.MapMouseEvent) => {
      if (selectionModeRef.current !== "area" || areaSelectionToolRef.current !== "polygon") return;
      event.preventDefault();
      finalizePolygonDraft(event);
    };

    const handleContextMenu = (event: maplibregl.MapMouseEvent) => {
      if (selectionModeRef.current !== "area" || areaSelectionToolRef.current !== "polygon") return;
      event.preventDefault();
      finalizePolygonDraft(event);
    };

    map.on("mousedown", handleMouseDown);
    map.on("mousemove", handleMouseMove);
    map.on("mouseup", handleMouseUp);
    map.on("click", handleClick);
    map.on("dblclick", handleDoubleClick);
    map.on("contextmenu", handleContextMenu);

    return () => {
      map.off("mousedown", handleMouseDown);
      map.off("mousemove", handleMouseMove);
      map.off("mouseup", handleMouseUp);
      map.off("click", handleClick);
      map.off("dblclick", handleDoubleClick);
      map.off("contextmenu", handleContextMenu);
    };
  }, [mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.getCanvas().style.cursor = selectionMode === "area" ? "crosshair" : "";
    if (selectionMode !== "area") {
      areaSelectionDraftRef.current = createEmptyAreaSelectionDraft(areaSelectionToolRef.current);
      syncAreaSelectionDraft(map, areaSelectionDraftRef.current, onAreaSelectionMetricsChangeRef);
      if (!map.dragPan.isEnabled()) {
        map.dragPan.enable();
      }
    }
    if (selectionMode === "area") map.doubleClickZoom.disable();
    else map.doubleClickZoom.enable();
    return () => {
      if (selectionMode !== "area" && map.getCanvas().style.cursor === "crosshair") {
        map.getCanvas().style.cursor = "";
      }
    };
  }, [selectionMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || selectionMode !== "area") return;
    areaSelectionDraftRef.current = createEmptyAreaSelectionDraft(areaSelectionTool);
    syncAreaSelectionDraft(map, areaSelectionDraftRef.current, onAreaSelectionMetricsChangeRef);
  }, [areaSelectionTool, mapReady, selectionMode]);

  return (
    <div className="mapStage viewabilityMapStage">
      <div ref={containerRef} className="map" data-tour="viewability-map-canvas" />
    </div>
  );
});
