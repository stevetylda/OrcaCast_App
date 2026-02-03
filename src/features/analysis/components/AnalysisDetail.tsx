import type { RefObject } from "react";
import type { AnalysisItem } from "../analysisRegistry";
import { getAnalysisDetailContent } from "../analysisContent";
import { AnalysisDetailTemplate } from "./AnalysisDetailTemplate";
import { renderVisual } from "./AnalysisPlaceholders";

const EMPTY_COPY = {
  title: "No live analysis yet",
  body: "This folder is staged for upcoming releases. Check back soon for live diagnostics.",
};

type Props = {
  selectedItem: AnalysisItem | null;
  onBackToRail: () => void;
  detailRef: RefObject<HTMLElement>;
};

export function AnalysisDetail({ selectedItem, onBackToRail, detailRef }: Props) {
  if (!selectedItem) {
    return (
      <section className="analysisDetail" ref={detailRef}>
        <header className="analysisDetail__mobileHeader">
          <button type="button" className="analysisDetail__back" onClick={onBackToRail}>
            <span className="material-symbols-rounded" aria-hidden="true">
              arrow_back
            </span>
            Back to list
          </button>
        </header>
        <div className="analysisEmpty">
          <h3>{EMPTY_COPY.title}</h3>
          <p>{EMPTY_COPY.body}</p>
        </div>
      </section>
    );
  }

  const content = getAnalysisDetailContent(selectedItem);

  if (!content) {
    return (
      <section className="analysisDetail" ref={detailRef}>
        <header className="analysisDetail__mobileHeader">
          <button type="button" className="analysisDetail__back" onClick={onBackToRail}>
            <span className="material-symbols-rounded" aria-hidden="true">
              arrow_back
            </span>
            Back to list
          </button>
        </header>
        <div className="analysisEmpty">
          <h3>{selectedItem.title}</h3>
          <p>Detail content is staged for a future drop.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="analysisDetail" ref={detailRef}>
      <header className="analysisDetail__mobileHeader">
        <button type="button" className="analysisDetail__back" onClick={onBackToRail}>
          <span className="material-symbols-rounded" aria-hidden="true">
            arrow_back
          </span>
          Back to list
        </button>
      </header>
      <AnalysisDetailTemplate
        title={selectedItem.title}
        content={content}
        visualSlot={
          <div className="analysisVisualGrid">
            {content.visuals.map((visual, index) => (
              <div className="analysisVisualGrid__item" key={`${visual}-${index}`}>
                {renderVisual(visual)}
              </div>
            ))}
          </div>
        }
      />
    </section>
  );
}
