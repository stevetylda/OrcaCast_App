import { useEffect, useId } from "react";
import type { ViewabilityAreaSelectionTool } from "../useViewabilityPageController";

type Props = {
  open: boolean;
  targetLabel: "target" | "source";
  tool: ViewabilityAreaSelectionTool;
  areaKm2: number;
  ready: boolean;
  onToolChange: (tool: ViewabilityAreaSelectionTool) => void;
  onClear: () => void;
  onClose: () => void;
  onSelect: () => void;
};

function formatArea(areaKm2: number): string {
  if (!Number.isFinite(areaKm2) || areaKm2 <= 0) return "0";
  if (areaKm2 >= 1000) return areaKm2.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (areaKm2 >= 10) return areaKm2.toLocaleString(undefined, { maximumFractionDigits: 1 });
  return areaKm2.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function ViewabilityAreaSelectionModal({
  open,
  targetLabel,
  tool,
  areaKm2,
  ready,
  onToolChange,
  onClear,
  onClose,
  onSelect,
}: Props) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="viewabilityAreaModalWrap" role="presentation">
      <section
        className="viewabilityAreaToolbox"
        role="dialog"
        aria-modal="false"
        aria-labelledby={titleId}
      >
        <div className="viewabilityAreaToolbox__header">
          <div>
            <div className="viewabilityAreaToolbox__title" id={titleId}>
              Area Selection
            </div>
            <div className="viewabilityAreaToolbox__subtitle">
              Draw an area to select {targetLabel} cells.
            </div>
          </div>
          <button className="viewabilityAreaToolbox__close" onClick={onClose} aria-label="Close" type="button">
            <span className="material-symbols-rounded" aria-hidden="true">
              close
            </span>
          </button>
        </div>

        <div className="viewabilityAreaToolbox__body">
          <div className="viewabilityAreaModal__section">
            <div className="viewabilityAreaModal__label">Tool</div>
            <div className="viewabilityLayerToggles viewabilityLayerToggles--settings" aria-label="Area selection tool">
              <button
                type="button"
                className={`viewabilityToggle${tool === "freehand" ? " isSelected" : ""}`}
                aria-pressed={tool === "freehand"}
                onClick={() => onToolChange("freehand")}
              >
                Freehand
              </button>
              <button
                type="button"
                className={`viewabilityToggle${tool === "polygon" ? " isSelected" : ""}`}
                aria-pressed={tool === "polygon"}
                onClick={() => onToolChange("polygon")}
              >
                Polygon
              </button>
              <button
                type="button"
                className={`viewabilityToggle${tool === "circle" ? " isSelected" : ""}`}
                aria-pressed={tool === "circle"}
                onClick={() => onToolChange("circle")}
              >
                Circle
              </button>
            </div>
          </div>

          <div className="viewabilityAreaModal__callout">
            <div className="viewabilityAreaModal__label">Selected area</div>
            <div className="viewabilityAreaModal__value">{formatArea(areaKm2)} sq km</div>
            <div className="viewabilityAreaModal__hint">
              {tool === "freehand" && "Click and drag on the map to sketch a freehand area."}
              {tool === "polygon" && "Click to place vertices. Double-click or right-click to finish the polygon."}
              {tool === "circle" && "Click and drag from a center point to define the circle radius."}
            </div>
          </div>

          <div className="viewabilityAreaModal__actions">
            <button type="button" className="btn btn--ghost btn--soft" onClick={onClear}>
              Clear
            </button>
            <button type="button" className="btn btn--primary" onClick={onSelect} disabled={!ready}>
              Select
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
