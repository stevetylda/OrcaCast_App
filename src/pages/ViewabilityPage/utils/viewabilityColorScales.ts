import { getViewabilityPaletteOrDefault } from "../../../constants/palettes";
import type { ViewabilityColorScaleSettings, ViewabilityScoreType } from "../../../data/viewabilityTypes";

const GLOBAL_VIEWABILITY_STOPS = [0, 0.005, 0.015, 0.04, 0.1, 0.2, 0.45, 1] as const;

export function getViewabilityScoreProperty(scoreType: ViewabilityScoreType): string {
  switch (scoreType) {
    case "base":
      return "base_viewability_score";
    case "dynamic":
      return "dynamic_viewability_score";
  }
}

export function buildViewabilityColorExpression(settings: ViewabilityColorScaleSettings, propertyName: string): unknown[] {
  const palette = getViewabilityPaletteOrDefault(settings.paletteId);
  const colors = settings.reversePalette ? [...palette.colors].reverse() : palette.colors;
  const scoreExpression = ["min", 1, ["max", 0, ["coalesce", ["to-number", ["get", propertyName]], 0]]];
  return [
    "interpolate",
    ["linear"],
    scoreExpression,
    ...GLOBAL_VIEWABILITY_STOPS.flatMap((stop, index) => [stop, colors[index]]),
  ];
}

export function formatScore(value?: number): string {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(2) : "-";
}
