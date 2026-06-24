import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
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
import { applyBasemapVisualTuning, DARK_STYLE, DEFAULT_CENTER, DEFAULT_ZOOM } from "../../../components/ForecastMap/buildLayers";
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
  targetCells: ViewabilityTargetFeatureCollection | null;
  sourceCells: ViewabilitySourceFeatureCollection | null;
  selectedVisibility: SourceTargetVisibilityRecord[];
  mode: ViewabilityMapMode;
  scoreType: ViewabilityScoreType;
  showTargetCells: boolean;
  showSourceCells: boolean;
  selectedSourceCellId: string | null;
  colorScaleSettings: ViewabilityColorScaleSettings;
  onSelectSourceCell: (sourceCellId: string) => void;
};

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function setVisibility(map: MapLibreMap, layerId: string, visible: boolean) {
  if (map.getLayer(layerId)) {
    map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
  }
}

export function ViewabilityMap({
  targetCells,
  sourceCells,
  selectedVisibility,
  mode,
  scoreType,
  showTargetCells,
  showSourceCells,
  selectedSourceCellId,
  colorScaleSettings,
  onSelectSourceCell,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const onSelectSourceCellRef = useRef(onSelectSourceCell);
  const mapTargetsRef = useRef<FeatureCollection | null>(null);
  const sourceCellsRef = useRef(sourceCells);
  const scoreTypeRef = useRef(scoreType);
  const colorScaleSettingsRef = useRef(colorScaleSettings);

  useEffect(() => {
    onSelectSourceCellRef.current = onSelectSourceCell;
  }, [onSelectSourceCell]);

  const mapTargets = useMemo(
    () => (mode === "source-inspector" ? buildInspectorTargetCells(targetCells, selectedVisibility) : targetCells),
    [mode, selectedVisibility, targetCells]
  );

  useEffect(() => {
    mapTargetsRef.current = mapTargets;
    sourceCellsRef.current = sourceCells;
    scoreTypeRef.current = scoreType;
    colorScaleSettingsRef.current = colorScaleSettings;
  }, [colorScaleSettings, mapTargets, scoreType, sourceCells]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: DARK_STYLE,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      attributionControl: false,
    });
    mapRef.current = map;
    popupRef.current = new maplibregl.Popup({ closeButton: false, closeOnClick: false, className: "viewabilityPopup" });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-left");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");

    map.on("load", () => {
      applyBasemapVisualTuning(map, true);
      if (!map.getSource(TARGET_SOURCE_ID)) {
        map.addSource(TARGET_SOURCE_ID, { type: "geojson", data: mapTargetsRef.current ?? { type: "FeatureCollection", features: [] } });
      }
      if (!map.getSource(SOURCE_SOURCE_ID)) {
        map.addSource(SOURCE_SOURCE_ID, { type: "geojson", data: sourceCellsRef.current ?? { type: "FeatureCollection", features: [] } });
      }
      addLayers(map, colorScaleSettingsRef.current, getViewabilityScoreProperty(scoreTypeRef.current));
      bindInteractions(map, popupRef, onSelectSourceCellRef);
    });

    return () => {
      popupRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []);

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
    map.setPaintProperty(TARGET_FILL_LAYER_ID, "fill-color", buildViewabilityColorExpression(colorScaleSettings, propertyName));
    map.setPaintProperty(TARGET_FILL_LAYER_ID, "fill-opacity", [
      "case",
      ["all", ["==", ["literal", mode], "source-inspector"], ["!", ["coalesce", ["get", "visible_from_selected_source"], false]]],
      0.1,
      0.72,
    ]);
  }, [colorScaleSettings, mode, scoreType]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    setVisibility(map, TARGET_FILL_LAYER_ID, showTargetCells);
    setVisibility(map, TARGET_LINE_LAYER_ID, showTargetCells);
    setVisibility(map, SOURCE_FILL_LAYER_ID, showSourceCells);
    setVisibility(map, SOURCE_LINE_LAYER_ID, showSourceCells);
    setVisibility(map, SOURCE_SELECTED_LAYER_ID, showSourceCells && Boolean(selectedSourceCellId));
  }, [selectedSourceCellId, showSourceCells, showTargetCells]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer(SOURCE_SELECTED_LAYER_ID)) return;
    map.setFilter(SOURCE_SELECTED_LAYER_ID, ["==", ["get", "h3"], selectedSourceCellId ?? ""]);
  }, [selectedSourceCellId]);

  return (
    <div className="mapStage viewabilityMapStage">
      <div ref={containerRef} className="map" data-tour="viewability-map-canvas" />
    </div>
  );
}

function addLayers(map: MapLibreMap, colorScaleSettings: ViewabilityColorScaleSettings, propertyName: string) {
  if (!map.getLayer(TARGET_FILL_LAYER_ID)) {
    map.addLayer({
      id: TARGET_FILL_LAYER_ID,
      type: "fill",
      source: TARGET_SOURCE_ID,
      paint: {
        "fill-color": buildViewabilityColorExpression(colorScaleSettings, propertyName) as DataDrivenPropertyValueSpecification<string>,
        "fill-opacity": 0.72,
      },
    });
  }
  if (!map.getLayer(TARGET_LINE_LAYER_ID)) {
    map.addLayer({
      id: TARGET_LINE_LAYER_ID,
      type: "line",
      source: TARGET_SOURCE_ID,
      paint: {
        "line-color": "rgba(193,255,250,0.38)",
        "line-width": ["interpolate", ["linear"], ["zoom"], 5, 0.6, 9, 1.4],
      },
    });
  }
  if (!map.getLayer(SOURCE_FILL_LAYER_ID)) {
    map.addLayer({
      id: SOURCE_FILL_LAYER_ID,
      type: "fill",
      source: SOURCE_SOURCE_ID,
      paint: {
        "fill-color": "rgba(25,240,215,0.08)",
        "fill-opacity": 0.42,
      },
    });
  }
  if (!map.getLayer(SOURCE_LINE_LAYER_ID)) {
    map.addLayer({
      id: SOURCE_LINE_LAYER_ID,
      type: "line",
      source: SOURCE_SOURCE_ID,
      paint: {
        "line-color": "rgba(25,240,215,0.95)",
        "line-width": ["interpolate", ["linear"], ["zoom"], 5, 1.4, 9, 2.8],
        "line-dasharray": [1.4, 1],
      },
    });
  }
  if (!map.getLayer(SOURCE_SELECTED_LAYER_ID)) {
    map.addLayer({
      id: SOURCE_SELECTED_LAYER_ID,
      type: "line",
      source: SOURCE_SOURCE_ID,
      filter: ["==", ["get", "h3"], ""],
      paint: {
        "line-color": "#ffffff",
        "line-width": ["interpolate", ["linear"], ["zoom"], 5, 3, 9, 5],
      },
    });
  }
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
  map.on("mousemove", SOURCE_FILL_LAYER_ID, (event) => {
    const feature = event.features?.[0];
    if (!feature || !event.lngLat) return;
    const props = feature.properties as Record<string, unknown>;
    popupRef.current?.setLngLat(event.lngLat).setHTML(sourceTooltipHtml(props)).addTo(map);
  });
  map.on("click", SOURCE_FILL_LAYER_ID, (event) => {
    const h3 = event.features?.[0]?.properties?.h3;
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

function sourceTooltipHtml(props: Record<string, unknown>) {
  return `
    <div class="viewabilityPopup__title">Source cell</div>
    <div>${escapeHtml(String(props.h3 ?? "-"))}</div>
    <dl>
      <dt>Source type</dt><dd>${escapeHtml(String(props.source_type ?? "-"))}</dd>
      <dt>Source viewyness score</dt><dd>${formatScore(Number(props.source_viewyness_score))}</dd>
      <dt>Reachable target cells</dt><dd>${escapeHtml(String(props.reachable_target_count ?? "-"))}</dd>
      <dt>Mean target weight</dt><dd>${formatScore(Number(props.mean_target_weight))}</dd>
    </dl>
  `;
}

function targetTooltipHtml(props: Record<string, unknown>) {
  if (props.source_target_weight !== undefined) {
    return `
      <div class="viewabilityPopup__title">Target cell</div>
      <div>${escapeHtml(String(props.h3 ?? "-"))}</div>
      <dl>
        <dt>Weight from selected source</dt><dd>${formatScore(Number(props.source_target_weight))}</dd>
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
