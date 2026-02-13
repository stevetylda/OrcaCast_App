import type { ModelInfo } from "../../features/models/data/dummyModels";

type Props = {
  modelAId: string;
  modelBId: string;
  periodA: string;
  periodB: string;
  sharedScale: boolean;
  periodOptions: string[];
  models: ModelInfo[];
  selectionReadout: string | null;
  onChangeModelA: (id: string) => void;
  onChangeModelB: (id: string) => void;
  onChangePeriodA: (period: string) => void;
  onChangePeriodB: (period: string) => void;
  onToggleSharedScale: (next: boolean) => void;
};

export function CompareTray({
  modelAId,
  modelBId,
  periodA,
  periodB,
  sharedScale,
  periodOptions,
  models,
  selectionReadout,
  onChangeModelA,
  onChangeModelB,
  onChangePeriodA,
  onChangePeriodB,
  onToggleSharedScale,
}: Props) {
  return (
    <div className="compareModeTray" aria-label="Compare settings tray">
      <div className="compareModeTray__row">
        <label>
          <span>Model A</span>
          <select value={modelAId} onChange={(event) => onChangeModelA(event.target.value)}>
            {models.map((model) => (
              <option value={model.id} key={model.id}>
                {model.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Period A</span>
          <select value={periodA} onChange={(event) => onChangePeriodA(event.target.value)}>
            {periodOptions.map((option) => (
              <option value={option} key={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Model B</span>
          <select value={modelBId} onChange={(event) => onChangeModelB(event.target.value)}>
            {models.map((model) => (
              <option value={model.id} key={model.id}>
                {model.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Period B</span>
          <select value={periodB} onChange={(event) => onChangePeriodB(event.target.value)}>
            {periodOptions.map((option) => (
              <option value={option} key={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="compareModeTray__toggle">
          <span>Shared scale</span>
          <input
            type="checkbox"
            checked={sharedScale}
            onChange={(event) => onToggleSharedScale(event.target.checked)}
          />
        </label>
      </div>

      {selectionReadout ? <div className="compareModeTray__readout">{selectionReadout}</div> : null}
    </div>
  );
}
