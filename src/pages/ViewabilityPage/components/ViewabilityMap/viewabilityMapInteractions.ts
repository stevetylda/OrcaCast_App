import type { MutableRefObject } from "react";
import type maplibregl from "maplibre-gl";
import type { ViewabilitySelectionMode } from "../../useViewabilityPageController";
import { SOURCE_HIT_LAYER_ID, TARGET_HIT_LAYER_ID } from "./viewabilityMapLayers";
import { targetTooltipHtml } from "./viewabilityTooltips";

export function bindInteractions(
  map: maplibregl.Map,
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
  map.on("mouseenter", SOURCE_HIT_LAYER_ID, () => {
    if (selectionModeRef.current === "area") return;
    map.getCanvas().style.cursor = "pointer";
  });
  map.on("mouseleave", SOURCE_HIT_LAYER_ID, () => {
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
      layers: [SOURCE_HIT_LAYER_ID, TARGET_HIT_LAYER_ID],
    });
    const sourceFeature = features.find((feature) => feature.layer.id === SOURCE_HIT_LAYER_ID);
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
