import type { SourceCellTimeSeriesPoint } from "../../../data/viewabilityTypes";

type Props = {
  points: SourceCellTimeSeriesPoint[];
};

const WIDTH = 320;
const HEIGHT = 132;
const MARGIN = { top: 12, right: 12, bottom: 24, left: 30 };
const PLOT_WIDTH = WIDTH - MARGIN.left - MARGIN.right;
const PLOT_HEIGHT = HEIGHT - MARGIN.top - MARGIN.bottom;

function finiteValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function xForIndex(index: number, count: number): number {
  if (count <= 1) return MARGIN.left + PLOT_WIDTH / 2;
  return MARGIN.left + (index / (count - 1)) * PLOT_WIDTH;
}

function yForValue(value: number, max: number): number {
  return MARGIN.top + (1 - Math.max(0, Math.min(1, value / max))) * PLOT_HEIGHT;
}

function linePath(points: SourceCellTimeSeriesPoint[], max: number): string {
  return points.reduce((path, point, index) => {
    const value = finiteValue(point.dynamic_viewability);
    if (value === undefined) return path;
    const command = path.length === 0 ? "M" : "L";
    return `${path}${command}${xForIndex(index, points.length).toFixed(2)},${yForValue(value, max).toFixed(2)}`;
  }, "");
}

function labelDate(value: string | undefined): string {
  if (!value) return "";
  return value.length >= 7 ? value.slice(0, 7) : value;
}

export function NearbyViewabilityTimeSeries({ points }: Props) {
  if (points.length === 0) {
    return <div className="viewabilityEmptyState">Source time-series data unavailable.</div>;
  }

  const values = points.map((point) => finiteValue(point.dynamic_viewability) ?? 0);
  const max = Math.max(...values, 1);
  const latest = points.at(-1);
  const latestValue = finiteValue(latest?.dynamic_viewability);
  const path = linePath(points, max);

  return (
    <div className="viewabilitySourceSeries" aria-label="Viewable target score over time">
      <div className="viewabilitySourceSeries__summary">
        <span>{points.length} days</span>
        <strong>{latestValue === undefined ? "-" : latestValue.toFixed(3)}</strong>
      </div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" role="img">
        <line className="viewabilitySourceSeries__grid" x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={yForValue(max, max)} y2={yForValue(max, max)} />
        <line className="viewabilitySourceSeries__grid" x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={yForValue(max / 2, max)} y2={yForValue(max / 2, max)} />
        <line className="viewabilitySourceSeries__grid" x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={yForValue(0, max)} y2={yForValue(0, max)} />
        <line className="viewabilitySourceSeries__axis" x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={HEIGHT - MARGIN.bottom} y2={HEIGHT - MARGIN.bottom} />
        <line className="viewabilitySourceSeries__axis" x1={MARGIN.left} x2={MARGIN.left} y1={MARGIN.top} y2={HEIGHT - MARGIN.bottom} />
        <text className="viewabilitySourceSeries__tick" x={4} y={yForValue(max, max) + 4}>{max.toFixed(2)}</text>
        <text className="viewabilitySourceSeries__tick" x={4} y={yForValue(0, max) + 4}>0</text>
        <text className="viewabilitySourceSeries__tick" x={MARGIN.left} y={HEIGHT - 6}>{labelDate(points[0]?.period)}</text>
        <text className="viewabilitySourceSeries__tick viewabilitySourceSeries__tick--end" x={WIDTH - MARGIN.right} y={HEIGHT - 6}>
          {labelDate(latest?.period)}
        </text>
        {path && <path className="viewabilitySourceSeries__line" d={path} fill="none" />}
      </svg>
    </div>
  );
}
