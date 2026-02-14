import { AttributionHover } from "./AttributionHover";

type Props = {
  modelVersion: string;
  modelId: string;
  modelOptions: Array<{ value: string; label: string }>;
  onModelChange: (v: string) => void;
  compareEnabled?: boolean;
};

export function AppFooter({
  modelVersion,
  modelId,
  modelOptions,
  onModelChange,
  compareEnabled = false,
}: Props) {
  const activeModel =
    modelOptions.find((option) => option.value === modelId) ?? modelOptions[0];
  const hasOptions = modelOptions.length > 0;
  const activeLabel = activeModel?.label ?? "Model";

  const handleModelSelect = (value: string, target: HTMLElement) => {
    onModelChange(value);
    const details = target.closest("details");
    if (details) {
      details.removeAttribute("open");
    }
  };

  return (
    <div className="footer">
      <div className="footer__left">
        <div className="footer__combo" role="group" aria-label="Model controls">
          {compareEnabled ? (
            <div className="footer__segment footer__segment--static footer__segment--compareMode">
              <span className="footer__segmentValue">IN COMPARE MODE</span>
            </div>
          ) : (
            <details
              className="footer__segment footer__segment--dropdown"
              data-tour="model-selector"
            >
              <summary className="footer__segmentSummary">
                <span className="footer__segmentLabel">Model</span>
                <span className="footer__segmentValue">{activeLabel}</span>
              </summary>
              {hasOptions && (
                <div className="footer__menu" role="listbox" aria-label="Model">
                  {modelOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={
                        option.value === modelId
                          ? "footer__menuButton footer__menuButton--active"
                          : "footer__menuButton"
                      }
                      onClick={(event) => handleModelSelect(option.value, event.currentTarget)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </details>
          )}

          <div className="footer__segment footer__segment--static">
            <span className="footer__segmentLabel">Version</span>
            <span className="footer__segmentValue">{modelVersion}</span>
          </div>
        </div>
      </div>

      <div className="footer__right">
        <AttributionHover />
      </div>
    </div>
  );
}
