import type { ViewabilityAnalysisTab } from "../useViewabilityPageController";

type Props = {
  activeTab: ViewabilityAnalysisTab;
  onTabChange: (tab: ViewabilityAnalysisTab) => void;
  sourceDisabled: boolean;
};

export function ViewabilityAnalysisTabs({ activeTab, onTabChange, sourceDisabled }: Props) {
  return (
    <div className="viewabilityAnalysisTabs" role="tablist" aria-label="Viewability analysis tabs">
      <button
        type="button"
        className={activeTab === "conditions" ? "isSelected" : ""}
        onClick={() => onTabChange("conditions")}
        role="tab"
        aria-selected={activeTab === "conditions"}
      >
        Conditions
      </button>
      <button
        type="button"
        className={activeTab === "source" ? "isSelected" : ""}
        onClick={() => onTabChange("source")}
        disabled={sourceDisabled}
        role="tab"
        aria-selected={activeTab === "source"}
      >
        Source
      </button>
    </div>
  );
}
