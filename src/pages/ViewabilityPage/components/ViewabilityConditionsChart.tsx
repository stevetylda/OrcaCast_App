import { useMemo, useState } from "react";
import type { PointerEvent, WheelEvent } from "react";
import type { ViewabilityAreaConditionPoint, ViewabilityScoreType } from "../../../data/viewabilityTypes";
import {
  boxWidth,
  clampWindow,
  HEIGHT,
  MARGIN,
  MIN_VISIBLE_DAYS,
  PLOT_WIDTH,
  STACKED_HEIGHT,
  WIDTH,
  xForIndex,
  yForNormalizedValue,
} from "../utils/chartScales";

type Metric = "weather" | "daylight" | "lunar";
type PlotMode = "combine" | "stacked";

type Props = {
  points: ViewabilityAreaConditionPoint[];
  selectedDate: string;
  scoreType: ViewabilityScoreType;
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

function numericValue(point: ViewabilityAreaConditionPoint, key: keyof ViewabilityAreaConditionPoint): number | undefined {
  const value = point[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
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
    return `${path}${command}${xForIndex(index, points.length).toFixed(2)},${yForNormalizedValue(value).toFixed(2)}`;
  }, "");
}

function formatMetricValue(value: number | undefined): string {
  return value === undefined ? "n/a" : value.toFixed(3);
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

export function ViewabilityConditionsChart({ points, selectedDate, scoreType }: Props) {
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
  const activeMetrics = useMemo(
    () => METRICS.filter((metric) => visibleMetrics[metric.key]),
    [visibleMetrics]
  );
  const chartHeight = plotMode === "stacked" ? STACKED_HEIGHT : HEIGHT;

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
                <line className="viewabilityAreaChart__grid" x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={yForNormalizedValue(1)} y2={yForNormalizedValue(1)} />
                <line className="viewabilityAreaChart__grid" x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={yForNormalizedValue(0.5)} y2={yForNormalizedValue(0.5)} />
                <line className="viewabilityAreaChart__grid" x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={yForNormalizedValue(0)} y2={yForNormalizedValue(0)} />
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
                <text className="viewabilityAreaChart__tick" x={8} y={yForNormalizedValue(1) + 4}>1.0</text>
                <text className="viewabilityAreaChart__tick" x={8} y={yForNormalizedValue(0.5) + 4}>0.5</text>
                <text className="viewabilityAreaChart__tick" x={8} y={yForNormalizedValue(0) + 4}>0.0</text>
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
                const yHigh = yForNormalizedValue(highValue);
                const yLow = yForNormalizedValue(lowValue);
                const yMean = yForNormalizedValue(meanValue);
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
  );
}
