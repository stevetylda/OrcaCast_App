import { useEffect, useRef } from "react";
import { VIEWABILITY_PALETTE_OPTIONS } from "../../../constants/palettes";
import type { ViewabilityColorScaleSettings } from "../../../data/viewabilityTypes";

type Props = {
  open: boolean;
  settings: ViewabilityColorScaleSettings;
  showTargetCells: boolean;
  showSourceCells: boolean;
  poiFilters: { Park: boolean; Marina: boolean; Ferry: boolean };
  onChange: (next: Partial<ViewabilityColorScaleSettings>) => void;
  onToggleTargetCells: () => void;
  onToggleSourceCells: () => void;
  onTogglePoiAll: () => void;
  onTogglePoiType: (type: "Park" | "Marina" | "Ferry") => void;
  onToggleOpen: () => void;
  onClose: () => void;
};

export function ViewabilitySettingsPanel({
  open,
  settings,
  showTargetCells,
  showSourceCells,
  poiFilters,
  onChange,
  onToggleTargetCells,
  onToggleSourceCells,
  onTogglePoiAll,
  onTogglePoiType,
  onToggleOpen,
  onClose,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const poiActive = poiFilters.Park || poiFilters.Marina || poiFilters.Ferry;

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
          <div className="viewabilityLayerToggles viewabilityLayerToggles--settings" aria-label="Layer visibility">
            <button
              type="button"
              className={`viewabilityToggle${showTargetCells ? " isSelected" : ""}`}
              aria-pressed={showTargetCells}
              onClick={onToggleTargetCells}
            >
              Target cells
            </button>
            <button
              type="button"
              className={`viewabilityToggle${showSourceCells ? " isSelected" : ""}`}
              aria-pressed={showSourceCells}
              onClick={onToggleSourceCells}
            >
              Source cells
            </button>
          </div>
          <div className="viewabilitySettings__toolRow">
            <div className="toolMenu toolMenu--open">
              <button
                type="button"
                className={`toolBtn${poiActive ? " toolBtn--active" : ""}`}
                onClick={onTogglePoiAll}
                title="POI filters"
                aria-label="POI filters"
                aria-pressed={poiActive}
              >
                <span className="material-symbols-rounded">pin_drop</span>
              </button>
              <div className="toolMenu__popover viewabilitySettings__poiPopover" role="menu" aria-label="Points of interest">
                <button
                  type="button"
                  className={`toolMenu__option${poiFilters.Park ? " toolMenu__option--active" : ""}`}
                  onClick={() => onTogglePoiType("Park")}
                  title="Parks"
                  aria-label="Parks"
                >
                  <span className="material-symbols-rounded">park</span>
                </button>
                <button
                  type="button"
                  className={`toolMenu__option${poiFilters.Marina ? " toolMenu__option--active" : ""}`}
                  onClick={() => onTogglePoiType("Marina")}
                  title="Marinas"
                  aria-label="Marinas"
                >
                  <span className="material-symbols-rounded">sailing</span>
                </button>
                <button
                  type="button"
                  className={`toolMenu__option${poiFilters.Ferry ? " toolMenu__option--active" : ""}`}
                  onClick={() => onTogglePoiType("Ferry")}
                  title="Ferries"
                  aria-label="Ferries"
                >
                  <span className="material-symbols-rounded">directions_boat</span>
                </button>
              </div>
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
