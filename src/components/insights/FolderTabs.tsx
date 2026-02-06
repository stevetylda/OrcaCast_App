import type { KeyboardEvent } from "react";
import type { AnalysisTab } from "../../features/analysis/analysisRegistry";

type Props = {
  tabs: AnalysisTab[];
  activeTabId: string;
  onSelect: (tabId: AnalysisTab["id"]) => void;
};

const TAB_ICONS: Record<AnalysisTab["id"], string> = {
  overview: "auto_awesome",
  sightings: "visibility",
  humans: "diversity_3",
  environment: "eco",
  prey: "sailing",
  relationships: "sync_alt",
};

export function FolderTabs({ tabs, activeTabId, onSelect }: Props) {
  const tabIds = tabs.map((tab) => tab.id);
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      const target = event.currentTarget.getAttribute("data-tab-id");
      if (target) {
        event.preventDefault();
        onSelect(target as AnalysisTab["id"]);
      }
      return;
    }
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const currentIndex = tabIds.findIndex((id) => id === activeTabId);
    if (currentIndex === -1) return;
    const nextIndex =
      event.key === "ArrowRight"
        ? (currentIndex + 1) % tabIds.length
        : (currentIndex - 1 + tabIds.length) % tabIds.length;
    const nextId = tabIds[nextIndex];
    if (nextId) onSelect(nextId);
  };

  return (
    <div className="folderTabs" role="tablist" aria-label="Insights tabs">
      <div className="folderTabs__scroll">
        {tabs.map((tab, index) => {
          const isActive = tab.id === activeTabId;
          return (
            <button
              key={tab.id}
              type="button"
              className={isActive ? "folderTab folderTab--active" : "folderTab"}
              role="tab"
              id={`analysis-tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`analysis-panel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              data-tab-id={tab.id}
              style={{ zIndex: isActive ? 40 : 10 + index }}
              onClick={() => onSelect(tab.id)}
              onKeyDown={handleKeyDown}
            >
              <span className="material-symbols-rounded folderTab__icon" aria-hidden="true">
                {TAB_ICONS[tab.id]}
              </span>
              <span className="folderTab__label">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
