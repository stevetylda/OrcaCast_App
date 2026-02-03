import { useMemo, useState } from "react";
import {
  ANALYSIS_ITEMS,
  ANALYSIS_TABS,
  ANALYSIS_TAB_LABELS,
  type AnalysisItem,
  type AnalysisTabId,
} from "../analysisRegistry";
import { AnalysisDetail } from "./AnalysisDetail";
import { AnalysisRail } from "./AnalysisRail";
import { AnalysisTabs } from "./AnalysisTabs";

const REPORTED_DISCLAIMER = "Reported sightings ≠ real-time locations.";

const overviewStories = [
  {
    title: "What changed vs last week?",
    body: "Sightings concentrated more tightly around the central corridor, while fringe reports faded.",
    links: [
      { tab: "sightings" as const, item: "hotspots", label: "See hotspot persistence" },
      { tab: "sightings" as const, item: "lag_structure", label: "Check lag structure" },
    ],
  },
  {
    title: "Most confident areas",
    body: "Core nearshore zones show consistent reporting and lower variance week-to-week.",
    links: [
      { tab: "sightings" as const, item: "seasonality", label: "Seasonality baseline" },
      { tab: "sightings" as const, item: "gap_analysis", label: "Coverage gaps" },
    ],
  },
  {
    title: "Most uncertain areas",
    body: "Offshore areas remain under-sampled with sparse effort data. Confidence is limited.",
    links: [
      { tab: "humans" as const, item: "effort_proxy", label: "Effort proxy" },
      { tab: "humans" as const, item: "accessibility_bias", label: "Accessibility bias" },
    ],
  },
  {
    title: "Top plausible drivers",
    body: "Calendar effects and observation effort are the dominant near-term drivers this week.",
    links: [
      { tab: "humans" as const, item: "calendar_effects", label: "Calendar effects" },
      { tab: "humans" as const, item: "effort_proxy", label: "Effort proxy" },
      { tab: "relationships" as const, item: "lag_detective", label: "Lag detective" },
    ],
  },
];

const getDefaultSelection = (itemsByTab: Record<string, AnalysisItem[]>) => {
  return Object.keys(itemsByTab).reduce<Record<string, string | null>>((acc, tabId) => {
    const readyItem = itemsByTab[tabId].find((item) => item.status !== "coming_soon");
    acc[tabId] = readyItem ? readyItem.id : null;
    return acc;
  }, {});
};

export function AnalysisShell() {
  const itemsByTab = useMemo(() => {
    return ANALYSIS_ITEMS.reduce<Record<string, AnalysisItem[]>>((acc, item) => {
      if (!acc[item.tab]) {
        acc[item.tab] = [];
      }
      acc[item.tab].push(item);
      return acc;
    }, {});
  }, []);

  const defaultSelection = useMemo(() => getDefaultSelection(itemsByTab), [itemsByTab]);
  const [activeTab, setActiveTab] = useState<AnalysisTabId>("overview");
  const [selectedByTab, setSelectedByTab] = useState<Record<string, string | null>>(defaultSelection);
  const [railOpen, setRailOpen] = useState(true);

  const activeItems = activeTab === "overview" ? [] : itemsByTab[activeTab] ?? [];
  const selectedItemId = activeTab === "overview" ? null : selectedByTab[activeTab] ?? null;
  const selectedItem = activeItems.find((item) => item.id === selectedItemId) ?? null;

  const handleTabSelect = (tabId: AnalysisTabId) => {
    setActiveTab(tabId);
    setRailOpen(true);

    if (tabId !== "overview" && !selectedByTab[tabId]) {
      const readyItem = itemsByTab[tabId]?.find((item) => item.status !== "coming_soon");
      setSelectedByTab((prev) => ({
        ...prev,
        [tabId]: readyItem ? readyItem.id : null,
      }));
    }
  };

  const handleItemSelect = (item: AnalysisItem) => {
    if (item.status === "coming_soon") {
      return;
    }
    setSelectedByTab((prev) => ({ ...prev, [item.tab]: item.id }));
    setRailOpen(false);
  };

  const handleOverviewLink = (tabId: AnalysisTabId, itemId: string) => {
    setActiveTab(tabId);
    setSelectedByTab((prev) => ({ ...prev, [tabId]: itemId }));
    setRailOpen(false);
  };

  return (
    <div className="analysisShell">
      <header className="analysisHeader">
        <div>
          <h2>Insights & Analysis</h2>
          <p>
            Structured diagnostics that summarize reported sighting patterns, proxy signals, and
            relationship checks in one place.
          </p>
        </div>
        <span className="analysisHeader__disclaimer">{REPORTED_DISCLAIMER}</span>
      </header>

      <AnalysisTabs tabs={ANALYSIS_TABS} activeTabId={activeTab} onSelect={handleTabSelect} />

      {activeTab === "overview" ? (
        <section className="analysisOverview">
          <div className="analysisOverview__intro">
            <h3>This Week&apos;s Story</h3>
            <p>
              A high-level synthesis of what changed, where we&apos;re confident, and what deserves
              deeper investigation.
            </p>
          </div>
          <div className="analysisOverview__cards">
            {overviewStories.map((story) => (
              <article key={story.title} className="analysisOverviewCard">
                <h4>{story.title}</h4>
                <p>{story.body}</p>
                <div className="analysisOverviewCard__links">
                  {story.links.map((link) => (
                    <button
                      key={link.label}
                      type="button"
                      className="analysisOverviewCard__link"
                      onClick={() => handleOverviewLink(link.tab, link.item)}
                    >
                      {ANALYSIS_TAB_LABELS[link.tab]} · {link.label}
                    </button>
                  ))}
                </div>
              </article>
            ))}
          </div>
          <div className="analysisOverview__note">
            <p>
              How to read this page: these analyses describe reported sightings and related proxy
              signals, not ground-truth animal locations. {REPORTED_DISCLAIMER}
            </p>
          </div>
        </section>
      ) : (
        <section className="analysisLayout">
          <AnalysisRail
            items={activeItems}
            selectedId={selectedItemId}
            isOpen={railOpen}
            onSelect={handleItemSelect}
            onClose={() => setRailOpen(false)}
          />
          <AnalysisDetail selectedItem={selectedItem} onBackToRail={() => setRailOpen(true)} />
        </section>
      )}
    </div>
  );
}
