import type {
  SourceCellConditions,
  SourceCellTimeSeriesPoint,
  SourceTargetVisibilityRecord,
  ViewabilitySourceFeature,
} from "../../../data/viewabilityTypes";
import { formatScore } from "../utils/viewabilityColorScales";
import { NearbyViewabilityTimeSeries } from "../charts/NearbyViewabilityTimeSeries";

type Props = {
  source: ViewabilitySourceFeature | null;
  conditions: SourceCellConditions | null;
  visibility: SourceTargetVisibilityRecord[];
  timeSeries: SourceCellTimeSeriesPoint[];
  onClose: () => void;
};

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="viewabilityStat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function ViewabilityInspectorPanel({ source, conditions, visibility, timeSeries, onClose }: Props) {
  if (!source) return null;

  const props = source.properties;
  const weightedVisibleArea = visibility.reduce((sum, record) => sum + (record.source_target_weight ?? 0), 0);
  const meanVisibleScore = visibility.length > 0 ? weightedVisibleArea / visibility.length : 0;
  const topTargetWeight = Math.max(...visibility.map((record) => record.source_target_weight ?? 0), 0);

  return (
    <aside className="viewabilityInspector" aria-label="Selected source inspector">
      <div className="viewabilityPanelHeader">
        <div>
          <h2>Selected Source</h2>
          <p>{props.h3}</p>
        </div>
        <button type="button" className="iconBtn iconBtn--ghost" aria-label="Close inspector" onClick={onClose}>
          <span className="material-symbols-rounded" aria-hidden="true">
            close
          </span>
        </button>
      </div>

      <section className="viewabilityPanelSection">
        <Stat label="Source type" value={props.source_type ?? "-"} />
        <Stat label="Source viewyness score" value={formatScore(props.source_viewyness_score)} />
        <Stat label="Reachable target cells" value={props.reachable_target_count ?? "-"} />
        <Stat label="Mean target weight" value={formatScore(props.mean_target_weight)} />
        <Stat label="Max target weight" value={formatScore(props.max_target_weight)} />
        <Stat label="Effective view radius" value={`${formatScore(props.effective_view_radius_km)} km`} />
      </section>

      <section className="viewabilityPanelSection">
        <h3>Conditions</h3>
        <div className="viewabilityConditionGrid">
          <Stat label="Weather score" value={formatScore(conditions?.weather_score)} />
          <Stat label="Daylight score" value={formatScore(conditions?.daylight_score)} />
          <Stat label="Lunar phase" value={conditions?.lunar_phase ?? "-"} />
          <Stat label="Moon illumination" value={conditions?.moon_illumination ? `${Math.round(conditions.moon_illumination * 100)}%` : "-"} />
          <Stat label="Dynamic modifier" value={formatScore(conditions?.dynamic_modifier)} />
        </div>
      </section>

      <section className="viewabilityPanelSection">
        <h3>What This Cell Can See</h3>
        <Stat label="Visible target cells" value={visibility.length} />
        <Stat label="Weighted visible area" value={formatScore(weightedVisibleArea)} />
        <Stat label="Mean visible score" value={formatScore(meanVisibleScore)} />
        <Stat label="Top target weight" value={formatScore(topTargetWeight)} />
      </section>

      <section className="viewabilityPanelSection">
        <h3>Nearby Viewability Over Time</h3>
        <NearbyViewabilityTimeSeries points={timeSeries} />
      </section>
    </aside>
  );
}
