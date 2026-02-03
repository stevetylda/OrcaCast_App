import type { ReactNode } from "react";
import type { AnalysisDetailContent } from "../analysisContent";

const REPORTED_DISCLAIMER = "Reported sightings ≠ real-time locations.";

type Props = {
  title: string;
  content: AnalysisDetailContent;
  visualSlot: ReactNode;
};

export function AnalysisDetailTemplate({ title, content, visualSlot }: Props) {
  return (
    <div className="analysisDetailTemplate">
      <header className="analysisDetailTemplate__header">
        <div>
          <p className="analysisDetailTemplate__eyebrow">Analysis detail</p>
          <h3>{title}</h3>
        </div>
        <span className="analysisDetailTemplate__disclaimer">{REPORTED_DISCLAIMER}</span>
      </header>

      <div className="analysisDetailTemplate__body">
        <div className="analysisDetailTemplate__copy">
          <div>
            <p className="analysisDetailTemplate__label">What it shows</p>
            <p>{content.whatItShows}</p>
          </div>
          <div>
            <p className="analysisDetailTemplate__label">Why it matters</p>
            <p>{content.whyItMatters}</p>
          </div>
        </div>

        <div className="analysisDetailTemplate__visuals">{visualSlot}</div>

        <div className="analysisDetailTemplate__columns">
          <div>
            <p className="analysisDetailTemplate__label">Takeaways</p>
            <ul>
              {content.takeaways.map((takeaway) => (
                <li key={takeaway}>{takeaway}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="analysisDetailTemplate__label">Caveats</p>
            <ul>
              {content.caveats.map((caveat) => (
                <li key={caveat}>{caveat}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <footer className="analysisDetailTemplate__footer">
        <span>{content.footer}</span>
      </footer>
    </div>
  );
}
