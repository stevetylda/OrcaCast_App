import {
  sourceCellConditionsFixture,
  sourceCellTimeSeriesFixture,
  sourceTargetVisibilityFixture,
  viewabilitySightingsBinsFixture,
  viewabilitySourceCellsFixture,
  viewabilityTargetCellsFixture,
} from "./fixtures/viewabilityFixtures";
import type {
  SourceCellConditions,
  SourceCellTimeSeriesPoint,
  SourceTargetVisibilityRecord,
  ViewabilitySightingsBin,
  ViewabilitySourceFeatureCollection,
  ViewabilityTargetFeatureCollection,
} from "./viewabilityTypes";

export async function loadViewabilityTargetCells(): Promise<ViewabilityTargetFeatureCollection> {
  // TODO: Replace fixture loader with generated viewability parquet/geojson export from viewshed repo.
  return viewabilityTargetCellsFixture;
}

export async function loadViewabilitySourceCells(): Promise<ViewabilitySourceFeatureCollection> {
  // TODO: Replace fixture loader with generated source-cell export from viewshed repo.
  return viewabilitySourceCellsFixture;
}

export async function loadSourceTargetVisibility(sourceCellId?: string): Promise<SourceTargetVisibilityRecord[]> {
  // TODO: Replace fixture loader with source-target visibility matrix export.
  return sourceCellId
    ? sourceTargetVisibilityFixture.filter((record) => record.source_h3 === sourceCellId)
    : sourceTargetVisibilityFixture;
}

export async function loadSourceCellConditions(sourceCellId?: string): Promise<SourceCellConditions | null> {
  // TODO: Replace fixture loader with weather/daylight/lunar context keyed by source and period.
  if (!sourceCellId) return null;
  return sourceCellConditionsFixture.find((conditions) => conditions.source_h3 === sourceCellId) ?? null;
}

export async function loadSourceCellTimeSeries(sourceCellId?: string): Promise<SourceCellTimeSeriesPoint[]> {
  // TODO: Replace fixture loader with historical viewability and sightings time-series export.
  return sourceCellId ? sourceCellTimeSeriesFixture : [];
}

export async function loadViewabilitySightingsBins(): Promise<ViewabilitySightingsBin[]> {
  // TODO: Replace fixture loader with binned sightings-vs-viewability analysis output.
  return viewabilitySightingsBinsFixture;
}
