import { useState } from "react";
import type {
  SourceTargetVisibilityRecord,
  ViewabilitySightingsBin,
  ViewabilitySourceFeature,
} from "../../../data/viewabilityTypes";
import { formatScore } from "../utils/viewabilityColorScales";
import { SightingsVsViewabilityChart } from "../charts/SightingsVsViewabilityChart";

type Tab = "relationship" | "components" | "details";

type Props = {
  open: boolean;
  onToggleOpen: () => void;
  bins: ViewabilitySightingsBin[];
  source: ViewabilitySourceFeature | null;
  visibility: SourceTargetVisibilityRecord[];
};

export function ViewabilityBottomDrawer({ open, onToggleOpen, bins, source, visibility }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("relationship");
  const mean = (key: keyof SourceTargetVisibilityRecord) => {
    const values = visibility.map((record) => record[key]).filter((value): value is number => typeof value === "number");
    return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : undefined;
  };

  return (
    <section className={`viewabilityBottomDrawer${open ? " isOpen" : ""}`} aria-label="Viewability analysis drawer">
      <button type="button" className="viewabilityBottomDrawer__handle" onClick={onToggleOpen} aria-expanded={open}>
        <span className="material-symbols-rounded" aria-hidden="true">
          {open ? "keyboard_arrow_down" : "keyboard_arrow_up"}
        </span>
        <span>Analysis</span>
      </button>
      {open && (
        <div className="viewabilityBottomDrawer__body">
          <div className="viewabilityTabs" role="tablist" aria-label="Viewability analysis tabs">
            {(["relationship", "components", "details"] as Tab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                className={`viewabilityTabs__tab${activeTab === tab ? " isSelected" : ""}`}
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => setActiveTab(tab)}
              >
                {tab[0].toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {activeTab === "relationship" && (
            <div className="viewabilityDrawerPanel">
              <h3>Sightings vs. Dynamic Viewability</h3>
              <SightingsVsViewabilityChart bins={bins} />
            </div>
          )}

          {activeTab === "components" && (
            <div className="viewabilityDrawerPanel">
              <h3>Components</h3>
              <div className="viewabilityComponentGrid">
                <div>Distance weight <strong>{formatScore(mean("weight_distance"))}</strong></div>
                <div>Terrain weight <strong>{formatScore(mean("weight_terrain"))}</strong></div>
                <div>Vegetation weight <strong>{formatScore(mean("weight_vegetation"))}</strong></div>
                <div>Weather modifier <strong>Fixture pending</strong></div>
                <div>Daylight modifier <strong>Fixture pending</strong></div>
              </div>
            </div>
          )}

          {activeTab === "details" && (
            <div className="viewabilityDrawerPanel">
              <h3>Details</h3>
              <div className="viewabilityDetailsGrid">
                <span>Selected source</span>
                <strong>{source?.properties.h3 ?? "None"}</strong>
                <span>Visible target records</span>
                <strong>{visibility.length}</strong>
                <span>Mean source-target weight</span>
                <strong>{formatScore(mean("source_target_weight"))}</strong>
                <span>Data status</span>
                <strong>Fixture scaffold</strong>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
