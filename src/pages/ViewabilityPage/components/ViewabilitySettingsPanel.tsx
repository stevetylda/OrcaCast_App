import { useEffect, useRef } from "react";
import { VIEWABILITY_PALETTE_OPTIONS } from "../../../constants/palettes";
import type { ViewabilityColorScaleSettings, ViewabilityDisplayMode, ViewabilityScoreType } from "../../../data/viewabilityTypes";
import type { ViewabilitySelectionMode } from "../useViewabilityPageController";

type Props = {
  open: boolean;
  settings: ViewabilityColorScaleSettings;
  scoreType: ViewabilityScoreType;
  displayMode: ViewabilityDisplayMode;
  selectionMode: ViewabilitySelectionMode;
  drawSelectionKind: "target" | "source";
  onChange: (next: Partial<ViewabilityColorScaleSettings>) => void;
  onDisplayModeChange: (mode: ViewabilityDisplayMode) => void;
  onSelectCellMode: () => void;
  onSelectAreaMode: () => void;
  onSelectHeatMode: () => void;
  onToggleOpen: () => void;
  onClose: () => void;
};

export function ViewabilitySettingsPanel({
  open,
  settings,
  scoreType,
  displayMode,
  selectionMode,
  drawSelectionKind,
  onChange,
  onDisplayModeChange,
  onSelectCellMode,
  onSelectAreaMode,
  onSelectHeatMode,
  onToggleOpen,
  onClose,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const heatAvailable = scoreType === "dynamic";

  useEffect(() => {
    if (!open) return;
    const onDocClick = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (containerRef.current.contains(event.target as Node)) return;
      onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose, open]);

  return (
    <div ref={containerRef} className="viewabilitySettings">
      <button type="button" className="iconBtn toolDrawer__toggle" aria-label="Viewability settings" onClick={onToggleOpen}>
        <span className="material-symbols-rounded" aria-hidden="true">
          settings
        </span>
      </button>
      {open && (
        <div className="viewabilitySettings__panel" aria-label="Viewability settings panel">
          <div className="viewabilityField">
            <span>Display mode</span>
            <div className="viewabilityLayerToggles viewabilityLayerToggles--settings" aria-label="Display mode">
              <button
                type="button"
                className={`viewabilityToggle${displayMode === "hex" ? " isSelected" : ""}`}
                aria-pressed={displayMode === "hex"}
                onClick={() => onDisplayModeChange("hex")}
                title="Hex view"
                aria-label="Hex view"
              >
                <span className="material-symbols-rounded" aria-hidden="true">
                  hexagon
                </span>
              </button>
              <button
                type="button"
                className={`viewabilityToggle${displayMode === "smooth" ? " isSelected" : ""}`}
                aria-pressed={displayMode === "smooth"}
                onClick={() => onDisplayModeChange("smooth")}
                title="Smooth surface view"
                aria-label="Smooth surface view"
              >
                <span className="material-symbols-rounded" aria-hidden="true">
                  blur_on
                </span>
              </button>
            </div>
          </div>
          <div className="viewabilityField">
            <span>Selection mode</span>
            <div className="viewabilityLayerToggles viewabilityLayerToggles--settings" aria-label="Selection mode">
              <button
                type="button"
                className={`viewabilityToggle${selectionMode === "cell" ? " isSelected" : ""}`}
                aria-pressed={selectionMode === "cell"}
                onClick={onSelectCellMode}
                title="Cell select"
                aria-label="Cell select"
              >
                <span className="material-symbols-rounded" aria-hidden="true">
                  point_scan
                </span>
              </button>
              <button
                type="button"
                className={`viewabilityToggle${selectionMode === "area" ? " isSelected" : ""}`}
                aria-pressed={selectionMode === "area"}
                onClick={onSelectAreaMode}
                title={`Open area selection for ${drawSelectionKind} cells`}
                aria-label="Area select"
              >
                <span className="material-symbols-rounded" aria-hidden="true">
                  select
                </span>
              </button>
              <button
                type="button"
                className={`viewabilityToggle${selectionMode === "heat" ? " isSelected" : ""}`}
                aria-pressed={selectionMode === "heat"}
                onClick={onSelectHeatMode}
                disabled={!heatAvailable}
                title={heatAvailable ? "Select target cells from forecast hotspots" : "Heat selection is only available in dynamic mode"}
                aria-label="Heat select"
              >
                <span className="material-symbols-rounded" aria-hidden="true">
                  local_fire_department
                </span>
              </button>
            </div>
          </div>
          <label className="viewabilityField">
            <span>Color scale</span>
            <select
              className="select"
              value={settings.paletteId}
              onChange={(event) => onChange({ paletteId: event.target.value as ViewabilityColorScaleSettings["paletteId"] })}
            >
              {VIEWABILITY_PALETTE_OPTIONS.map((palette) => (
                <option key={palette.id} value={palette.id}>
                  {palette.name}
                </option>
              ))}
            </select>
          </label>
          <label className="viewabilityCheck">
            <input
              type="checkbox"
              checked={settings.reversePalette}
              onChange={(event) => onChange({ reversePalette: event.target.checked })}
            />
            <span>Reverse palette</span>
          </label>
        </div>
      )}
    </div>
  );
}
