import { useMemo, useRef, useState } from "react";
import {
  ANALYSIS_ITEMS,
  ANALYSIS_TABS,
  type AnalysisItem,
  type AnalysisTabId,
} from "../analysisRegistry";
import { AnalysisDetail } from "./AnalysisDetail";
import { AnalysisRail } from "./AnalysisRail";
import { LensBadge } from "./LensBadge";
import { navigateToAnalysis } from "../utils/navigateToAnalysis";
import {
  getInsightsStoryModel,
  TIME_WINDOW_LABELS,
  type StoryAction,
  type TimeWindow,
} from "../../../mock/insightsStoryMock";
import { Sparkline } from "../../../components/insights/Sparkline";
import { InfoTip } from "../../../components/insights/InfoTip";
import { FolderTabs } from "../../../components/insights/FolderTabs";
import { ActionPill } from "../../../components/insights/ActionPill";

const getDefaultSelection = (itemsByTab: Record<string, AnalysisItem[]>) => {
  return Object.keys(itemsByTab).reduce<Record<string, string | null>>((acc, tabId) => {
    const readyItem = itemsByTab[tabId].find((item) => item.status !== "coming_soon");
    acc[tabId] = readyItem ? readyItem.id : null;
    return acc;
  }, {});
};

export function AnalysisShell() {
  const detailRef = useRef<HTMLElement | null>(null);
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
  const [pulsedItemId, setPulsedItemId] = useState<string | null>(null);
  const [timeWindow, setTimeWindow] = useState<TimeWindow>("week");

  const storyModel = useMemo(() => getInsightsStoryModel(timeWindow), [timeWindow]);

  const activeItems = activeTab === "overview" ? [] : itemsByTab[activeTab] ?? [];
  const selectedItemId = activeTab === "overview" ? null : selectedByTab[activeTab] ?? null;
  const selectedItem = activeItems.find((item) => item.id === selectedItemId) ?? null;
  const getActionCategory = (tabId: AnalysisTabId) => {
    switch (tabId) {
      case "sightings":
        return "Sightings";
      case "humans":
        return "Humans";
      case "environment":
        return "Environment";
      case "prey":
        return "Prey";
      case "relationships":
        return "Relationships";
      default:
        return "Overview";
    }
  };
  const splitActions = (actions: StoryAction[]) => {
    const primary = actions.find((action) => action.kind === "primary") ?? actions[0];
    const secondary = actions.filter((action) => action !== primary);
    return { primary, secondary };
  };

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
    setPulsedItemId(item.id);
    setTimeout(() => setPulsedItemId(null), 900);
  };

  const handleOverviewLink = (tabId: AnalysisTabId, itemId: string) => {
    navigateToAnalysis({
      tabId,
      itemId,
      setActiveTab,
      setSelectedByTab,
      setRailOpen,
      detailRef,
      onPulse: (pulseId) => {
        setPulsedItemId(pulseId);
        setTimeout(() => setPulsedItemId(null), 900);
      },
    });
  };

  return (
    <div className="analysisShell">
      <div className="analysisPanel">
        <FolderTabs tabs={ANALYSIS_TABS} activeTabId={activeTab} onSelect={handleTabSelect} />

        {activeTab === "overview" ? (
          <section
            className="analysisOverview"
            id="analysis-panel-overview"
            role="tabpanel"
            aria-labelledby="analysis-tab-overview"
          >
            <header className="analysisControls">
              <div className="analysisControls__left">
                <h3>Weekly briefing</h3>
                <p>Quick synthesis of shifts, confidence signals, and plausible drivers.</p>
              </div>
              <div className="analysisControls__right">
                <LensBadge variant="header" label={storyModel.lensLabel} />
                <div className="analysisControls__meta">
                  <div className="analysisControls__time">
                    {(["week", "4w", "12w"] as TimeWindow[]).map((window) => (
                      <button
                        key={window}
                        type="button"
                        className={
                          window === timeWindow
                            ? "analysisControls__timeBtn analysisControls__timeBtn--active"
                            : "analysisControls__timeBtn"
                        }
                        onClick={() => setTimeWindow(window)}
                        aria-pressed={window === timeWindow}
                      >
                        {TIME_WINDOW_LABELS[window]}
                      </button>
                    ))}
                  </div>
                  <span className="analysisControls__updated">Updated: {storyModel.lastUpdated}</span>
                </div>
              </div>
            </header>
            <div className="analysisOverview__grid">
              <div className="analysisOverview__cards">
                {storyModel.storyCards.map((story) => {
                  const { primary, secondary } = splitActions(story.actions);
                  return (
                    <article key={story.id} className="analysisOverviewCard">
                      <div className="analysisOverviewCard__header">
                        <h4>{story.title}</h4>
                        {story.infoTip ? (
                          <InfoTip
                            label={`${story.title} details`}
                            title={story.title}
                            body={story.infoTip}
                          />
                        ) : null}
                      </div>
                      <p>{story.body}</p>
                      {story.metricHint ? (
                        <div className="analysisOverviewCard__meta">{story.metricHint}</div>
                      ) : null}
                      {primary ? (
                        <button
                          key={primary.label}
                          type="button"
                          className="analysisOverviewCard__link analysisOverviewCard__link--primary"
                          onClick={() => handleOverviewLink(primary.to.tab, primary.to.item)}
                          title={primary.label}
                        >
                          <ActionPill
                            category={getActionCategory(primary.to.tab)}
                            label={primary.label}
                          />
                          <span className="material-symbols-rounded" aria-hidden="true">
                            arrow_forward
                          </span>
                        </button>
                      ) : null}
                      {secondary.length > 0 ? (
                        <div className="analysisOverviewCard__secondary">
                          {secondary.map((link) => (
                            <button
                              key={link.label}
                              type="button"
                              className="analysisOverviewCard__textLink"
                              onClick={() => handleOverviewLink(link.to.tab, link.to.item)}
                              title={link.label}
                            >
                              <span className="analysisOverviewCard__textTag">
                                {getActionCategory(link.to.tab)}
                              </span>
                              <span className="analysisOverviewCard__textLabel">{link.label}</span>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
              <div className="analysisOverview__hero">
                <div className="analysisHero">
                  <div className="analysisHero__header">
                    <div>
                      <p className="analysisHero__eyebrow">Diagnostics</p>
                      <div className="analysisHero__titleRow">
                        <h4>Weekly activity signal</h4>
                        <InfoTip
                          label="Weekly activity signal details"
                          title="Weekly activity signal"
                          body="Summary of movement in reported activity for the selected window. It reflects reporting patterns, not verified presence."
                        />
                      </div>
                    </div>
                    <span className="analysisHero__badge">
                      {storyModel.heroMetrics[0]?.value ?? "0%"}
                    </span>
                  </div>
                  <div className="analysisHero__metrics">
                    {storyModel.heroMetrics.map((metric) => (
                      <div key={metric.label} className="analysisHeroMetric">
                        <span className="analysisHeroMetric__label">{metric.label}</span>
                        <span className="analysisHeroMetric__value">{metric.value}</span>
                        {metric.delta ? (
                          <span className="analysisHeroMetric__delta">{metric.delta}</span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                  <div className="analysisHero__visual">
                    <div className="analysisHero__spark">
                      <div className="analysisHero__tileHeader">
                        <span>Trend signal</span>
                        <InfoTip
                          label="Trend signal details"
                          title="Trend signal"
                          body="A compact view of recent activity movement (relative change), not absolute counts."
                        />
                      </div>
                      <Sparkline
                        data={storyModel.sightingsSeries}
                        height={56}
                        strokeWidth={2.5}
                        ariaLabel="Sightings trend sparkline"
                      />
                      <div className="analysisHero__sparkMeta">
                        <span>+8% vs prior window</span>
                      </div>
                    </div>
                    <div className="analysisHero__secondary">
                      <div className="analysisHero__tileHeader">
                        <span>Coverage vs sightings</span>
                        <InfoTip
                          label="Coverage vs sightings details"
                          title="Coverage vs sightings"
                          body="Checks whether reporting coverage changes could explain sighting shifts."
                        />
                      </div>
                      <Sparkline
                        data={storyModel.coverageSeries ?? storyModel.sightingsSeries}
                        height={48}
                        strokeWidth={2}
                        ariaLabel="Coverage trend sparkline"
                      />
                      <span className="analysisHero__secondaryHint">Proxy coverage stability</span>
                    </div>
                  </div>
                  <div className="analysisHero__map">
                    <div className="analysisHero__tileHeader">
                      <span>Hotspot mini-map</span>
                      <InfoTip
                        label="Hotspot mini-map details"
                        title="Hotspot mini-map"
                        body="Thumbnail preview of hotspot persistence proxies. Open Sightings and Hotspots for full diagnostics."
                      />
                    </div>
                    <div className="analysisMap">
                      <div className="analysisMap__glow" />
                      <div className="analysisMap__route" />
                      <div className="analysisMap__dot" />
                      <div className="analysisMap__dot analysisMap__dot--secondary" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="analysisOverview__note">
              <p>
                These analyses describe reported sightings and proxy signals, not confirmed animal
                locations.
              </p>
            </div>
          </section>
        ) : (
          <section
            className="analysisLayout"
            id={`analysis-panel-${activeTab}`}
            role="tabpanel"
            aria-labelledby={`analysis-tab-${activeTab}`}
          >
            <AnalysisRail
              items={activeItems}
              selectedId={selectedItemId}
              isOpen={railOpen}
              pulsedItemId={pulsedItemId}
              onSelect={handleItemSelect}
              onClose={() => setRailOpen(false)}
            />
            <AnalysisDetail
              selectedItem={selectedItem}
              onBackToRail={() => setRailOpen(true)}
              detailRef={detailRef}
            />
          </section>
        )}
      </div>
    </div>
  );
}
