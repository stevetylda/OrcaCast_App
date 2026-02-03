import type { AnalysisItem } from "../analysisRegistry";

type Props = {
  items: AnalysisItem[];
  selectedId: string | null;
  isOpen: boolean;
  pulsedItemId?: string | null;
  onSelect: (item: AnalysisItem) => void;
  onClose: () => void;
};

export function AnalysisRail({ items, selectedId, isOpen, pulsedItemId, onSelect, onClose }: Props) {
  const coverageLabel = (coverage?: AnalysisItem["coverage"]) => {
    if (!coverage) {
      return "Medium";
    }
    return coverage.charAt(0).toUpperCase() + coverage.slice(1);
  };

  return (
    <aside className={isOpen ? "analysisRail analysisRail--open" : "analysisRail"}>
      <div className="analysisRail__header">
        <div>
          <p className="analysisRail__title">Analyses</p>
          <p className="analysisRail__subtitle">Pick a line to see detail.</p>
        </div>
        <button type="button" className="analysisRail__close" onClick={onClose}>
          <span className="material-symbols-rounded" aria-hidden="true">
            close
          </span>
          <span className="analysisRail__closeLabel">Close</span>
        </button>
      </div>
      <div className="analysisRail__list" role="list">
        {items.map((item) => {
          const isSelected = item.id === selectedId;
          const isReady = item.status !== "coming_soon";
          const isPulsing = item.id === pulsedItemId;
          const itemClasses = [
            "analysisRailItem",
            isSelected ? "analysisRailItem--active" : "",
            isPulsing ? "analysisRailItem--pulse" : "",
            !isReady ? "analysisRailItem--disabled" : "",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <button
              key={item.id}
              type="button"
              className={itemClasses}
              aria-pressed={isSelected}
              aria-disabled={!isReady}
              disabled={!isReady}
              onClick={() => onSelect(item)}
            >
              <div className="analysisRailItem__text">
                <span className="analysisRailItem__title">{item.title}</span>
                {item.subtitle && <span className="analysisRailItem__subtitle">{item.subtitle}</span>}
                <span className="analysisRailItem__metaLine">
                  Coverage: {coverageLabel(item.coverage)} · Status:{" "}
                  {item.status === "coming_soon" ? "Coming soon" : "Ready"}
                </span>
              </div>
              <div className="analysisRailItem__meta">
                <span className="analysisRailItem__chevron" aria-hidden="true">
                  <span className="material-symbols-rounded">chevron_right</span>
                </span>
                {item.lensTag && <span className="analysisTag">{item.lensTag}</span>}
                {!isReady && (
                  <span className="analysisTag analysisTag--soon" title="Coming soon">
                    <span className="material-symbols-rounded" aria-hidden="true">
                      lock
                    </span>
                    Soon
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
