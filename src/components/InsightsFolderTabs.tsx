import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactElement } from "react";
import { ComingSoonWedge } from "./wedges/ComingSoonWedge";
import { ContextSignatureRadarWedge } from "./wedges/ContextSignatureRadarWedge";
import { DayOfWeekHolidaysWedge } from "./wedges/DayOfWeekHolidaysWedge";
import { SeasonalityWedge } from "./wedges/SeasonalityWedge";
import { SpatialPersistenceWedge } from "./wedges/SpatialPersistenceWedge";

type WedgeStatus = "live" | "soon";

type WedgeDefinition = {
  key: string;
  title: string;
  description: string;
  status: WedgeStatus;
};

const wedgeDefinitions: WedgeDefinition[] = [
  {
    key: "seasonality",
    title: "Seasonality",
    description: "Annual rhythms in sightings: week-of-year patterns and anomalies.",
    status: "live",
  },
  {
    key: "persistence",
    title: "Persistence",
    description: "How sticky hotspots are week-to-week (habitat vs events).",
    status: "live",
  },
  {
    key: "dow_holidays",
    title: "Time & Holidays",
    description: "Observer patterns and reporting effects across weeks and holidays.",
    status: "live",
  },
  {
    key: "context_radar",
    title: "Context Signature",
    description: "A character-sheet radar: seasonality, burstiness, concentration.",
    status: "live",
  },
  {
    key: "regime_shifts",
    title: "Regime Shifts",
    description: "Decadal changes and multi-year shifts in sightings structure.",
    status: "soon",
  },
  {
    key: "regional_signatures",
    title: "Regional Signatures",
    description: "How patterns differ across regions and coastal zones.",
    status: "soon",
  },
  {
    key: "environment",
    title: "Environmental",
    description: "Alignment with SST / chl-a proxies (correlation, not causation).",
    status: "soon",
  },
  {
    key: "prey",
    title: "Prey Proxies",
    description: "Salmon signal alignment and lead/lag relationships.",
    status: "soon",
  },
  {
    key: "human_activity",
    title: "Human Activity",
    description: "Weekend pressure, AIS boat density, whale-watch effort signals.",
    status: "soon",
  },
  {
    key: "bias_diagnostics",
    title: "Bias & Coverage",
    description: "Data density, reporting gaps, and observer confounding diagnostics.",
    status: "soon",
  },
];

const wedgePanels: Record<string, ReactElement> = {
  seasonality: <SeasonalityWedge />,
  persistence: <SpatialPersistenceWedge />,
  dow_holidays: <DayOfWeekHolidaysWedge />,
  context_radar: <ContextSignatureRadarWedge />,
};

function findNextEnabledIndex(definitions: WedgeDefinition[], startIndex: number, direction: 1 | -1) {
  const total = definitions.length;
  let nextIndex = startIndex;
  do {
    nextIndex = (nextIndex + direction + total) % total;
    if (definitions[nextIndex].status === "live") {
      return nextIndex;
    }
  } while (nextIndex !== startIndex);
  return startIndex;
}

export function InsightsFolderTabs() {
  const defaultKey = wedgeDefinitions.find((wedge) => wedge.status === "live")?.key ?? "seasonality";
  const [activeKey, setActiveKey] = useState<string>(defaultKey);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const activeIndex = useMemo(
    () => wedgeDefinitions.findIndex((wedge) => wedge.key === activeKey),
    [activeKey]
  );

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) {
      return;
    }

    const updateFades = () => {
      const { scrollLeft, scrollWidth, clientWidth } = element;
      setShowLeftFade(scrollLeft > 4);
      setShowRightFade(scrollLeft + clientWidth < scrollWidth - 4);
    };

    updateFades();
    element.addEventListener("scroll", updateFades);
    window.addEventListener("resize", updateFades);

    return () => {
      element.removeEventListener("scroll", updateFades);
      window.removeEventListener("resize", updateFades);
    };
  }, []);

  const handleSelect = (definition: WedgeDefinition) => {
    if (definition.status === "live") {
      setActiveKey(definition.key);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      const direction = event.key === "ArrowRight" ? 1 : -1;
      const nextIndex = findNextEnabledIndex(wedgeDefinitions, index, direction);
      const nextTab = tabRefs.current[nextIndex];
      if (nextTab) {
        nextTab.focus();
      }
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const definition = wedgeDefinitions[index];
      handleSelect(definition);
    }
  };

  const scrollClasses = [
    "insightsTabs__scroll",
    showLeftFade ? "insightsTabs__scroll--fadeLeft" : "",
    showRightFade ? "insightsTabs__scroll--fadeRight" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="insightsTabs">
      <div className={scrollClasses} ref={scrollRef}>
        <div className="insightsTabs__row" role="tablist" aria-label="Insights wedges">
          {wedgeDefinitions.map((definition, index) => {
            const isActive = definition.key === activeKey;
            const isLive = definition.status === "live";
            const tabId = `insights-tab-${definition.key}`;
            const panelId = `insights-panel-${definition.key}`;
            const tabClasses = [
              "insightsTab",
              isActive ? "insightsTab--active" : "",
              !isLive ? "insightsTab--soon" : "",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <button
                key={definition.key}
                ref={(node) => {
                  tabRefs.current[index] = node;
                }}
                id={tabId}
                className={tabClasses}
                role="tab"
                aria-selected={isActive}
                aria-controls={panelId}
                aria-disabled={!isLive}
                tabIndex={isLive ? (isActive ? 0 : -1) : -1}
                type="button"
                onClick={() => handleSelect(definition)}
                onKeyDown={(event) => handleKeyDown(event, index)}
                title={!isLive ? "Coming soon — planned for v1" : undefined}
              >
                <span className="insightsTab__label">{definition.title}</span>
                {!isLive && (
                  <span className="insightsTab__soon" aria-hidden="true">
                    Soon
                  </span>
                )}
                {!isLive && <span className="insightsTab__tooltip">Coming soon — planned for v1</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="insightsPanel" aria-live="polite">
        {wedgeDefinitions.map((definition) => {
          const panelId = `insights-panel-${definition.key}`;
          const tabId = `insights-tab-${definition.key}`;
          const isActive = definition.key === activeKey;
          return (
            <section
              key={definition.key}
              id={panelId}
              role="tabpanel"
              aria-labelledby={tabId}
              hidden={!isActive}
              className="insightsPanel__content"
            >
              {definition.status === "live" ? (
                wedgePanels[definition.key]
              ) : (
                <ComingSoonWedge title={definition.title} description={definition.description} />
              )}
            </section>
          );
        })}
      </div>

      {activeIndex !== -1 && (
        <p className="insightsTabs__footer">
          {wedgeDefinitions[activeIndex].description}
          {wedgeDefinitions[activeIndex].status === "soon" && " (Coming soon)."}
        </p>
      )}
    </div>
  );
}
