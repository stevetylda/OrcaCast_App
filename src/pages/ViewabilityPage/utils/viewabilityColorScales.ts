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

export function resolveViewabilityColor(settings: ViewabilityColorScaleSettings, value: number): string {
  const palette = getViewabilityPaletteOrDefault(settings.paletteId);
  const colors = settings.reversePalette ? [...palette.colors].reverse() : palette.colors;
  const clamped = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));

  for (let index = 0; index < GLOBAL_VIEWABILITY_STOPS.length - 1; index += 1) {
    const start = GLOBAL_VIEWABILITY_STOPS[index];
    const end = GLOBAL_VIEWABILITY_STOPS[index + 1];
    if (clamped <= end) {
      const t = end <= start ? 0 : (clamped - start) / (end - start);
      return mixHexColors(colors[index] ?? "#ffffff", colors[index + 1] ?? colors[index] ?? "#ffffff", t);
    }
  }

  return colors.at(-1) ?? "#ffffff";
}

function mixHexColors(a: string, b: string, t: number): string {
  const colorA = parseColorToRgb(a);
  const colorB = parseColorToRgb(b);
  const mix = (start: number, end: number) => Math.round(start + (end - start) * Math.max(0, Math.min(1, t)));
  return `rgb(${mix(colorA.r, colorB.r)}, ${mix(colorA.g, colorB.g)}, ${mix(colorA.b, colorB.b)})`;
}

function parseColorToRgb(color: string): { r: number; g: number; b: number } {
  if (color.startsWith("#")) {
    const hex = color.slice(1);
    const normalized = hex.length === 3
      ? hex.split("").map((char) => `${char}${char}`).join("")
      : hex.slice(0, 6);
    return {
      r: Number.parseInt(normalized.slice(0, 2), 16),
      g: Number.parseInt(normalized.slice(2, 4), 16),
      b: Number.parseInt(normalized.slice(4, 6), 16),
    };
  }
  const match = color.match(/rgba?\(([^)]+)\)/);
  if (match) {
    const [r = 255, g = 255, b = 255] = match[1].split(",").map((value) => Number.parseFloat(value.trim()));
    return { r, g, b };
  }
  return { r: 255, g: 255, b: 255 };
}

export function formatScore(value?: number): string {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(2) : "-";
}
