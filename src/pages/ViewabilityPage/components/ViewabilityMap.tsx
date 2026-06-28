import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState, type MutableRefObject } from "react";
import maplibregl, { Map as MapLibreMap, type DataDrivenPropertyValueSpecification, type FilterSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Feature, FeatureCollection, GeoJsonProperties, Geometry, LineString, MultiPolygon, Point, Polygon, Position } from "geojson";
import type {
  SourceTargetVisibilityRecord,
  ViewabilityColorScaleSettings,
  ViewabilityMapMode,
  ViewabilityScoreType,
  ViewabilitySourceFeatureCollection,
  ViewabilityTargetFeatureCollection,
} from "../../../data/viewabilityTypes";
import { applyBasemapVisualTuning, DARK_STYLE, DEFAULT_CENTER, DEFAULT_ZOOM, VOYAGER_STYLE } from "../../../components/ForecastMap/buildLayers";
import type { ViewabilityAreaSelectionTool, ViewabilitySelectionMode } from "../useViewabilityPageController";
import { buildInspectorSourceCells, buildInspectorTargetCells } from "../utils/viewabilityLayerBuilders";
import { buildViewabilityColorExpression, formatScore, getViewabilityScoreProperty } from "../utils/viewabilityColorScales";

const TARGET_SOURCE_ID = "viewability-target-cells";
const SOURCE_SOURCE_ID = "viewability-source-cells";
const TARGET_FILL_LAYER_ID = "viewability-target-fill";
const TARGET_LINE_LAYER_ID = "viewability-target-line";
const TARGET_HIT_LAYER_ID = "viewability-target-hit";
const TARGET_SELECTED_LAYER_ID = "viewability-target-selected";
const DRAW_SOURCE_ID = "viewability-draw-selection";
const DRAW_FILL_LAYER_ID = "viewability-draw-selection-fill";
const DRAW_LINE_LAYER_ID = "viewability-draw-selection-line";
const SOURCE_FILL_LAYER_ID = "viewability-source-fill";
const SOURCE_LINE_LAYER_ID = "viewability-source-line";
const SOURCE_SELECTED_LAYER_ID = "viewability-source-selected";
const SOURCE_HOVER_LAYER_ID = "viewability-source-hover";

type Props = {
  darkMode: boolean;
  targetCells: ViewabilityTargetFeatureCollection | null;
  sourceCells: ViewabilitySourceFeatureCollection | null;
  selectedTargetVisibility: SourceTargetVisibilityRecord[];
  selectedSourceVisibility: SourceTargetVisibilityRecord[];
  poiFilters: { Park: boolean; Marina: boolean; Ferry: boolean };
  mode: ViewabilityMapMode;
  scoreType: ViewabilityScoreType;
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

type AreaSelectionDraft = {
  tool: ViewabilityAreaSelectionTool;
  points: Position[];
  active: boolean;
  cursorPoint: Position | null;
  circleCenter: Position | null;
  circleRadiusKm: number;
};

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function setVisibility(map: MapLibreMap, layerId: string, visible: boolean) {
  if (map.getLayer(layerId)) {
    map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
  }
}

export const ViewabilityMap = forwardRef<ViewabilityMapHandle, Props>(function ViewabilityMap({
  darkMode,
  targetCells,
  sourceCells,
  selectedTargetVisibility,
  selectedSourceVisibility,
  poiFilters,
  mode,
  scoreType,
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

  useEffect(() => {
    mapTargetsRef.current = mapTargets;
    mapSourcesRef.current = mapSources;
    scoreTypeRef.current = scoreType;
    colorScaleSettingsRef.current = colorScaleSettings;
    showTargetCellsRef.current = showTargetCells;
    showSourceCellsRef.current = showSourceCells;
    selectedSourceCellIdRef.current = selectedSourceCellId;
    selectionModeRef.current = selectionMode;
    areaSelectionToolRef.current = areaSelectionTool;
    drawSelectionKindRef.current = drawSelectionKind;
  }, [areaSelectionTool, colorScaleSettings, drawSelectionKind, mapSources, mapTargets, scoreType, selectedSourceCellId, selectedSourceCellIds, selectedTargetCellIds, selectionMode, showSourceCells, showTargetCells]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    setMapReady(false);

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
        showTargetCells: showTargetCellsRef.current,
        showSourceCells: showSourceCellsRef.current,
        selectedSourceCellId: selectedSourceCellIdRef.current,
      });
      bindInteractions(map, popupRef, onSelectSourceCellRef, onSelectTargetCellRef, selectionModeRef);
      setMapReady(true);
    });

    return () => {
      popupRef.current?.remove();
      poiMarkersRef.current.forEach((marker) => marker.remove());
      poiMarkersRef.current = [];
      map.remove();
      mapRef.current = null;
      setMapReady(false);
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
    const lineColors = getViewabilityLineColors(colorScaleSettings.paletteId);
    const selectedIds = selectedSourceCellIds.length > 0 ? selectedSourceCellIds : ["__none__"];
    const hideUnselectedSourceSelectionsExpression = [
      "all",
      ["==", ["literal", mode], "source-inspector"],
      ["!", ["in", ["get", "h3"], ["literal", selectedIds]]],
    ] as const;
    const hideTargetInvisibleSourcesExpression = [
      "all",
      ["==", ["literal", mode], "target-inspector"],
      ["!", ["coalesce", ["get", "visible_to_selected_target"], false]],
    ] as const;
    map.setPaintProperty(TARGET_FILL_LAYER_ID, "fill-color", buildViewabilityColorExpression(colorScaleSettings, targetPropertyName));
    map.setPaintProperty(TARGET_LINE_LAYER_ID, "line-color", lineColors.target);
    map.setPaintProperty(SOURCE_FILL_LAYER_ID, "fill-color", buildViewabilityColorExpression(colorScaleSettings, sourcePropertyName));
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
    map.setPaintProperty(SOURCE_FILL_LAYER_ID, "fill-opacity", [
      "case",
      hideUnselectedSourceSelectionsExpression,
      0,
      ["case", hideTargetInvisibleSourcesExpression, 0, 0.8],
    ]);
    map.setPaintProperty(SOURCE_LINE_LAYER_ID, "line-color", [
      "case",
      hideUnselectedSourceSelectionsExpression,
      "rgba(22, 42, 66, 0.72)",
      "case",
      hideTargetInvisibleSourcesExpression,
      "rgba(22, 42, 66, 0.28)",
      lineColors.source,
    ]);
    map.setPaintProperty(SOURCE_LINE_LAYER_ID, "line-opacity", [
      "case",
      hideUnselectedSourceSelectionsExpression,
      0.82,
      ["case", hideTargetInvisibleSourcesExpression, 0, 0.95],
    ]);
    map.setPaintProperty(SOURCE_LINE_LAYER_ID, "line-width", [
      "interpolate",
      ["linear"],
      ["zoom"],
      5,
      ["case", hideUnselectedSourceSelectionsExpression, 0.8, ["case", hideTargetInvisibleSourcesExpression, 0, 1.6]],
      9,
      ["case", hideUnselectedSourceSelectionsExpression, 1.5, ["case", hideTargetInvisibleSourcesExpression, 0, 3.0]],
    ]);
  }, [colorScaleSettings, mapReady, mode, scoreType, selectedSourceCellIds]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const showInspectorTargets = mode !== "overview";
    const showInspectorSources = mode !== "overview";
    setVisibility(map, TARGET_FILL_LAYER_ID, showTargetCells || showInspectorTargets);
    setVisibility(map, TARGET_LINE_LAYER_ID, showTargetCells || showInspectorTargets);
    setVisibility(map, TARGET_HIT_LAYER_ID, showTargetCells || showInspectorTargets);
    setVisibility(map, TARGET_SELECTED_LAYER_ID, selectedTargetCellIds.length > 0);
    setVisibility(map, SOURCE_FILL_LAYER_ID, showSourceCells || showInspectorSources);
    setVisibility(map, SOURCE_LINE_LAYER_ID, showSourceCells || showInspectorSources);
    setVisibility(map, SOURCE_SELECTED_LAYER_ID, selectedSourceCellIds.length > 0);
    setVisibility(map, SOURCE_HOVER_LAYER_ID, (showSourceCells || showInspectorSources) && Boolean(hoveredSourceCellId));
  }, [hoveredSourceCellId, mapReady, mode, selectedSourceCellIds, selectedTargetCellIds, showSourceCells, showTargetCells]);

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
      !map.getLayer(SOURCE_LINE_LAYER_ID)
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
      return;
    }

    map.setFilter(TARGET_FILL_LAYER_ID, null);
    map.setFilter(TARGET_LINE_LAYER_ID, null);
    map.setFilter(TARGET_HIT_LAYER_ID, null);
    map.setFilter(SOURCE_FILL_LAYER_ID, null);
    map.setFilter(SOURCE_LINE_LAYER_ID, null);
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
    if (!map || !mapReady || !map.getSource(DRAW_SOURCE_ID)) return;
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
  if (!map.getLayer(TARGET_HIT_LAYER_ID)) {
    map.addLayer({
      id: TARGET_HIT_LAYER_ID,
      type: "fill",
      source: TARGET_SOURCE_ID,
      layout: {
        visibility: targetVisibility,
      },
      paint: {
        "fill-color": "rgba(0,0,0,1)",
        "fill-opacity": 0,
      },
    });
  }
  if (!map.getLayer(TARGET_SELECTED_LAYER_ID)) {
    map.addLayer({
      id: TARGET_SELECTED_LAYER_ID,
      type: "line",
      source: TARGET_SOURCE_ID,
      filter: ["==", ["get", "h3"], ""],
      layout: {
        visibility: "none",
      },
      paint: {
        "line-color": "rgba(255,255,255,0.92)",
        "line-width": ["interpolate", ["linear"], ["zoom"], 5, 2.6, 9, 4.2],
      },
    });
  }
  if (!map.getLayer(DRAW_FILL_LAYER_ID)) {
    map.addLayer({
      id: DRAW_FILL_LAYER_ID,
      type: "fill",
      source: DRAW_SOURCE_ID,
      layout: {
        visibility: "visible",
      },
      paint: {
        "fill-color": "rgba(255,255,255,0.12)",
      },
    });
  }
  if (!map.getLayer(DRAW_LINE_LAYER_ID)) {
    map.addLayer({
      id: DRAW_LINE_LAYER_ID,
      type: "line",
      source: DRAW_SOURCE_ID,
      layout: {
        visibility: "visible",
      },
      paint: {
        "line-color": "rgba(255,255,255,0.96)",
        "line-width": ["interpolate", ["linear"], ["zoom"], 5, 2.2, 9, 3.8],
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
  if (!map.getLayer(SOURCE_HOVER_LAYER_ID)) {
    map.addLayer({
      id: SOURCE_HOVER_LAYER_ID,
      type: "line",
      source: SOURCE_SOURCE_ID,
      filter: ["==", ["get", "h3"], ""],
      layout: {
        visibility: "none",
      },
      paint: {
        "line-color": "rgba(255,255,255,0.96)",
        "line-width": ["interpolate", ["linear"], ["zoom"], 5, 5, 9, 8],
        "line-opacity": 0.95,
      },
    });
  }
}

function createEmptyAreaSelectionDraft(tool: ViewabilityAreaSelectionTool): AreaSelectionDraft {
  return {
    tool,
    points: [],
    active: false,
    cursorPoint: null,
    circleCenter: null,
    circleRadiusKm: 0,
  };
}

function emptyFeatureCollection(): FeatureCollection<Geometry, GeoJsonProperties> {
  return { type: "FeatureCollection", features: [] };
}

function syncAreaSelectionDraft(
  map: MapLibreMap,
  draft: AreaSelectionDraft,
  onMetricsChangeRef: MutableRefObject<(areaKm2: number, ready: boolean) => void>
) {
  const source = map.getSource(DRAW_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
  source?.setData(buildAreaSelectionFeatureCollection(draft));
  const polygon = getSelectionPolygonFromDraft(draft);
  onMetricsChangeRef.current(polygon ? polygonAreaSqKm(polygon) : 0, Boolean(polygon));
}

function buildAreaSelectionFeatureCollection(draft: AreaSelectionDraft): FeatureCollection<Geometry, GeoJsonProperties> {
  const features: Array<Feature<Geometry, GeoJsonProperties>> = [];

  if (draft.tool === "circle") {
    const polygon = getSelectionPolygonFromDraft(draft);
    if (!polygon) return emptyFeatureCollection();
    features.push({
      type: "Feature",
      properties: { kind: "polygon" },
      geometry: {
        type: "Polygon",
        coordinates: [polygon],
      },
    });
    return { type: "FeatureCollection", features };
  }

  const linePoints = draft.tool === "polygon" && draft.cursorPoint
    ? [...draft.points, draft.cursorPoint]
    : draft.points;

  if (linePoints.length >= 2) {
    features.push({
      type: "Feature",
      properties: { kind: "line" },
      geometry: {
        type: "LineString",
        coordinates: linePoints,
      } satisfies LineString,
    });
  }

  const polygon = getSelectionPolygonFromDraft(draft);
  if (polygon) {
    features.push({
      type: "Feature",
      properties: { kind: "polygon" },
      geometry: {
        type: "Polygon",
        coordinates: [polygon],
      },
    });
  }

  return { type: "FeatureCollection", features };
}

function getSelectionPolygonFromDraft(draft: AreaSelectionDraft): Position[] | null {
  if (draft.tool === "circle") {
    if (!draft.circleCenter || draft.circleRadiusKm <= 0) return null;
    return buildCirclePolygon(draft.circleCenter, draft.circleRadiusKm);
  }
  if (draft.points.length < 3) return null;
  return closePolygon(draft.points);
}

function applyAreaSelectionDraft(
  draft: AreaSelectionDraft,
  drawSelectionKind: "target" | "source",
  sourceFeatures: ViewabilitySourceFeatureCollection["features"],
  targetFeatures: ViewabilityTargetFeatureCollection["features"],
  onSelectSourceCellsRef: MutableRefObject<(sourceCellIds: string[], additive?: boolean) => void>,
  onSelectTargetCellsRef: MutableRefObject<(targetCellIds: string[], additive?: boolean) => void>
): boolean {
  const polygon = getSelectionPolygonFromDraft(draft);
  if (!polygon) return false;

  if (drawSelectionKind === "source") {
    const ids = sourceFeatures
      .filter((feature) => featureTouchesPolygon(feature as Feature<Polygon | MultiPolygon | Point, GeoJsonProperties>, polygon))
      .map((feature) => feature.properties.h3)
      .filter((h3): h3 is string => typeof h3 === "string" && h3.length > 0);
    onSelectSourceCellsRef.current(ids);
  } else {
    const ids = targetFeatures
      .filter((feature) => featureTouchesPolygon(feature as Feature<Polygon | MultiPolygon, GeoJsonProperties>, polygon))
      .map((feature) => feature.properties.h3)
      .filter((h3): h3 is string => typeof h3 === "string" && h3.length > 0);
    onSelectTargetCellsRef.current(ids);
  }
  return true;
}

function closePolygon(points: Position[]): Position[] {
  if (points.length === 0) return [];
  const first = points[0];
  const last = points[points.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) return points;
  return [...points, first];
}

function featureTouchesPolygon(
  feature: Feature<Polygon | MultiPolygon | Point, GeoJsonProperties>,
  polygon: Position[]
): boolean {
  if (!feature.geometry) {
    return false;
  }
  if (feature.geometry.type === "Point") {
    return pointInPolygon(feature.geometry.coordinates, polygon);
  }
  if (feature.geometry.type === "Polygon") {
    return polygonIntersects(feature.geometry.coordinates, polygon);
  }
  return feature.geometry.coordinates.some((coords) => polygonIntersects(coords, polygon));
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

function buildCirclePolygon(center: Position, radiusKm: number, steps = 64): Position[] {
  const points: Position[] = [];
  for (let idx = 0; idx < steps; idx += 1) {
    const bearing = (idx / steps) * Math.PI * 2;
    points.push(destinationPoint(center, radiusKm, bearing));
  }
  return closePolygon(points);
}

function destinationPoint(origin: Position, distanceKmValue: number, bearingRadians: number): Position {
  const earthRadiusKm = 6371.0088;
  const angularDistance = distanceKmValue / earthRadiusKm;
  const lat1 = degreesToRadians(origin[1]);
  const lon1 = degreesToRadians(origin[0]);
  const sinLat1 = Math.sin(lat1);
  const cosLat1 = Math.cos(lat1);
  const sinAngular = Math.sin(angularDistance);
  const cosAngular = Math.cos(angularDistance);
  const lat2 = Math.asin(sinLat1 * cosAngular + cosLat1 * sinAngular * Math.cos(bearingRadians));
  const lon2 = lon1 + Math.atan2(
    Math.sin(bearingRadians) * sinAngular * cosLat1,
    cosAngular - sinLat1 * Math.sin(lat2)
  );
  return [radiansToDegrees(lon2), radiansToDegrees(lat2)];
}

function polygonAreaSqKm(ring: Position[]): number {
  if (ring.length < 4) return 0;
  const earthRadiusKm = 6371.0088;
  const meanLatRadians = degreesToRadians(
    ring.slice(0, -1).reduce((sum, point) => sum + point[1], 0) / Math.max(ring.length - 1, 1)
  );
  const projected = ring.map(([lng, lat]) => {
    const x = earthRadiusKm * degreesToRadians(lng) * Math.cos(meanLatRadians);
    const y = earthRadiusKm * degreesToRadians(lat);
    return [x, y] as const;
  });
  let area = 0;
  for (let idx = 0; idx < projected.length - 1; idx += 1) {
    const [x1, y1] = projected[idx];
    const [x2, y2] = projected[idx + 1];
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area) / 2;
}

function distanceKm(a: Position, b: Position): number {
  const earthRadiusKm = 6371.0088;
  const lat1 = degreesToRadians(a[1]);
  const lat2 = degreesToRadians(b[1]);
  const dLat = degreesToRadians(b[1] - a[1]);
  const dLng = degreesToRadians(b[0] - a[0]);
  const haversine = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function degreesToRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function radiansToDegrees(value: number): number {
  return (value * 180) / Math.PI;
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
  onSelectSourceCellRef: MutableRefObject<(sourceCellId: string, additive?: boolean) => void>,
  onSelectTargetCellRef: MutableRefObject<(targetCellId: string, additive?: boolean) => void>,
  selectionModeRef: MutableRefObject<ViewabilitySelectionMode>
) {
  const onTargetMouseEnter = () => {
    if (selectionModeRef.current === "area") return;
    map.getCanvas().style.cursor = "pointer";
  };
  const onTargetMouseLeave = () => {
    if (selectionModeRef.current !== "area") {
      map.getCanvas().style.cursor = "";
    }
    popupRef.current?.remove();
  };
  const onTargetMouseMove = (event: maplibregl.MapLayerMouseEvent) => {
    if (selectionModeRef.current === "area") {
      popupRef.current?.remove();
      return;
    }
    const feature = event.features?.[0];
    if (!feature || !event.lngLat) return;
    const props = feature.properties as Record<string, unknown>;
    popupRef.current?.setLngLat(event.lngLat).setHTML(targetTooltipHtml(props)).addTo(map);
  };
  map.on("mouseenter", TARGET_HIT_LAYER_ID, onTargetMouseEnter);
  map.on("mouseleave", TARGET_HIT_LAYER_ID, onTargetMouseLeave);
  map.on("mouseenter", SOURCE_FILL_LAYER_ID, () => {
    if (selectionModeRef.current === "area") return;
    map.getCanvas().style.cursor = "pointer";
  });
  map.on("mouseleave", SOURCE_FILL_LAYER_ID, () => {
    if (selectionModeRef.current !== "area") {
      map.getCanvas().style.cursor = "";
    }
    popupRef.current?.remove();
  });
  map.on("click", (event) => {
    if (selectionModeRef.current === "area") return;
    popupRef.current?.remove();
    const original = event.originalEvent as MouseEvent | undefined;
    const additive = Boolean(original?.ctrlKey || original?.metaKey || original?.shiftKey);
    const features = map.queryRenderedFeatures(event.point, {
      layers: [SOURCE_FILL_LAYER_ID, TARGET_HIT_LAYER_ID],
    });
    const sourceFeature = features.find((feature) => feature.layer.id === SOURCE_FILL_LAYER_ID);
    if (sourceFeature) {
      const h3 = sourceFeature.properties?.h3;
      if (typeof h3 === "string") {
        onSelectSourceCellRef.current(h3, additive);
        return;
      }
    }
    const targetFeature = features.find((feature) => feature.layer.id === TARGET_HIT_LAYER_ID);
    if (targetFeature) {
      const h3 = targetFeature.properties?.h3;
      if (typeof h3 === "string") {
        onSelectTargetCellRef.current(h3, additive);
      }
    }
  });
  map.on("mousemove", TARGET_HIT_LAYER_ID, onTargetMouseMove);
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
        <dt>Selected source cells</dt><dd>${escapeHtml(String(props.selected_source_count ?? 1))}</dd>
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
