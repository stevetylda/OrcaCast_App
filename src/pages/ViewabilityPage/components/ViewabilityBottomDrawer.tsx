import { useMemo, useState } from "react";
import type { PointerEvent, WheelEvent } from "react";
import type {
  SourceCellTimeSeriesPoint,
  ViewabilityAreaConditionPoint,
  ViewabilityScoreType,
} from "../../../data/viewabilityTypes";

type Metric = "weather" | "daylight" | "lunar";
type PlotMode = "combine" | "stacked";
type AnalysisTab = "conditions" | "source";

type Props = {
  open: boolean;
  onToggleOpen: () => void;
  activeTab: AnalysisTab;
  onTabChange: (tab: AnalysisTab) => void;
  points: ViewabilityAreaConditionPoint[];
  selectedDate: string;
  scoreType: ViewabilityScoreType;
  sourceCellId: string | null;
  sourceTimeSeries: SourceCellTimeSeriesPoint[];
};

type MetricConfig = {
  key: Metric;
  label: string;
  color: string;
  valueKey: keyof ViewabilityAreaConditionPoint;
  lowKey: keyof ViewabilityAreaConditionPoint;
  highKey: keyof ViewabilityAreaConditionPoint;
};

const METRICS: MetricConfig[] = [
  {
    key: "weather",
    label: "Weather",
    color: "#149aa6",
    valueKey: "weather",
    lowKey: "weatherLow",
    highKey: "weatherHigh",
  },
  {
    key: "daylight",
    label: "Daylight",
    color: "#d1a13a",
    valueKey: "daylight",
    lowKey: "daylightLow",
    highKey: "daylightHigh",
  },
  {
    key: "lunar",
    label: "Lunar",
    color: "#8b6cf6",
    valueKey: "lunar",
    lowKey: "lunarLow",
    highKey: "lunarHigh",
  },
];

const WIDTH = 1000;
const HEIGHT = 230;
const STACKED_HEIGHT = 350;
const MARGIN = { top: 18, right: 24, bottom: 34, left: 42 };
const PLOT_WIDTH = WIDTH - MARGIN.left - MARGIN.right;
const PLOT_HEIGHT = HEIGHT - MARGIN.top - MARGIN.bottom;
const MIN_VISIBLE_DAYS = 14;

function numericValue(point: ViewabilityAreaConditionPoint, key: keyof ViewabilityAreaConditionPoint): number | undefined {
  const value = point[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function xForIndex(index: number, count: number): number {
  if (count <= 1) return MARGIN.left + PLOT_WIDTH / 2;
  return MARGIN.left + (index / (count - 1)) * PLOT_WIDTH;
}

function yForValue(value: number): number {
  return MARGIN.top + (1 - Math.max(0, Math.min(1, value))) * PLOT_HEIGHT;
}

function linePath(
  points: ViewabilityAreaConditionPoint[],
  metric: MetricConfig,
  valueKey: keyof ViewabilityAreaConditionPoint = metric.valueKey
): string {
  return points.reduce((path, point, index) => {
    const value = numericValue(point, valueKey);
    if (value === undefined) return path;
    const command = path.length === 0 ? "M" : "L";
    return `${path}${command}${xForIndex(index, points.length).toFixed(2)},${yForValue(value).toFixed(2)}`;
  }, "");
}

function clampWindow(start: number, end: number, count: number): { start: number; end: number } {
  if (count <= 0) return { start: 0, end: 0 };
  const span = Math.min(count, Math.max(1, end - start + 1));
  const clampedStart = Math.max(0, Math.min(count - span, start));
  return { start: clampedStart, end: clampedStart + span - 1 };
}

function boxWidth(count: number): number {
  if (count <= 1) return 8;
  return Math.max(1.4, Math.min(8, (PLOT_WIDTH / count) * 0.64));
}

function formatMetricValue(value: number | undefined): string {
  return value === undefined ? "n/a" : value.toFixed(3);
}

function sourceScoreValue(point: SourceCellTimeSeriesPoint): number | undefined {
  return typeof point.dynamic_viewability === "number" && Number.isFinite(point.dynamic_viewability)
    ? point.dynamic_viewability
    : undefined;
}

function sourceYForValue(value: number, max: number): number {
  return MARGIN.top + (1 - Math.max(0, Math.min(1, value / max))) * PLOT_HEIGHT;
}

function sourceLinePath(points: SourceCellTimeSeriesPoint[], max: number): string {
  return points.reduce((path, point, index) => {
    const value = sourceScoreValue(point);
    if (value === undefined) return path;
    const command = path.length === 0 ? "M" : "L";
    return `${path}${command}${xForIndex(index, points.length).toFixed(2)},${sourceYForValue(value, max).toFixed(2)}`;
  }, "");
}

function periodLabel(value: string | undefined): string {
  return value && value.length >= 7 ? value.slice(0, 7) : value ?? "";
}

function stackedLaneLayout(laneIndex: number, laneCount: number): { top: number; height: number; middle: number } {
  const laneGap = 12;
  const totalHeight = STACKED_HEIGHT - MARGIN.top - MARGIN.bottom;
  const laneHeight = (totalHeight - laneGap * Math.max(0, laneCount - 1)) / Math.max(1, laneCount);
  const top = MARGIN.top + laneIndex * (laneHeight + laneGap);
  return { top, height: laneHeight, middle: top + laneHeight / 2 };
}

function yForStackedValue(value: number, laneIndex: number, laneCount: number): number {
  const lane = stackedLaneLayout(laneIndex, laneCount);
  return lane.top + (1 - Math.max(0, Math.min(1, value))) * lane.height;
}

function stackedLinePath(points: ViewabilityAreaConditionPoint[], metric: MetricConfig, laneIndex: number, laneCount: number): string {
  return points.reduce((path, point, index) => {
    const value = numericValue(point, metric.valueKey);
    if (value === undefined) return path;
    const command = path.length === 0 ? "M" : "L";
    return `${path}${command}${xForIndex(index, points.length).toFixed(2)},${yForStackedValue(value, laneIndex, laneCount).toFixed(2)}`;
  }, "");
}

function stackedBandPath(points: ViewabilityAreaConditionPoint[], metric: MetricConfig, laneIndex: number, laneCount: number): string {
  const high: string[] = [];
  const low: string[] = [];

  points.forEach((point, index) => {
    const lowValue = numericValue(point, metric.lowKey);
    const highValue = numericValue(point, metric.highKey);
    if (lowValue === undefined || highValue === undefined) return;
    const x = xForIndex(index, points.length).toFixed(2);
    high.push(`${x},${yForStackedValue(highValue, laneIndex, laneCount).toFixed(2)}`);
    low.unshift(`${x},${yForStackedValue(lowValue, laneIndex, laneCount).toFixed(2)}`);
  });

  return high.length > 1 ? `M${high.join("L")}L${low.join("L")}Z` : "";
}

export function ViewabilityBottomDrawer({
  open,
  onToggleOpen,
  activeTab,
  onTabChange,
  points,
  selectedDate,
  scoreType,
  sourceCellId,
  sourceTimeSeries,
}: Props) {
  const [visibleMetrics, setVisibleMetrics] = useState<Record<Metric, boolean>>({
    weather: true,
    daylight: true,
    lunar: true,
  });
  const [showVariance, setShowVariance] = useState(true);
  const [plotMode, setPlotMode] = useState<PlotMode>("combine");
  const [visibleWindow, setVisibleWindow] = useState<{ start: number; end: number } | null>(null);
  const [dragStart, setDragStart] = useState<{ clientX: number; start: number; end: number } | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const selectedIndex = useMemo(
    () => points.findIndex((point) => point.date === selectedDate),
    [points, selectedDate]
  );
  const clampedWindow = visibleWindow
    ? clampWindow(visibleWindow.start, visibleWindow.end, points.length)
    : { start: 0, end: Math.max(0, points.length - 1) };
  const visiblePoints = points.slice(clampedWindow.start, clampedWindow.end + 1);
  const selectedVisibleIndex = selectedIndex >= clampedWindow.start && selectedIndex <= clampedWindow.end
    ? selectedIndex - clampedWindow.start
    : -1;
  const firstDate = visiblePoints[0]?.date;
  const lastDate = visiblePoints.at(-1)?.date;
  const isZoomed = points.length > 0 && (clampedWindow.start > 0 || clampedWindow.end < points.length - 1);
  const hoverPoint = hoverIndex === null ? null : visiblePoints[hoverIndex] ?? null;

  const activeMetrics = METRICS.filter((metric) => visibleMetrics[metric.key]);
  const chartHeight = plotMode === "stacked" ? STACKED_HEIGHT : HEIGHT;
  const sourceValues = sourceTimeSeries.map((point) => sourceScoreValue(point) ?? 0);
  const sourceMax = Math.max(...sourceValues, 1);
  const sourcePath = sourceLinePath(sourceTimeSeries, sourceMax);
  const latestSourcePoint = sourceTimeSeries.at(-1);
  const latestSourceValue = latestSourcePoint ? sourceScoreValue(latestSourcePoint) : undefined;

  const zoomChart = (factor: number, focusFraction = 0.5) => {
    setVisibleWindow((current) => {
      const count = points.length;
      if (count <= 0) return current;
      const window = current
        ? clampWindow(current.start, current.end, count)
        : { start: 0, end: count - 1 };
      const span = window.end - window.start + 1;
      const minSpan = Math.min(MIN_VISIBLE_DAYS, count);
      const nextSpan = Math.max(minSpan, Math.min(count, Math.round(span * factor)));
      const focusIndex = window.start + focusFraction * (span - 1);
      const nextStart = Math.round(focusIndex - focusFraction * (nextSpan - 1));
      return clampWindow(nextStart, nextStart + nextSpan - 1, count);
    });
  };

  const resetZoom = () => {
    setVisibleWindow(null);
  };

  const handleWheel = (event: WheelEvent<SVGSVGElement>) => {
    event.preventDefault();
    const bounds = event.currentTarget.getBoundingClientRect();
    const viewX = ((event.clientX - bounds.left) / bounds.width) * WIDTH;
    const focusFraction = Math.max(0, Math.min(1, (viewX - MARGIN.left) / PLOT_WIDTH));
    zoomChart(event.deltaY < 0 ? 0.78 : 1.28, focusFraction);
  };

  const updateHoverIndex = (event: PointerEvent<SVGSVGElement>) => {
    if (visiblePoints.length === 0) {
      setHoverIndex(null);
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const viewX = ((event.clientX - bounds.left) / bounds.width) * WIDTH;
    const xFraction = Math.max(0, Math.min(1, (viewX - MARGIN.left) / PLOT_WIDTH));
    setHoverIndex(Math.round(xFraction * (visiblePoints.length - 1)));
  };

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (!dragStart) {
      updateHoverIndex(event);
      return;
    }

    const count = points.length;
    const span = dragStart.end - dragStart.start + 1;
    if (count <= span) return;

    const bounds = event.currentTarget.getBoundingClientRect();
    const deltaIndices = Math.round(((event.clientX - dragStart.clientX) / bounds.width) * span);
    const nextStart = dragStart.start - deltaIndices;
    setVisibleWindow(clampWindow(nextStart, nextStart + span - 1, count));
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
          <div className="viewabilityAnalysisTabs" role="tablist" aria-label="Viewability analysis tabs">
            <button
              type="button"
              className={activeTab === "conditions" ? "isSelected" : ""}
              onClick={() => onTabChange("conditions")}
              role="tab"
              aria-selected={activeTab === "conditions"}
            >
              Conditions
            </button>
            <button
              type="button"
              className={activeTab === "source" ? "isSelected" : ""}
              onClick={() => onTabChange("source")}
              disabled={!sourceCellId}
              role="tab"
              aria-selected={activeTab === "source"}
            >
              Source
            </button>
          </div>

          {activeTab === "conditions" && (
            <>
          <div className="viewabilityAnalysisHeader">
            <div>
              <h3>Conditions</h3>
            </div>

            <div className="viewabilityConditionControls" aria-label="Area condition series controls">
              {METRICS.map((metric) => (
                <button
                  key={metric.key}
                  type="button"
                  className={`viewabilityConditionToggle${visibleMetrics[metric.key] ? " isSelected" : ""}`}
                  onClick={() => {
                    setVisibleMetrics((current) => ({ ...current, [metric.key]: !current[metric.key] }));
                  }}
                >
                  <span style={{ backgroundColor: metric.color }} aria-hidden="true" />
                  {metric.label}
                </button>
              ))}
              <label className="viewabilityVarianceToggle">
                <input
                  type="checkbox"
                  checked={showVariance}
                  onChange={(event) => setShowVariance(event.target.checked)}
                />
                Variance
              </label>
              <div className="viewabilityPlotModeToggle" aria-label="Plot layout">
                {(["combine", "stacked"] as PlotMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={plotMode === mode ? "isSelected" : ""}
                    onClick={() => setPlotMode(mode)}
                  >
                    {mode === "combine" ? "Combine" : "Stacked"}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="viewabilityChartIconBtn"
                onClick={() => zoomChart(0.72)}
                aria-label="Zoom in"
                title="Zoom in"
              >
                <span className="material-symbols-rounded" aria-hidden="true">zoom_in</span>
              </button>
              <button
                type="button"
                className="viewabilityChartIconBtn"
                onClick={() => zoomChart(1.36)}
                aria-label="Zoom out"
                title="Zoom out"
              >
                <span className="material-symbols-rounded" aria-hidden="true">zoom_out</span>
              </button>
              <button
                type="button"
                className="viewabilityChartIconBtn"
                onClick={resetZoom}
                disabled={!isZoomed}
                aria-label="Reset zoom"
                title="Reset zoom"
              >
                <span className="material-symbols-rounded" aria-hidden="true">restart_alt</span>
              </button>
            </div>
          </div>

          <div className={`viewabilityAreaChart${plotMode === "stacked" ? " isStacked" : ""}`} aria-label="Weather, daylight, and lunar time series">
            {points.length > 0 ? (
              <svg
                viewBox={`0 0 ${WIDTH} ${chartHeight}`}
                preserveAspectRatio="none"
                role="img"
                onWheel={handleWheel}
                onPointerDown={(event) => {
                  event.currentTarget.setPointerCapture(event.pointerId);
                  setDragStart({ clientX: event.clientX, start: clampedWindow.start, end: clampedWindow.end });
                }}
                onPointerMove={handlePointerMove}
                onPointerUp={(event) => {
                  event.currentTarget.releasePointerCapture(event.pointerId);
                  setDragStart(null);
                  updateHoverIndex(event);
                }}
                onPointerCancel={() => {
                  setDragStart(null);
                  setHoverIndex(null);
                }}
                onPointerLeave={() => {
                  if (!dragStart) setHoverIndex(null);
                }}
                onDoubleClick={resetZoom}
              >
                {plotMode === "combine" ? (
                  <>
                    <line className="viewabilityAreaChart__grid" x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={yForValue(1)} y2={yForValue(1)} />
                    <line className="viewabilityAreaChart__grid" x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={yForValue(0.5)} y2={yForValue(0.5)} />
                    <line className="viewabilityAreaChart__grid" x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={yForValue(0)} y2={yForValue(0)} />
                    <line className="viewabilityAreaChart__axis" x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={HEIGHT - MARGIN.bottom} y2={HEIGHT - MARGIN.bottom} />
                    <line className="viewabilityAreaChart__axis" x1={MARGIN.left} x2={MARGIN.left} y1={MARGIN.top} y2={HEIGHT - MARGIN.bottom} />
                  </>
                ) : (
                  activeMetrics.map((metric, laneIndex) => {
                    const lane = stackedLaneLayout(laneIndex, activeMetrics.length);
                    return (
                      <g key={`${metric.key}-lane`}>
                        <rect
                          className="viewabilityAreaChart__laneBg"
                          x={MARGIN.left}
                          y={lane.top}
                          width={PLOT_WIDTH}
                          height={lane.height}
                        />
                        <line className="viewabilityAreaChart__grid" x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={lane.middle} y2={lane.middle} />
                        <text className="viewabilityAreaChart__laneLabel" x={8} y={lane.middle + 4}>{metric.label}</text>
                      </g>
                    );
                  })
                )}

                {plotMode === "combine" && (
                  <>
                    <text className="viewabilityAreaChart__tick" x={8} y={yForValue(1) + 4}>1.0</text>
                    <text className="viewabilityAreaChart__tick" x={8} y={yForValue(0.5) + 4}>0.5</text>
                    <text className="viewabilityAreaChart__tick" x={8} y={yForValue(0) + 4}>0.0</text>
                  </>
                )}
                {firstDate && <text className="viewabilityAreaChart__tick" x={MARGIN.left} y={chartHeight - 8}>{firstDate.slice(0, 7)}</text>}
                {lastDate && (
                  <text className="viewabilityAreaChart__tick viewabilityAreaChart__tick--end" x={WIDTH - MARGIN.right} y={chartHeight - 8}>
                    {lastDate.slice(0, 7)}
                  </text>
                )}

                {plotMode === "combine" && showVariance && activeMetrics.map((metric, metricIndex) => {
                  const stride = Math.max(1, Math.ceil(visiblePoints.length / 180));
                  const width = boxWidth(visiblePoints.length);
                  const offset = (metricIndex - (activeMetrics.length - 1) / 2) * (width + 1.5);
                  return visiblePoints.map((point, pointIndex) => {
                    if (pointIndex % stride !== 0) return null;
                    const lowValue = numericValue(point, metric.lowKey);
                    const highValue = numericValue(point, metric.highKey);
                    const meanValue = numericValue(point, metric.valueKey);
                    if (lowValue === undefined || highValue === undefined || meanValue === undefined) return null;

                    const x = xForIndex(pointIndex, visiblePoints.length) + offset;
                    const yHigh = yForValue(highValue);
                    const yLow = yForValue(lowValue);
                    const yMean = yForValue(meanValue);
                    return (
                      <g key={`${metric.key}-box-${point.date}`}>
                        <rect
                          className="viewabilityAreaChart__box"
                          x={x - width / 2}
                          y={Math.min(yHigh, yLow)}
                          width={width}
                          height={Math.max(1, Math.abs(yLow - yHigh))}
                          fill={metric.color}
                          stroke={metric.color}
                        />
                        <line
                          className="viewabilityAreaChart__boxMean"
                          x1={x - width / 2}
                          x2={x + width / 2}
                          y1={yMean}
                          y2={yMean}
                          stroke={metric.color}
                        />
                      </g>
                    );
                  });
                })}

                {plotMode === "stacked" && showVariance && activeMetrics.map((metric, laneIndex) => {
                  const path = stackedBandPath(visiblePoints, metric, laneIndex, activeMetrics.length);
                  return path ? (
                    <path key={`${metric.key}-stacked-band`} d={path} fill={metric.color} className="viewabilityAreaChart__stackedBand" />
                  ) : null;
                })}

                {plotMode === "combine" && activeMetrics.map((metric) => {
                  const path = linePath(visiblePoints, metric);
                  return path ? (
                    <path key={metric.key} d={path} fill="none" stroke={metric.color} className="viewabilityAreaChart__line" />
                  ) : null;
                })}

                {plotMode === "stacked" && activeMetrics.map((metric, laneIndex) => {
                  const path = stackedLinePath(visiblePoints, metric, laneIndex, activeMetrics.length);
                  return path ? (
                    <path key={`${metric.key}-stacked-line`} d={path} fill="none" stroke={metric.color} className="viewabilityAreaChart__line" />
                  ) : null;
                })}

                {scoreType === "dynamic" && selectedVisibleIndex >= 0 && (
                  <line
                    className="viewabilityAreaChart__cursor"
                    x1={xForIndex(selectedVisibleIndex, visiblePoints.length)}
                    x2={xForIndex(selectedVisibleIndex, visiblePoints.length)}
                    y1={MARGIN.top}
                    y2={chartHeight - MARGIN.bottom}
                  />
                )}
              </svg>
            ) : (
              <div className="viewabilityAreaChart__empty">Area condition data unavailable.</div>
            )}
            {hoverPoint && (
              <div
                className="viewabilityAreaTooltip"
                style={{ left: `${(xForIndex(hoverIndex ?? 0, visiblePoints.length) / WIDTH) * 100}%` }}
              >
                <div className="viewabilityAreaTooltip__date">{hoverPoint.date}</div>
                <div className="viewabilityAreaTooltip__metrics">
                  {activeMetrics.map((metric) => {
                    const mean = numericValue(hoverPoint, metric.valueKey);
                    const low = numericValue(hoverPoint, metric.lowKey);
                    const high = numericValue(hoverPoint, metric.highKey);
                    return (
                      <div className="viewabilityAreaTooltip__metric" key={metric.key}>
                        <span className="viewabilityAreaTooltip__swatch" style={{ backgroundColor: metric.color }} />
                        <span>{metric.label}</span>
                        <strong>Mean {formatMetricValue(mean)}</strong>
                        <em>
                          Variance {low === undefined || high === undefined
                            ? "n/a"
                            : `${formatMetricValue(low)}-${formatMetricValue(high)}`}
                        </em>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
            </>
          )}

          {activeTab === "source" && (
            <div className="viewabilitySourceAnalysis">
              <div className="viewabilityAnalysisHeader">
                <div>
                  <h3>Source Time Series</h3>
                  <p>{sourceCellId ?? "No source selected"}</p>
                </div>
                <div className="viewabilitySourceAnalysis__summary">
                  <span>{sourceTimeSeries.length} days</span>
                  <strong>{latestSourceValue === undefined ? "-" : latestSourceValue.toFixed(3)}</strong>
                </div>
              </div>

              {sourceTimeSeries.length > 0 ? (
                <div className="viewabilitySourceDrawerChart" aria-label="Selected source viewable target score over time">
                  <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" role="img">
                    <line className="viewabilitySourceDrawerChart__grid" x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={sourceYForValue(sourceMax, sourceMax)} y2={sourceYForValue(sourceMax, sourceMax)} />
                    <line className="viewabilitySourceDrawerChart__grid" x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={sourceYForValue(sourceMax / 2, sourceMax)} y2={sourceYForValue(sourceMax / 2, sourceMax)} />
                    <line className="viewabilitySourceDrawerChart__grid" x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={sourceYForValue(0, sourceMax)} y2={sourceYForValue(0, sourceMax)} />
                    <line className="viewabilitySourceDrawerChart__axis" x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={HEIGHT - MARGIN.bottom} y2={HEIGHT - MARGIN.bottom} />
                    <line className="viewabilitySourceDrawerChart__axis" x1={MARGIN.left} x2={MARGIN.left} y1={MARGIN.top} y2={HEIGHT - MARGIN.bottom} />
                    <text className="viewabilitySourceDrawerChart__tick" x={8} y={sourceYForValue(sourceMax, sourceMax) + 4}>{sourceMax.toFixed(2)}</text>
                    <text className="viewabilitySourceDrawerChart__tick" x={8} y={sourceYForValue(0, sourceMax) + 4}>0</text>
                    <text className="viewabilitySourceDrawerChart__tick" x={MARGIN.left} y={HEIGHT - 8}>{periodLabel(sourceTimeSeries[0]?.period)}</text>
                    <text className="viewabilitySourceDrawerChart__tick viewabilitySourceDrawerChart__tick--end" x={WIDTH - MARGIN.right} y={HEIGHT - 8}>
                      {periodLabel(latestSourcePoint?.period)}
                    </text>
                    {sourcePath && <path className="viewabilitySourceDrawerChart__line" d={sourcePath} fill="none" />}
                  </svg>
                </div>
              ) : (
                <div className="viewabilityEmptyState">Select a source cell to view its time series.</div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
