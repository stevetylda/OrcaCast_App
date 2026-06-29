import { useMemo, useState } from "react";
import type { CSSProperties, PointerEvent, WheelEvent } from "react";
import type { SourceCellTimeSeriesPoint } from "../../../data/viewabilityTypes";
import {
  clampWindow,
  HEIGHT,
  MARGIN,
  MIN_VISIBLE_DAYS,
  PLOT_WIDTH,
  WIDTH,
  type NumericDomain,
  periodLabel,
  sourceYForValue,
  xForIndex,
} from "../utils/chartScales";

export type SourceChartMode = "raw" | "seasonal_anomaly";

export type SourceChartPoint = SourceCellTimeSeriesPoint & {
  chartValue?: number;
  rawValue?: number;
  seasonalMean?: number;
};

export type SourceChartSeries = {
  sourceId: string;
  color: string;
  points: SourceChartPoint[];
};

type Props = {
  sourceCellId: string | null;
  sourceCellIds: string[];
  sourceSelectionLabel?: string;
  selectedSourceSeries: SourceChartSeries[];
  sourceChartMode: SourceChartMode;
  onSourceChartModeChange: (mode: SourceChartMode) => void;
  hoveredSourceCellId: string | null;
  onHoverSourceCell: (sourceCellId: string | null) => void;
};

function sourceLinePath(points: SourceChartPoint[], domain: NumericDomain): string {
  return points.reduce((path, point, index) => {
    const value = point.chartValue;
    if (!Number.isFinite(value)) return path;
    const command = path.length === 0 ? "M" : "L";
    return `${path}${command}${xForIndex(index, points.length).toFixed(2)},${sourceYForValue(value as number, domain).toFixed(2)}`;
  }, "");
}

function sourceScoreValue(point: SourceCellTimeSeriesPoint): number | undefined {
  return typeof point.dynamic_viewability === "number" && Number.isFinite(point.dynamic_viewability)
    ? point.dynamic_viewability
    : undefined;
}

export function ViewabilitySourceSeriesChart({
  sourceCellId,
  sourceCellIds,
  sourceSelectionLabel,
  selectedSourceSeries,
  sourceChartMode,
  onSourceChartModeChange,
  hoveredSourceCellId,
  onHoverSourceCell,
}: Props) {
  const [sourceVisibleWindow, setSourceVisibleWindow] = useState<{ start: number; end: number } | null>(null);
  const [sourceDragStart, setSourceDragStart] = useState<{ clientX: number; start: number; end: number } | null>(null);

  const maxSourceSeriesLength = Math.max(0, ...selectedSourceSeries.map((series) => series.points.length));
  const sourceClampedWindow = sourceVisibleWindow
    ? clampWindow(sourceVisibleWindow.start, sourceVisibleWindow.end, maxSourceSeriesLength)
    : { start: 0, end: Math.max(0, maxSourceSeriesLength - 1) };
  const visibleSourceSeries = selectedSourceSeries.map((series) => ({
    ...series,
    points: series.points.slice(sourceClampedWindow.start, sourceClampedWindow.end + 1),
  }));
  const sourceValues = visibleSourceSeries.flatMap((series) =>
    series.points
      .map((point) => point.chartValue)
      .filter((value): value is number => Number.isFinite(value))
  );

  const rawSourceMax = Math.max(...sourceValues, 0);
  const rawSourceAbsMax = Math.max(...sourceValues.map((value) => Math.abs(value)), 0);
  const sourceYDomain: NumericDomain =
    sourceChartMode === "seasonal_anomaly"
      ? {
          min: -Math.max(0.02, rawSourceAbsMax * 1.18),
          max: Math.max(0.02, rawSourceAbsMax * 1.18),
        }
      : {
          min: 0,
          max:
            rawSourceMax <= 0
              ? 1
              : Math.min(1, Math.max(0.05, rawSourceMax * 1.18)),
        };
  const sourceMiddleValue =
    sourceChartMode === "seasonal_anomaly"
      ? 0
      : sourceYDomain.max / 2;
  const latestSourceSeries = sourceCellId ? selectedSourceSeries.find((series) => series.sourceId === sourceCellId)?.points ?? [] : [];
  const latestSourcePoint = latestSourceSeries.at(-1);
  const latestSourceValue = latestSourcePoint ? sourceScoreValue(latestSourcePoint) : undefined;
  const firstVisibleSourcePoint = visibleSourceSeries.find((series) => series.points.length > 0)?.points[0];
  const lastVisibleSourcePoint = [...visibleSourceSeries].reverse().find((series) => series.points.length > 0)?.points.at(-1);
  const isSourceZoomed = maxSourceSeriesLength > 0 && (sourceClampedWindow.start > 0 || sourceClampedWindow.end < maxSourceSeriesLength - 1);
  const legendItems = useMemo(
    () => selectedSourceSeries.map((series) => ({ sourceId: series.sourceId, color: series.color })),
    [selectedSourceSeries]
  );

  const zoomSourceChart = (factor: number, focusFraction = 0.5) => {
    setSourceVisibleWindow((current) => {
      const count = maxSourceSeriesLength;
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

  const resetSourceZoom = () => {
    setSourceVisibleWindow(null);
  };

  const handleSourceWheel = (event: WheelEvent<SVGSVGElement>) => {
    event.preventDefault();
    const bounds = event.currentTarget.getBoundingClientRect();
    const viewX = ((event.clientX - bounds.left) / bounds.width) * WIDTH;
    const focusFraction = Math.max(0, Math.min(1, (viewX - MARGIN.left) / PLOT_WIDTH));
    zoomSourceChart(event.deltaY < 0 ? 0.78 : 1.28, focusFraction);
  };

  const handleSourcePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (!sourceDragStart) return;

    const count = maxSourceSeriesLength;
    const span = sourceDragStart.end - sourceDragStart.start + 1;
    if (count <= span) return;

    const bounds = event.currentTarget.getBoundingClientRect();
    const deltaIndices = Math.round(((event.clientX - sourceDragStart.clientX) / bounds.width) * span);
    const nextStart = sourceDragStart.start - deltaIndices;
    setSourceVisibleWindow(clampWindow(nextStart, nextStart + span - 1, count));
  };

  return (
    <div className="viewabilitySourceAnalysis">
      <div className="viewabilityAnalysisHeader">
        <div>
          <h3>Source Time Series</h3>
          <p>
            {sourceSelectionLabel ?? (sourceCellIds.length === 0
              ? "No source selected"
              : `${sourceCellIds.length} selected${sourceCellId ? ` · primary ${sourceCellId}` : ""}`)}
          </p>
        </div>
        <div className="viewabilitySourceAnalysis__summary">
          <span>{maxSourceSeriesLength} days</span>
          <strong>{latestSourceValue === undefined ? "-" : latestSourceValue.toFixed(3)}</strong>
        </div>
      </div>

      {maxSourceSeriesLength > 0 ? (
        <>
          <div className="viewabilityConditionControls viewabilitySourceChartControls" aria-label="Source chart controls">
            <div className="viewabilitySourceDrawerChart__modeToggle" role="group" aria-label="Source chart mode">
              <button
                type="button"
                className={`viewabilitySourceDrawerChart__modeButton${sourceChartMode === "raw" ? " isActive" : ""}`}
                onClick={() => onSourceChartModeChange("raw")}
              >
                Raw
              </button>
              <button
                type="button"
                className={`viewabilitySourceDrawerChart__modeButton${sourceChartMode === "seasonal_anomaly" ? " isActive" : ""}`}
                onClick={() => onSourceChartModeChange("seasonal_anomaly")}
                title="Compare each day to the typical value for that day of year."
              >
                Seasonal anomaly
              </button>
            </div>
            <button
              type="button"
              className="viewabilityChartIconBtn"
              onClick={() => zoomSourceChart(0.72)}
              aria-label="Zoom source chart in"
              title="Zoom in"
            >
              <span className="material-symbols-rounded" aria-hidden="true">zoom_in</span>
            </button>
            <button
              type="button"
              className="viewabilityChartIconBtn"
              onClick={() => zoomSourceChart(1.36)}
              aria-label="Zoom source chart out"
              title="Zoom out"
            >
              <span className="material-symbols-rounded" aria-hidden="true">zoom_out</span>
            </button>
            <button
              type="button"
              className="viewabilityChartIconBtn"
              onClick={resetSourceZoom}
              disabled={!isSourceZoomed}
              aria-label="Reset source chart zoom"
              title="Reset zoom"
            >
              <span className="material-symbols-rounded" aria-hidden="true">restart_alt</span>
            </button>
          </div>

          <div className="viewabilitySourceDrawerChart" aria-label="Selected source viewable target score over time">
            <svg
              viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
              preserveAspectRatio="none"
              role="img"
              onWheel={handleSourceWheel}
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                setSourceDragStart({ clientX: event.clientX, start: sourceClampedWindow.start, end: sourceClampedWindow.end });
              }}
              onPointerMove={handleSourcePointerMove}
              onPointerUp={(event) => {
                event.currentTarget.releasePointerCapture(event.pointerId);
                setSourceDragStart(null);
              }}
              onPointerCancel={() => {
                setSourceDragStart(null);
                onHoverSourceCell(null);
              }}
              onPointerLeave={() => {
                if (!sourceDragStart) onHoverSourceCell(null);
              }}
              onDoubleClick={resetSourceZoom}
            >
              <line className="viewabilitySourceDrawerChart__grid" x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={sourceYForValue(sourceYDomain.max, sourceYDomain)} y2={sourceYForValue(sourceYDomain.max, sourceYDomain)} />
              <line className="viewabilitySourceDrawerChart__grid" x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={sourceYForValue(sourceMiddleValue, sourceYDomain)} y2={sourceYForValue(sourceMiddleValue, sourceYDomain)} />
              <line className="viewabilitySourceDrawerChart__grid" x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={sourceYForValue(sourceYDomain.min, sourceYDomain)} y2={sourceYForValue(sourceYDomain.min, sourceYDomain)} />
              {sourceChartMode === "seasonal_anomaly" && (
                <line className="viewabilitySourceDrawerChart__zeroLine" x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={sourceYForValue(0, sourceYDomain)} y2={sourceYForValue(0, sourceYDomain)} />
              )}
              <line className="viewabilitySourceDrawerChart__axis" x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={HEIGHT - MARGIN.bottom} y2={HEIGHT - MARGIN.bottom} />
              <line className="viewabilitySourceDrawerChart__axis" x1={MARGIN.left} x2={MARGIN.left} y1={MARGIN.top} y2={HEIGHT - MARGIN.bottom} />
              <text className="viewabilitySourceDrawerChart__tick" x={8} y={sourceYForValue(sourceYDomain.max, sourceYDomain) + 4}>
                {sourceYDomain.max.toFixed(2)}
              </text>
              <text className="viewabilitySourceDrawerChart__tick" x={8} y={sourceYForValue(sourceMiddleValue, sourceYDomain) + 4}>
                {sourceMiddleValue.toFixed(2)}
              </text>
              <text className="viewabilitySourceDrawerChart__tick" x={8} y={sourceYForValue(sourceYDomain.min, sourceYDomain) + 4}>
                {sourceYDomain.min.toFixed(2)}
              </text>
              <text className="viewabilitySourceDrawerChart__tick" x={MARGIN.left} y={HEIGHT - 8}>{periodLabel(firstVisibleSourcePoint?.period)}</text>
              <text className="viewabilitySourceDrawerChart__tick viewabilitySourceDrawerChart__tick--end" x={WIDTH - MARGIN.right} y={HEIGHT - 8}>
                {periodLabel(lastVisibleSourcePoint?.period)}
              </text>

              {visibleSourceSeries.map((series) => {
                const path = sourceLinePath(series.points, sourceYDomain);
                if (!path) return null;
                const isHovered = hoveredSourceCellId === series.sourceId;
                return (
                  <g
                    key={series.sourceId}
                    style={{ "--source-line-color": series.color } as CSSProperties}
                  >
                    <path
                      className="viewabilitySourceDrawerChart__hitLine"
                      d={path}
                      fill="none"
                      onPointerEnter={() => onHoverSourceCell(series.sourceId)}
                      onPointerLeave={() => onHoverSourceCell(null)}
                    />
                    <path
                      className={`viewabilitySourceDrawerChart__line${isHovered ? " isHovered" : ""}`}
                      d={path}
                      fill="none"
                    />
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="viewabilitySourceDrawerLegend" aria-label="Selected source cells">
            {legendItems.map((series) => (
              <button
                key={series.sourceId}
                type="button"
                className={`viewabilitySourceDrawerLegend__item${hoveredSourceCellId === series.sourceId ? " isHovered" : ""}`}
                onPointerEnter={() => onHoverSourceCell(series.sourceId)}
                onPointerLeave={() => onHoverSourceCell(null)}
              >
                <span style={{ backgroundColor: series.color }} aria-hidden="true" />
                {series.sourceId}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="viewabilityEmptyState">Select a source cell to view its time series.</div>
      )}
    </div>
  );
}
