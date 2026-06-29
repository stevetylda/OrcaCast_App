import { useMemo, useState } from "react";
import type { SourceCellTimeSeriesPoint, ViewabilityAreaConditionPoint, ViewabilityScoreType } from "../../../data/viewabilityTypes";
import type { ViewabilityAnalysisTab } from "../useViewabilityPageController";
import { ViewabilityAnalysisTabs } from "./ViewabilityAnalysisTabs";
import { ViewabilityConditionsChart } from "./ViewabilityConditionsChart";
import {
  type SourceChartMode,
  type SourceChartSeries,
  ViewabilitySourceSeriesChart,
} from "./ViewabilitySourceSeriesChart";
import { buildSeasonalMeanByDoy, dayOfYear } from "../utils/seasonalAnomaly";

type Props = {
  open: boolean;
  onToggleOpen: () => void;
  activeTab: ViewabilityAnalysisTab;
  onTabChange: (tab: ViewabilityAnalysisTab) => void;
  points: ViewabilityAreaConditionPoint[];
  selectedDate: string;
  scoreType: ViewabilityScoreType;
  sourceCellId: string | null;
  sourceCellIds: string[];
  sourceTimeSeriesBySource: Record<string, SourceCellTimeSeriesPoint[]>;
  sourceSelectionLabel?: string;
  hoveredSourceCellId: string | null;
  onHoverSourceCell: (sourceCellId: string | null) => void;
};

function sourceScoreValue(point: SourceCellTimeSeriesPoint): number | undefined {
  return typeof point.dynamic_viewability === "number" && Number.isFinite(point.dynamic_viewability)
    ? point.dynamic_viewability
    : undefined;
}

function sourcePointDate(point: SourceCellTimeSeriesPoint): string | undefined {
  return point.period ?? (point as { date?: string }).date;
}

function sourceLineColor(index: number): string {
  const hue = (178 + index * 47) % 360;
  return `hsl(${hue} 86% 52%)`;
}

function buildSelectedSourceSeries(
  sourceCellIds: string[],
  sourceTimeSeriesBySource: Record<string, SourceCellTimeSeriesPoint[]>,
  sourceChartMode: SourceChartMode,
): SourceChartSeries[] {
  return sourceCellIds.map((sourceId, index) => {
    const rawPoints = sourceTimeSeriesBySource[sourceId] ?? [];
    const seasonalMeanByDoy = buildSeasonalMeanByDoy(
      rawPoints,
      sourcePointDate,
      sourceScoreValue,
    );

    const points = rawPoints.map((point) => {
      const rawValue = sourceScoreValue(point);
      const date = sourcePointDate(point);
      const seasonalMean = date ? seasonalMeanByDoy.get(dayOfYear(date)) : undefined;
      const chartValue =
        sourceChartMode === "seasonal_anomaly" &&
        Number.isFinite(rawValue) &&
        Number.isFinite(seasonalMean)
          ? (rawValue as number) - (seasonalMean as number)
          : rawValue;

      return {
        ...point,
        chartValue,
        rawValue,
        seasonalMean,
      };
    });

    return {
      sourceId,
      color: sourceLineColor(index),
      points,
    };
  });
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
  sourceCellIds,
  sourceTimeSeriesBySource,
  sourceSelectionLabel,
  hoveredSourceCellId,
  onHoverSourceCell,
}: Props) {
  const [sourceChartMode, setSourceChartMode] = useState<SourceChartMode>("raw");

  const selectedSourceSeries = useMemo(
    () => buildSelectedSourceSeries(sourceCellIds, sourceTimeSeriesBySource, sourceChartMode),
    [sourceCellIds, sourceTimeSeriesBySource, sourceChartMode]
  );

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
          <ViewabilityAnalysisTabs
            activeTab={activeTab}
            onTabChange={onTabChange}
            sourceDisabled={sourceCellIds.length === 0}
          />

          {activeTab === "conditions" && (
            <ViewabilityConditionsChart
              points={points}
              selectedDate={selectedDate}
              scoreType={scoreType}
            />
          )}

          {activeTab === "source" && (
            <ViewabilitySourceSeriesChart
              sourceCellId={sourceCellId}
              sourceCellIds={sourceCellIds}
              sourceSelectionLabel={sourceSelectionLabel}
              selectedSourceSeries={selectedSourceSeries}
              sourceChartMode={sourceChartMode}
              onSourceChartModeChange={setSourceChartMode}
              hoveredSourceCellId={hoveredSourceCellId}
              onHoverSourceCell={onHoverSourceCell}
            />
          )}
        </div>
      )}
    </section>
  );
}
