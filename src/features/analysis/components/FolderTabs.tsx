import type { AnalysisTab } from "../analysisRegistry";

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
  return (
    <div className="folderTabs" role="tablist" aria-label="Insights tabs">
      <div className="folderTabs__scroll">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <button
              key={tab.id}
              type="button"
              className={isActive ? "folderTab folderTab--active" : "folderTab"}
              role="tab"
              aria-selected={isActive}
              onClick={() => onSelect(tab.id)}
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
