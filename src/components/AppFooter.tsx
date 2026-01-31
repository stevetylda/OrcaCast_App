import { AttributionHover } from "./AttributionHover";

type Props = {
  modelVersion: string;
  modelId: string;
  onModelChange: (v: string) => void;
};

export function AppFooter({ modelVersion, modelId, onModelChange }: Props) {
  return (
    <div className="footer">
      <div className="footer__left">
        <select
          className="select select--footer"
          value={modelId}
          onChange={(e) => onModelChange(e.target.value)}
        >
          <option value="best">Menu (Model Selection) — Best</option>
          <option value="composite_linear_logit">Composite: Linear Logit</option>
          <option value="spatiotemporal_rf">Spatiotemporal RF</option>
          <option value="neighbor_climatology">Neighbor Climatology</option>
        </select>

        <div className="footer__chip">
          <div className="footer__chipLabel">Model Version:</div>
          <div className="footer__chipValue">{modelVersion}</div>
        </div>
      </div>

      <div className="footer__right">
        <AttributionHover />
      </div>
    </div>
  );
}
