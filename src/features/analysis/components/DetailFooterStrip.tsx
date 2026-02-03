import { LensBadge } from "./LensBadge";

type Props = {
  coverage: string;
  freshness: string;
  sources: string;
};

export function DetailFooterStrip({ coverage, freshness, sources }: Props) {
  return (
    <div className="analysisDetailFooterStrip">
      <div className="analysisDetailFooterStrip__item">
        <span className="analysisDetailFooterStrip__label">Coverage</span>
        <span className="analysisDetailFooterStrip__value">{coverage}</span>
      </div>
      <div className="analysisDetailFooterStrip__item">
        <span className="analysisDetailFooterStrip__label">Freshness</span>
        <span className="analysisDetailFooterStrip__value">{freshness}</span>
      </div>
      <div className="analysisDetailFooterStrip__item">
        <span className="analysisDetailFooterStrip__label">Lens</span>
        <LensBadge variant="footer" />
      </div>
      <div className="analysisDetailFooterStrip__item">
        <span className="analysisDetailFooterStrip__label">Sources</span>
        <span className="analysisDetailFooterStrip__value">{sources}</span>
      </div>
    </div>
  );
}
