import { type DataDrivenPropertyValueSpecification, type Map as MapLibreMap } from "maplibre-gl";
import type { ViewabilityColorScaleSettings, ViewabilityDisplayMode } from "../../../../data/viewabilityTypes";
import { buildViewabilityColorExpression } from "../../utils/viewabilityColorScales";
import { emptyTransparentDataUrl } from "./viewabilitySmoothSurface";

export const TARGET_SOURCE_ID = "viewability-target-cells";
export const SOURCE_SOURCE_ID = "viewability-source-cells";
export const TARGET_FILL_LAYER_ID = "viewability-target-fill";
export const TARGET_LINE_LAYER_ID = "viewability-target-line";
export const TARGET_HIT_LAYER_ID = "viewability-target-hit";
export const TARGET_SELECTED_LAYER_ID = "viewability-target-selected";
export const TARGET_SMOOTH_SOURCE_ID = "viewability-target-smooth-surface";
export const TARGET_SMOOTH_LAYER_ID = "viewability-target-smooth-surface-layer";
export const SOURCE_SMOOTH_SOURCE_ID = "viewability-source-smooth-surface";
export const SOURCE_SMOOTH_LAYER_ID = "viewability-source-smooth-surface-layer";
export const DRAW_SOURCE_ID = "viewability-draw-selection";
export const DRAW_FILL_LAYER_ID = "viewability-draw-selection-fill";
export const DRAW_LINE_LAYER_ID = "viewability-draw-selection-line";
export const SOURCE_FILL_LAYER_ID = "viewability-source-fill";
export const SOURCE_LINE_LAYER_ID = "viewability-source-line";
export const SOURCE_HIT_LAYER_ID = "viewability-source-hit";
export const SOURCE_SELECTED_LAYER_ID = "viewability-source-selected";
export const SOURCE_HOVER_LAYER_ID = "viewability-source-hover";

export function setLayerVisibility(map: MapLibreMap, layerId: string, visible: boolean) {
  if (map.getLayer(layerId)) {
    map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
  }
}

export function addLayers(
  map: MapLibreMap,
  colorScaleSettings: ViewabilityColorScaleSettings,
  propertyName: string,
  visibility: {
    displayMode: ViewabilityDisplayMode;
    showTargetCells: boolean;
    showSourceCells: boolean;
    selectedSourceCellId: string | null;
  }
) {
  const lineColors = getViewabilityLineColors(colorScaleSettings.paletteId);
  const targetVisibility = visibility.showTargetCells && visibility.displayMode === "hex" ? "visible" : "none";
  const targetSmoothVisibility = visibility.showTargetCells && visibility.displayMode === "smooth" ? "visible" : "none";
  const sourceSmoothVisibility = visibility.showSourceCells && visibility.displayMode === "smooth" ? "visible" : "none";
  const sourceVisibility = visibility.showSourceCells && visibility.displayMode === "hex" ? "visible" : "none";
  const selectedSourceVisibility = visibility.showSourceCells && visibility.selectedSourceCellId ? "visible" : "none";

  if (!map.getLayer(TARGET_FILL_LAYER_ID)) {
    map.addLayer({
      id: TARGET_FILL_LAYER_ID,
      type: "fill",
      source: TARGET_SOURCE_ID,
      layout: { visibility: targetVisibility },
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
      layout: { visibility: targetVisibility },
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
      layout: { visibility: targetVisibility },
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
      layout: { visibility: "none" },
      paint: {
        "line-color": "rgba(255, 92, 122, 0.96)",
        "line-width": ["interpolate", ["linear"], ["zoom"], 5, 2.6, 9, 4.2],
      },
    });
  }
  if (!map.getSource(TARGET_SMOOTH_SOURCE_ID)) {
    map.addSource(TARGET_SMOOTH_SOURCE_ID, {
      type: "image",
      url: emptyTransparentDataUrl(),
      coordinates: [[-180, 85], [180, 85], [180, -85], [-180, -85]],
    });
  }
  if (!map.getLayer(TARGET_SMOOTH_LAYER_ID)) {
    map.addLayer({
      id: TARGET_SMOOTH_LAYER_ID,
      type: "raster",
      source: TARGET_SMOOTH_SOURCE_ID,
      layout: { visibility: targetSmoothVisibility },
      paint: {
        "raster-opacity": 0.98,
        "raster-resampling": "linear",
        "raster-brightness-max": 1,
        "raster-contrast": 0.14,
        "raster-saturation": 0.12,
      },
    }, TARGET_HIT_LAYER_ID);
  }
  if (!map.getSource(SOURCE_SMOOTH_SOURCE_ID)) {
    map.addSource(SOURCE_SMOOTH_SOURCE_ID, {
      type: "image",
      url: emptyTransparentDataUrl(),
      coordinates: [[-180, 85], [180, 85], [180, -85], [-180, -85]],
    });
  }
  if (!map.getLayer(DRAW_FILL_LAYER_ID)) {
    map.addLayer({
      id: DRAW_FILL_LAYER_ID,
      type: "fill",
      source: DRAW_SOURCE_ID,
      layout: { visibility: "visible" },
      paint: { "fill-color": "rgba(255,255,255,0.12)" },
    });
  }
  if (!map.getLayer(DRAW_LINE_LAYER_ID)) {
    map.addLayer({
      id: DRAW_LINE_LAYER_ID,
      type: "line",
      source: DRAW_SOURCE_ID,
      layout: { visibility: "visible" },
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
      layout: { visibility: sourceVisibility },
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
      layout: { visibility: sourceVisibility },
      paint: {
        "line-color": lineColors.source,
        "line-width": ["interpolate", ["linear"], ["zoom"], 5, 1.4, 9, 2.8],
        "line-dasharray": [1.4, 1],
        "line-opacity": 0.9,
      },
    });
  }
  if (!map.getLayer(SOURCE_HIT_LAYER_ID)) {
    map.addLayer({
      id: SOURCE_HIT_LAYER_ID,
      type: "fill",
      source: SOURCE_SOURCE_ID,
      layout: {
        visibility: visibility.showSourceCells ? "visible" : "none",
      },
      paint: {
        "fill-color": "rgba(0,0,0,1)",
        "fill-opacity": 0,
      },
    });
  }
  if (!map.getLayer(SOURCE_SMOOTH_LAYER_ID)) {
    map.addLayer({
      id: SOURCE_SMOOTH_LAYER_ID,
      type: "raster",
      source: SOURCE_SMOOTH_SOURCE_ID,
      layout: { visibility: sourceSmoothVisibility },
      paint: {
        "raster-opacity": 0.98,
        "raster-resampling": "linear",
        "raster-brightness-max": 1,
        "raster-contrast": 0.14,
        "raster-saturation": 0.12,
      },
    }, SOURCE_HIT_LAYER_ID);
  }
  if (!map.getLayer(SOURCE_SELECTED_LAYER_ID)) {
    map.addLayer({
      id: SOURCE_SELECTED_LAYER_ID,
      type: "line",
      source: SOURCE_SOURCE_ID,
      filter: ["==", ["get", "h3"], ""],
      layout: { visibility: selectedSourceVisibility },
      paint: {
        "line-color": "rgba(255, 92, 122, 0.96)",
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
      layout: { visibility: "none" },
      paint: {
        "line-color": "rgba(255,255,255,0.96)",
        "line-width": ["interpolate", ["linear"], ["zoom"], 5, 5, 9, 8],
        "line-opacity": 0.95,
      },
    });
  }
}

export function getViewabilityLineColors(paletteId: ViewabilityColorScaleSettings["paletteId"]) {
  if (paletteId === "relief_atlas") {
    return {
      target: "rgba(247,244,232,0.2)",
      source: "rgba(31,102,112,0.42)",
    };
  }
  if (paletteId === "northern_lights") {
    return {
      target: "rgba(217,255,243,0.24)",
      source: "rgba(121,224,197,0.48)",
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
