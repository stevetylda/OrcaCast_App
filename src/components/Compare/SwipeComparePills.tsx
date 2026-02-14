import type { ModelInfo } from "../../features/models/data/dummyModels";
import type { H3Resolution } from "../../config/dataPaths";
import { H3ResolutionPill } from "../controls/H3ResolutionPill";

type Props = {
  modelLeftId: string;
  modelRightId: string;
  periodLeft: string;
  periodRight: string;
  resolutionLeft: H3Resolution;
  resolutionRight: H3Resolution;
  dualMapMode: boolean;
  periodOptions: string[];
  models: ModelInfo[];
  onChangeModelLeft: (id: string) => void;
  onChangeModelRight: (id: string) => void;
  onChangePeriodLeft: (period: string) => void;
  onChangePeriodRight: (period: string) => void;
  onChangeResolutionLeft: (resolution: H3Resolution) => void;
  onChangeResolutionRight: (resolution: H3Resolution) => void;
  onToggleLocked: () => void;
};

function formatModelLabel(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

export function SwipeComparePills({
  modelLeftId,
  modelRightId,
  periodLeft,
  periodRight,
  resolutionLeft,
  resolutionRight,
  dualMapMode,
  periodOptions,
  models,
  onChangeModelLeft,
  onChangeModelRight,
  onChangePeriodLeft,
  onChangePeriodRight,
  onChangeResolutionLeft,
  onChangeResolutionRight,
  onToggleLocked,
}: Props) {
  const safeLeftModelId = modelLeftId || models[0]?.id || "";
  const safeRightModelId = modelRightId || models[0]?.id || "";
  const safePeriodLeft = periodLeft || periodOptions[0] || "";
  const safePeriodRight = periodRight || periodOptions[0] || "";

  const leftModelExists = models.some((model) => model.id === safeLeftModelId);
  const rightModelExists = models.some((model) => model.id === safeRightModelId);
  const leftPeriodExists = periodOptions.includes(safePeriodLeft);
  const rightPeriodExists = periodOptions.includes(safePeriodRight);

  return (
    <div className="swipeComparePills" aria-label="Swipe compare lenses">
      <div className="swipeComparePills__surface">
        <div className="swipeComparePills__grid">
          <div className="swipeComparePills__field swipeComparePills__field--model">
            <select aria-label="Left model" value={safeLeftModelId} onChange={(event) => onChangeModelLeft(event.target.value)}>
              {!leftModelExists && safeLeftModelId ? (
                <option value={safeLeftModelId}>{formatModelLabel(safeLeftModelId)}</option>
              ) : null}
              {models.map((model) => (
                <option value={model.id} key={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          </div>

          <div className="swipeComparePills__field swipeComparePills__field--periodIcon">
            <span className="material-symbols-rounded" aria-hidden="true">
              calendar_month
            </span>
            <select
              aria-label="Left period"
              title={`Left period: ${safePeriodLeft}`}
              value={safePeriodLeft}
              onChange={(event) => onChangePeriodLeft(event.target.value)}
            >
              {!leftPeriodExists && safePeriodLeft ? (
                <option value={safePeriodLeft}>{safePeriodLeft}</option>
              ) : null}
              {periodOptions.map((option) => (
                <option value={option} key={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="swipeComparePills__resolution" aria-label="Left hex resolution">
            <H3ResolutionPill
              value={resolutionLeft === "H4" ? 4 : resolutionLeft === "H5" ? 5 : 6}
              onChange={(next) =>
                onChangeResolutionLeft(next === 4 ? "H4" : next === 5 ? "H5" : "H6")
              }
              compact
            />
          </div>

          <div className="swipeComparePills__field swipeComparePills__field--model">
            <select aria-label="Right model" value={safeRightModelId} onChange={(event) => onChangeModelRight(event.target.value)}>
              {!rightModelExists && safeRightModelId ? (
                <option value={safeRightModelId}>{formatModelLabel(safeRightModelId)}</option>
              ) : null}
              {models.map((model) => (
                <option value={model.id} key={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          </div>

          <div className="swipeComparePills__field swipeComparePills__field--periodIcon">
            <span className="material-symbols-rounded" aria-hidden="true">
              calendar_month
            </span>
            <select
              aria-label="Right period"
              title={`Right period: ${safePeriodRight}`}
              value={safePeriodRight}
              onChange={(event) => onChangePeriodRight(event.target.value)}
            >
              {!rightPeriodExists && safePeriodRight ? (
                <option value={safePeriodRight}>{safePeriodRight}</option>
              ) : null}
              {periodOptions.map((option) => (
                <option value={option} key={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="swipeComparePills__resolution" aria-label="Right hex resolution">
            <H3ResolutionPill
              value={resolutionRight === "H4" ? 4 : resolutionRight === "H5" ? 5 : 6}
              onChange={(next) =>
                onChangeResolutionRight(next === 4 ? "H4" : next === 5 ? "H5" : "H6")
              }
              compact
            />
          </div>

          <div className="swipeComparePills__tools" role="toolbar" aria-label="Compare tools">
            <button
              type="button"
              className={`iconBtn swipeComparePills__toolBtn${dualMapMode ? " isActive" : ""}`}
              onClick={onToggleLocked}
              aria-label="Lock"
              aria-pressed={dualMapMode}
              data-tooltip={dualMapMode ? "Locked: dual-map compare" : "Unlock: single-map swipe"}
            >
              <span className="material-symbols-rounded" aria-hidden="true">
                {dualMapMode ? "lock" : "lock_open"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
