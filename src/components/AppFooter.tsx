import { AttributionHover } from "./AttributionHover";

type Props = {
  modelVersion: string;
  modelId: string;
  onModelChange: (v: string) => void;
};

export function AppFooter({ modelVersion, modelId, onModelChange }: Props) {
  const modelOptions = [
    { value: "best", label: "Best" },
    { value: "composite_linear_logit", label: "Composite Linear Logit" },
    { value: "spatiotemporal_rf", label: "Spatiotemporal RF" },
    { value: "neighbor_climatology", label: "Neighbor Climatology" },
  ];

  const activeModel =
    modelOptions.find((option) => option.value === modelId) ?? modelOptions[0];

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
          <details className="footer__segment footer__segment--dropdown">
            <summary className="footer__segmentSummary">
              <span className="footer__segmentLabel">Model</span>
              <span className="footer__segmentValue">{activeModel.label}</span>
            </summary>
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
          </details>

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
