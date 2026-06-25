import type {
  SourceCellTimeSeriesPoint,
  ViewabilitySourceFeature,
} from "../../../data/viewabilityTypes";
import { NearbyViewabilityTimeSeries } from "../charts/NearbyViewabilityTimeSeries";

type Props = {
  source: ViewabilitySourceFeature | null;
  timeSeries: SourceCellTimeSeriesPoint[];
  onClose: () => void;
};

export function ViewabilityInspectorPanel({ source, timeSeries, onClose }: Props) {
  if (!source) return null;

  const props = source.properties;

  return (
    <aside className="viewabilityInspector" aria-label="Selected source inspector">
      <div className="viewabilityPanelHeader">
        <div>
          <h2>Source Time Series</h2>
          <p>{props.h3}</p>
        </div>
        <button type="button" className="iconBtn iconBtn--ghost" aria-label="Close inspector" onClick={onClose}>
          <span className="material-symbols-rounded" aria-hidden="true">
            close
          </span>
        </button>
      </div>

      <section className="viewabilityPanelSection">
        <h3>Viewable Target Score Over Time</h3>
        <NearbyViewabilityTimeSeries points={timeSeries} />
      </section>
    </aside>
  );
}
