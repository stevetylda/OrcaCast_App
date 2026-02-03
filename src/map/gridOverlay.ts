// import type { FeatureCollection } from "geojson";
// import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";

// const DEFAULT_SOURCE_ID = "grid";
// const DEFAULT_FILL_ID = "grid-fill";
// const DEFAULT_LINE_ID = "grid-line";
// const HOT_BASE_ID = "grid-hot-outline-base";
// const HOT_SPARKLE_ID = "grid-hot-outline-sparkle";
// const PEAK_BASE_ID = "grid-peak-outline";
// const PEAK_GLOW_ID = "grid-peak-glow";

// function removeLayerIfExists(map: MapLibreMap, id: string) {
//   if (map.getLayer(id)) {
//     map.removeLayer(id);
//   }
// }

// function removeSourceIfExists(map: MapLibreMap, id: string) {
//   if (map.getSource(id)) {
//     map.removeSource(id);
//   }
// }

// export function addGridOverlay(
//   map: MapLibreMap,
//   fc: FeatureCollection,
//   fillColorExpr?: unknown[],
//   hotspotThreshold?: number,
//   hotspotsVisible = true,
//   sourceId = DEFAULT_SOURCE_ID,
//   fillId = DEFAULT_FILL_ID,
//   lineId = DEFAULT_LINE_ID
// ) {
//   if (map.getSource(sourceId)) {
//     const source = map.getSource(sourceId) as GeoJSONSource;
//     source.setData(fc);
//   } else {
//     map.addSource(sourceId, {
//       type: "geojson",
//       data: fc,
//     });
//   }

//   removeLayerIfExists(map, PEAK_GLOW_ID);
//   removeLayerIfExists(map, PEAK_BASE_ID);
//   removeLayerIfExists(map, HOT_SPARKLE_ID);
//   removeLayerIfExists(map, HOT_BASE_ID);
//   removeLayerIfExists(map, lineId);
//   removeLayerIfExists(map, fillId);

//   const fillColor = fillColorExpr ?? [
//     "interpolate",
//     ["linear"],
//     ["get", "prob"],
//     0.0,
//     "rgba(25,240,215,0.05)",
//     0.0001,
//     "rgba(25,240,215,0.12)",
//     0.005,
//     "rgba(25,240,215,0.30)",
//     0.02,
//     "rgba(25,240,215,0.55)",
//     0.1,
//     "rgba(25,240,215,0.80)",
//     0.3,
//     "rgba(25,240,215,0.92)",
//   ];

//   map.addLayer({
//     id: fillId,
//     type: "fill",
//     source: sourceId,
//     paint: {
//       "fill-color": fillColor,
//       "fill-opacity": 0.7,
//     },
//   });

//   map.addLayer({
//     id: lineId,
//     type: "line",
//     source: sourceId,
//     paint: {
//       "line-color": "rgba(25,240,215,0.25)",
//       "line-width": 0.5,
//     },
//   });

//   if (hotspotThreshold !== undefined) {
//     const visibility = hotspotsVisible ? "visible" : "none";
//     map.addLayer({
//       id: HOT_BASE_ID,
//       type: "line",
//       source: sourceId,
//       filter: [">=", ["get", "prob"], hotspotThreshold],
//       layout: { visibility },
//       paint: {
//         "line-color": "rgba(9,26,68,0.95)",
//         "line-width": ["interpolate", ["linear"], ["zoom"], 6, 1.4, 9, 2.4, 12, 3.0],
//         "line-opacity": 0.95,
//       },
//     });
//     map.addLayer({
//       id: HOT_SPARKLE_ID,
//       type: "line",
//       source: sourceId,
//       filter: [">=", ["get", "prob"], hotspotThreshold],
//       layout: { visibility },
//       paint: {
//         "line-color": "rgba(255,45,170,0.9)",
//         "line-width": ["interpolate", ["linear"], ["zoom"], 6, 2.0, 9, 2.8, 12, 3.4],
//         "line-opacity": 0.85,
//         "line-blur": 1.6,
//       },
//     });

//     map.addLayer({
//       id: PEAK_BASE_ID,
//       type: "line",
//       source: sourceId,
//       filter: [">=", ["get", "prob"], hotspotThreshold],
//       layout: { visibility },
//       paint: {
//         "line-color": "rgba(255,255,255,0.9)",
//         "line-width": ["interpolate", ["linear"], ["zoom"], 6, 2.0, 9, 2.8, 12, 3.4],
//         "line-opacity": 0.95,
//       },
//     });
//     map.addLayer({
//       id: PEAK_GLOW_ID,
//       type: "line",
//       source: sourceId,
//       filter: [">=", ["get", "prob"], hotspotThreshold],
//       layout: { visibility },
//       paint: {
//         "line-color": "rgba(255,45,170,0.45)",
//         "line-width": ["interpolate", ["linear"], ["zoom"], 6, 3.0, 9, 4.2, 12, 5.4],
//         "line-opacity": 0.85,
//         "line-blur": 2.2,
//       },
//     });
//   }
// }

// export function removeGridOverlay(
//   map: MapLibreMap,
//   sourceId = DEFAULT_SOURCE_ID,
//   fillId = DEFAULT_FILL_ID,
//   lineId = DEFAULT_LINE_ID
// ) {
//   removeLayerIfExists(map, PEAK_GLOW_ID);
//   removeLayerIfExists(map, PEAK_BASE_ID);
//   removeLayerIfExists(map, HOT_SPARKLE_ID);
//   removeLayerIfExists(map, HOT_BASE_ID);
//   removeLayerIfExists(map, lineId);
//   removeLayerIfExists(map, fillId);
//   removeSourceIfExists(map, sourceId);
// }

// export function setHotspotVisibility(map: MapLibreMap, visible: boolean) {
//   const visibility = visible ? "visible" : "none";
//   if (map.getLayer(HOT_BASE_ID)) {
//     map.setLayoutProperty(HOT_BASE_ID, "visibility", visibility);
//   }
//   if (map.getLayer(HOT_SPARKLE_ID)) {
//     map.setLayoutProperty(HOT_SPARKLE_ID, "visibility", visibility);
//   }
//   if (map.getLayer(PEAK_BASE_ID)) {
//     map.setLayoutProperty(PEAK_BASE_ID, "visibility", visibility);
//   }
//   if (map.getLayer(PEAK_GLOW_ID)) {
//     map.setLayoutProperty(PEAK_GLOW_ID, "visibility", visibility);
//   }
// }


// export function updateGridFillColor(
//   map: MapLibreMap,
//   fillColorExpr: unknown[],
//   fillId = DEFAULT_FILL_ID
// ) {
//   if (map.getLayer(fillId)) {
//     map.setPaintProperty(fillId, "fill-color", fillColorExpr);
//   }
// }

import type { FeatureCollection } from "geojson";
import type {
  GeoJSONSource,
  Map as MapLibreMap,
  ExpressionSpecification,
  DataDrivenPropertyValueSpecification,
} from "maplibre-gl";

const DEFAULT_SOURCE_ID = "grid";
const DEFAULT_FILL_ID = "grid-fill";
const DEFAULT_LINE_ID = "grid-line";
const HOT_BASE_ID = "grid-hot-outline-base";
const HOT_SPARKLE_ID = "grid-hot-outline-sparkle";
const PEAK_BASE_ID = "grid-peak-outline";
const PEAK_GLOW_ID = "grid-peak-glow";
const HALO_ID = "grid-halo";
const SHIMMER_ID = "grid-shimmer-fill";
const PEAK_SHINE_ID = "grid-peak-shine";

/**
 * MapLibre expects "fill-color" to be a DataDrivenPropertyValueSpecification<string>
 * (which includes expressions). Our expressions are valid but were typed as unknown[].
 */
type FillColorSpec = DataDrivenPropertyValueSpecification<string>;

function removeLayerIfExists(map: MapLibreMap, id: string) {
  if (map.getLayer(id)) {
    map.removeLayer(id);
  }
}

function removeSourceIfExists(map: MapLibreMap, id: string) {
  if (map.getSource(id)) {
    map.removeSource(id);
  }
}

export function addGridOverlay(
  map: MapLibreMap,
  fc: FeatureCollection,
  fillColorExpr?: FillColorSpec,
  hotspotThreshold?: number,
  hotspotsVisible = true,
  shimmerThreshold?: number,
  sourceId = DEFAULT_SOURCE_ID,
  fillId = DEFAULT_FILL_ID,
  lineId = DEFAULT_LINE_ID
) {
  if (map.getSource(sourceId)) {
    const source = map.getSource(sourceId) as GeoJSONSource;
    source.setData(fc);
  } else {
    map.addSource(sourceId, {
      type: "geojson",
      data: fc,
    });
  }

  // Default fill-color expression (typed)
  const defaultFillColorExpr: ExpressionSpecification = [
    "interpolate",
    ["linear"],
    ["get", "prob"],
    0.0,
    "rgba(25,240,215,0.05)",
    0.0001,
    "rgba(25,240,215,0.12)",
    0.005,
    "rgba(25,240,215,0.30)",
    0.02,
    "rgba(25,240,215,0.55)",
    0.1,
    "rgba(25,240,215,0.80)",
    0.3,
    "rgba(25,240,215,0.92)",
  ];

  // Use provided expression if given, else use default
  const fillColor: FillColorSpec = (fillColorExpr ??
    (defaultFillColorExpr as unknown as FillColorSpec)) as FillColorSpec;

  if (map.getLayer(fillId)) {
    map.setPaintProperty(fillId, "fill-color", fillColor);
    map.setPaintProperty(fillId, "fill-opacity", 0.8);
    map.setPaintProperty(fillId, "fill-opacity-transition", { duration: 200, delay: 0 });
  } else {
    map.addLayer({
      id: fillId,
      type: "fill",
      source: sourceId,
      paint: {
        "fill-color": fillColor,
        "fill-opacity": 0.8,
        "fill-opacity-transition": { duration: 200, delay: 0 },
      },
    });
  }

  if (map.getLayer(HALO_ID)) {
    map.setPaintProperty(HALO_ID, "line-color", "rgba(5,10,22,0.6)");
    map.setPaintProperty(HALO_ID, "line-width", [
      "interpolate",
      ["linear"],
      ["zoom"],
      6,
      1.2,
      9,
      1.8,
      12,
      2.4,
    ] as ExpressionSpecification);
    map.setPaintProperty(HALO_ID, "line-opacity", 0.45);
    map.setPaintProperty(HALO_ID, "line-blur", 1.8);
  } else {
    const layer = {
      id: HALO_ID,
      type: "line" as const,
      source: sourceId,
      paint: {
        "line-color": "rgba(5,10,22,0.6)",
        "line-width": ["interpolate", ["linear"], ["zoom"], 6, 1.2, 9, 1.8, 12, 2.4] as ExpressionSpecification,
        "line-opacity": 0.45,
        "line-blur": 1.8,
      },
    };
    if (map.getLayer(lineId)) {
      map.addLayer(layer, lineId);
    } else {
      map.addLayer(layer);
    }
  }

  if (map.getLayer(lineId)) {
    map.setPaintProperty(lineId, "line-color", "rgba(25,240,215,0.25)");
    map.setPaintProperty(lineId, "line-width", 0.5);
    map.setPaintProperty(lineId, "line-opacity", 0.35);
  } else {
    map.addLayer({
      id: lineId,
      type: "line",
      source: sourceId,
      paint: {
        "line-color": "rgba(25,240,215,0.25)",
        "line-width": 0.5,
        "line-opacity": 0.35,
      },
    });
  }

  if (shimmerThreshold !== undefined) {
    const filter = [">=", ["get", "prob"], shimmerThreshold] as ExpressionSpecification;
    if (map.getLayer(SHIMMER_ID)) {
      map.setFilter(SHIMMER_ID, filter);
      map.setPaintProperty(SHIMMER_ID, "fill-color", "rgba(140,255,245,0.35)");
      map.setPaintProperty(SHIMMER_ID, "fill-opacity", 0.2);
    } else {
      const layer = {
        id: SHIMMER_ID,
        type: "fill" as const,
        source: sourceId,
        filter,
        paint: {
          "fill-color": "rgba(140,255,245,0.35)",
          "fill-opacity": 0.2,
        },
      };
      if (map.getLayer(lineId)) {
        map.addLayer(layer, lineId);
      } else {
        map.addLayer(layer);
      }
    }

    if (map.getLayer(PEAK_SHINE_ID)) {
      map.setFilter(PEAK_SHINE_ID, filter);
      map.setPaintProperty(PEAK_SHINE_ID, "line-opacity", 0.6);
    } else {
      const layer = {
        id: PEAK_SHINE_ID,
        type: "line" as const,
        source: sourceId,
        filter,
        paint: {
          "line-color": "rgba(180,255,252,0.9)",
          "line-width": ["interpolate", ["linear"], ["zoom"], 6, 1.4, 9, 2.2, 12, 3.0] as ExpressionSpecification,
          "line-opacity": 0.6,
          "line-blur": 2.0,
        },
      };
      if (map.getLayer(lineId)) {
        map.addLayer(layer, lineId);
      } else {
        map.addLayer(layer);
      }
    }
  } else {
    removeLayerIfExists(map, SHIMMER_ID);
    removeLayerIfExists(map, PEAK_SHINE_ID);
  }

  if (hotspotThreshold !== undefined) {
    const visibility = hotspotsVisible ? "visible" : "none";
    const filter = [">=", ["get", "prob"], hotspotThreshold] as ExpressionSpecification;
    if (map.getLayer(HOT_BASE_ID)) {
      map.setFilter(HOT_BASE_ID, filter);
      map.setLayoutProperty(HOT_BASE_ID, "visibility", visibility);
    } else {
      map.addLayer({
        id: HOT_BASE_ID,
        type: "line",
        source: sourceId,
        filter,
        layout: { visibility },
        paint: {
          "line-color": "rgba(9,26,68,0.95)",
          "line-width": ["interpolate", ["linear"], ["zoom"], 6, 1.4, 9, 2.4, 12, 3.0] as ExpressionSpecification,
          "line-opacity": 0.95,
        },
      });
    }
    if (map.getLayer(HOT_SPARKLE_ID)) {
      map.setFilter(HOT_SPARKLE_ID, filter);
      map.setLayoutProperty(HOT_SPARKLE_ID, "visibility", visibility);
    } else {
      map.addLayer({
        id: HOT_SPARKLE_ID,
        type: "line",
        source: sourceId,
        filter,
        layout: { visibility },
        paint: {
          "line-color": "rgba(255,45,170,0.9)",
          "line-width": ["interpolate", ["linear"], ["zoom"], 6, 2.0, 9, 2.8, 12, 3.4] as ExpressionSpecification,
          "line-opacity": 0.85,
          "line-blur": 1.6,
        },
      });
    }

    if (map.getLayer(PEAK_BASE_ID)) {
      map.setFilter(PEAK_BASE_ID, filter);
      map.setLayoutProperty(PEAK_BASE_ID, "visibility", visibility);
    } else {
      map.addLayer({
        id: PEAK_BASE_ID,
        type: "line",
        source: sourceId,
        filter,
        layout: { visibility },
        paint: {
          "line-color": "rgba(255,255,255,0.9)",
          "line-width": ["interpolate", ["linear"], ["zoom"], 6, 2.0, 9, 2.8, 12, 3.4] as ExpressionSpecification,
          "line-opacity": 0.95,
        },
      });
    }
    if (map.getLayer(PEAK_GLOW_ID)) {
      map.setFilter(PEAK_GLOW_ID, filter);
      map.setLayoutProperty(PEAK_GLOW_ID, "visibility", visibility);
    } else {
      map.addLayer({
        id: PEAK_GLOW_ID,
        type: "line",
        source: sourceId,
        filter,
        layout: { visibility },
        paint: {
          "line-color": "rgba(255,45,170,0.45)",
          "line-width": ["interpolate", ["linear"], ["zoom"], 6, 3.0, 9, 4.2, 12, 5.4] as ExpressionSpecification,
          "line-opacity": 0.85,
          "line-blur": 2.2,
        },
      });
    }
  } else {
    removeLayerIfExists(map, PEAK_GLOW_ID);
    removeLayerIfExists(map, PEAK_BASE_ID);
    removeLayerIfExists(map, HOT_SPARKLE_ID);
    removeLayerIfExists(map, HOT_BASE_ID);
  }
}

export function setGridBaseVisibility(
  map: MapLibreMap,
  visible: boolean,
  fillId = DEFAULT_FILL_ID,
  lineId = DEFAULT_LINE_ID
) {
  if (map.getLayer(fillId)) {
    map.setPaintProperty(fillId, "fill-opacity", visible ? 0.8 : 0);
  }
  if (map.getLayer(SHIMMER_ID)) {
    map.setPaintProperty(SHIMMER_ID, "fill-opacity", visible ? 0.2 : 0);
  }
  if (map.getLayer(PEAK_SHINE_ID)) {
    map.setPaintProperty(PEAK_SHINE_ID, "line-opacity", visible ? 0.6 : 0);
  }
  if (map.getLayer(HALO_ID)) {
    map.setPaintProperty(HALO_ID, "line-opacity", visible ? 0.45 : 0);
  }
  if (map.getLayer(lineId)) {
    map.setPaintProperty(lineId, "line-opacity", visible ? 0.35 : 0);
  }
}

export function setGridVisibility(
  map: MapLibreMap,
  visible: boolean,
  fillId = DEFAULT_FILL_ID,
  lineId = DEFAULT_LINE_ID
) {
  setGridBaseVisibility(map, visible, fillId, lineId);
  if (!visible) {
    setHotspotVisibility(map, false);
  }
}

export function removeGridOverlay(
  map: MapLibreMap,
  sourceId = DEFAULT_SOURCE_ID,
  fillId = DEFAULT_FILL_ID,
  lineId = DEFAULT_LINE_ID
) {
  removeLayerIfExists(map, PEAK_SHINE_ID);
  removeLayerIfExists(map, SHIMMER_ID);
  removeLayerIfExists(map, HALO_ID);
  removeLayerIfExists(map, PEAK_GLOW_ID);
  removeLayerIfExists(map, PEAK_BASE_ID);
  removeLayerIfExists(map, HOT_SPARKLE_ID);
  removeLayerIfExists(map, HOT_BASE_ID);
  removeLayerIfExists(map, lineId);
  removeLayerIfExists(map, fillId);
  removeSourceIfExists(map, sourceId);
}

export function setHotspotVisibility(map: MapLibreMap, visible: boolean) {
  const visibility = visible ? "visible" : "none";
  if (map.getLayer(HOT_BASE_ID)) {
    map.setLayoutProperty(HOT_BASE_ID, "visibility", visibility);
  }
  if (map.getLayer(HOT_SPARKLE_ID)) {
    map.setLayoutProperty(HOT_SPARKLE_ID, "visibility", visibility);
  }
  if (map.getLayer(PEAK_BASE_ID)) {
    map.setLayoutProperty(PEAK_BASE_ID, "visibility", visibility);
  }
  if (map.getLayer(PEAK_GLOW_ID)) {
    map.setLayoutProperty(PEAK_GLOW_ID, "visibility", visibility);
  }
}

export function updateGridFillColor(
  map: MapLibreMap,
  fillColorExpr: FillColorSpec,
  fillId = DEFAULT_FILL_ID
) {
  if (map.getLayer(fillId)) {
    map.setPaintProperty(fillId, "fill-color", fillColorExpr);
  }
}
