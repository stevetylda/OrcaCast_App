import { useEffect, useId } from "react";
import type { H3Resolution } from "../../../config/dataPaths";
import type { ViewabilityHeatMode } from "../useViewabilityPageController";

type Props = {
  open: boolean;
  mode: ViewabilityHeatMode;
  percentile: number;
  presetValues: number[];
  resolution: H3Resolution;
  resolutionOptions: H3Resolution[];
  preview: {
    loading: boolean;
    error: string | null;
    note: string | null;
    periodLabel: string | null;
    resolution: H3Resolution | null;
    totalMatchedCells: number;
    selectedCount: number;
  };
  applyBusy: boolean;
  onModeChange: (mode: ViewabilityHeatMode) => void;
  onPercentileChange: (value: number) => void;
  onResolutionChange: (value: H3Resolution) => void;
  onClear: () => void;
  onClose: () => void;
  onSelect: () => void | Promise<unknown>;
};

export function ViewabilityHeatSelectionModal({
  open,
  mode,
  percentile,
  presetValues,
  resolution,
  resolutionOptions,
  preview,
  applyBusy,
  onModeChange,
  onPercentileChange,
  onResolutionChange,
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
      <section className="viewabilityAreaToolbox" role="dialog" aria-modal="false" aria-labelledby={titleId}>
        <div className="viewabilityAreaToolbox__header">
          <div>
            <div className="viewabilityAreaToolbox__title" id={titleId}>
              Heat Selection
            </div>
            <div className="viewabilityAreaToolbox__subtitle">
              Align the current date to the forecast window and select hotspot target cells.
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
            <div className="viewabilityAreaModal__label">Grid</div>
            <div className="viewabilityLayerToggles viewabilityLayerToggles--settings" aria-label="Heat grid resolution">
              {resolutionOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`viewabilityToggle${option === resolution ? " isSelected" : ""}`}
                  aria-pressed={option === resolution}
                  onClick={() => onResolutionChange(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="viewabilityAreaModal__section">
            <div className="viewabilityAreaModal__label">Mode</div>
            <div className="viewabilityLayerToggles viewabilityLayerToggles--settings" aria-label="Heat selection mode">
              <button
                type="button"
                className={`viewabilityToggle${mode === "modeled" ? " isSelected" : ""}`}
                aria-pressed={mode === "modeled"}
                onClick={() => onModeChange("modeled")}
              >
                Modeled
              </button>
              <button
                type="button"
                className={`viewabilityToggle${mode === "custom" ? " isSelected" : ""}`}
                aria-pressed={mode === "custom"}
                onClick={() => onModeChange("custom")}
              >
                Custom
              </button>
            </div>
          </div>

          {mode === "custom" && (
            <div className="viewabilityAreaModal__section">
              <div className="viewabilityAreaModal__label">Top Percent</div>
              <div className="viewabilityLayerToggles viewabilityLayerToggles--settings" aria-label="Heat percentage presets">
                {presetValues.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={`viewabilityToggle${value === percentile ? " isSelected" : ""}`}
                    aria-pressed={value === percentile}
                    onClick={() => onPercentileChange(value)}
                  >
                    {value}%
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="viewabilityAreaModal__callout">
            <div className="viewabilityAreaModal__label">Forecast window</div>
            <div className="viewabilityAreaModal__value viewabilityHeatModal__value">
              {preview.loading ? "Loading..." : preview.periodLabel ?? "Unavailable"}
            </div>
            <div className="viewabilityAreaModal__hint">
              {preview.resolution ? `Matched grid: ${preview.resolution}` : "No compatible forecast grid found yet."}
            </div>
          </div>

          <div className="viewabilityAreaModal__callout">
            <div className="viewabilityAreaModal__label">Heat selection</div>
            <div className="viewabilityAreaModal__value">{preview.loading ? "..." : preview.selectedCount.toLocaleString()}</div>
            <div className="viewabilityAreaModal__hint">
              {preview.loading
                ? "Calculating hotspot cells from the aligned forecast."
                : `Selecting ${preview.selectedCount.toLocaleString()} of ${preview.totalMatchedCells.toLocaleString()} matched target cells.`}
            </div>
            {preview.note && <div className="viewabilityHeatModal__note">{preview.note}</div>}
            {preview.error && <div className="viewabilityHeatModal__error">{preview.error}</div>}
          </div>

          <div className="viewabilityAreaModal__actions">
            <button type="button" className="btn btn--ghost btn--soft" onClick={onClear}>
              Clear
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => void onSelect()}
              disabled={preview.loading || applyBusy || preview.selectedCount === 0 || Boolean(preview.error)}
            >
              {applyBusy ? "Selecting..." : "Select"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
