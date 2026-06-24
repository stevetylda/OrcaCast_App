import type { SourceCellTimeSeriesPoint } from "../../../data/viewabilityTypes";

type Props = {
  points: SourceCellTimeSeriesPoint[];
};

export function NearbyViewabilityTimeSeries({ points }: Props) {
  if (points.length === 0) {
    return <div className="viewabilityEmptyState">Time-series data will appear here once viewability history is connected.</div>;
  }

  const max = Math.max(...points.map((point) => point.dynamic_viewability ?? 0), 1);
  return (
    <div className="viewabilityMiniChart" aria-label="Nearby viewability over time">
      {points.map((point) => (
        <div key={point.period} className="viewabilityMiniChart__barWrap">
          <div className="viewabilityMiniChart__bar" style={{ height: `${Math.max(8, ((point.dynamic_viewability ?? 0) / max) * 100)}%` }} />
          <span>{point.period.replace("2026-", "")}</span>
        </div>
      ))}
    </div>
  );
}
