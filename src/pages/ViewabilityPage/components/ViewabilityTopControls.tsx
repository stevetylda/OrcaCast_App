import type { ViewabilityScoreType } from "../../../data/viewabilityTypes";

const SCORE_OPTIONS: Array<{ value: ViewabilityScoreType; label: string }> = [
  { value: "base", label: "Base" },
  { value: "dynamic", label: "Dynamic" },
];

type Props = {
  selectedDateOrPeriod: string;
  onSelectedDateOrPeriodChange: (value: string) => void;
  scoreType: ViewabilityScoreType;
  onScoreTypeChange: (value: ViewabilityScoreType) => void;
  showTargetCells: boolean;
  showSourceCells: boolean;
  onToggleTargetCells: () => void;
  onToggleSourceCells: () => void;
  selectedSourceCellId: string | null;
  onResetSelection: () => void;
};

export function ViewabilityTopControls({
  selectedDateOrPeriod,
  onSelectedDateOrPeriodChange,
  scoreType,
  onScoreTypeChange,
  showTargetCells,
  showSourceCells,
  onToggleTargetCells,
  onToggleSourceCells,
  selectedSourceCellId,
  onResetSelection,
}: Props) {
  return (
    <div className="viewabilityTopControls" aria-label="Viewability controls">
      <label className="viewabilityPeriodControl">
        <span className="viewabilityControlLabel">Viewability</span>
        <select
          className="select viewabilitySelect"
          value={selectedDateOrPeriod}
          onChange={(event) => onSelectedDateOrPeriodChange(event.target.value)}
          aria-label="Viewability period"
        >
          <option value="2026-05-04 -> 2026-05-10">2026-05-04 {"->"} 2026-05-10</option>
          <option value="2026-05-11 -> 2026-05-17">2026-05-11 {"->"} 2026-05-17</option>
        </select>
      </label>

      <div className="viewabilitySegmented" role="radiogroup" aria-label="Score type">
        {SCORE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`viewabilitySegmented__option${scoreType === option.value ? " isSelected" : ""}`}
            role="radio"
            aria-checked={scoreType === option.value}
            onClick={() => onScoreTypeChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="viewabilityLayerToggles" aria-label="Layer visibility">
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

      {selectedSourceCellId && (
        <button type="button" className="iconBtn viewabilityResetBtn" onClick={onResetSelection} aria-label="Reset source selection" title="Reset selection">
          <span className="material-symbols-rounded" aria-hidden="true">
            close
          </span>
        </button>
      )}
    </div>
  );
}
