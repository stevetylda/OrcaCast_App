import type { AnalysisTab } from "../analysisRegistry";

type Props = {
  tabs: AnalysisTab[];
  activeTabId: string;
  onSelect: (tabId: AnalysisTab["id"]) => void;
};

export function AnalysisTabs({ tabs, activeTabId, onSelect }: Props) {
  return (
    <div className="analysisTabs" role="tablist" aria-label="Insights tabs">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <button
            key={tab.id}
            type="button"
            className={isActive ? "analysisTab analysisTab--active" : "analysisTab"}
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(tab.id)}
          >
            <span className="analysisTab__label">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
