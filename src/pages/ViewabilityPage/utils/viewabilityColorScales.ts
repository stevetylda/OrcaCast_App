import { getPaletteOrDefault } from "../../../constants/palettes";
import type { PaletteId } from "../../../constants/palettes";
import type { ViewabilityColorScaleSettings, ViewabilityScoreType } from "../../../data/viewabilityTypes";

export function getViewabilityScoreProperty(scoreType: ViewabilityScoreType): string {
  switch (scoreType) {
    case "base":
      return "base_viewability_score";
    case "dynamic":
      return "dynamic_viewability_score";
  }
}

export function buildViewabilityColorExpression(settings: ViewabilityColorScaleSettings, propertyName: string): unknown[] {
  const palette = getPaletteOrDefault(settings.paletteId as PaletteId);
  const colors = settings.reversePalette ? [...palette.colors].reverse() : palette.colors;
  return [
    "interpolate",
    ["linear"],
    ["coalesce", ["to-number", ["get", propertyName]], 0],
    0,
    colors[0],
    0.2,
    colors[1],
    0.4,
    colors[2],
    0.6,
    colors[4],
    0.8,
    colors[6],
    1,
    colors[7],
  ];
}

export function formatScore(value?: number): string {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(2) : "-";
}
