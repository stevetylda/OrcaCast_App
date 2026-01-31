export type H3Resolution = "H4" | "H5" | "H6";

function withBase(path: string): string {
  const base = import.meta.env.BASE_URL || "/";
  const trimmed = path.startsWith("/") ? path.slice(1) : path;
  return `${base}${trimmed}`;
}

export const GRID_PATH: Record<H3Resolution, string> = {
  H4: withBase("data/grids/H4.geojson"),
  H5: withBase("data/grids/H5.geojson"),
  H6: withBase("data/grids/H6.geojson"),
};

export const FORECAST_PATH_LATEST_WEEKLY: Record<H3Resolution, string> = {
  H4: withBase("data/forecasts/latest/weekly/H4.json"),
  H5: withBase("data/forecasts/latest/weekly/H5.json"),
  H6: withBase("data/forecasts/latest/weekly/H6.json"),
};

export function getForecastPath(
  resolution: H3Resolution,
  opts: { kind?: "latest" | "explicit"; explicitPath?: string } = {}
): string {
  if (opts.kind === "explicit" && opts.explicitPath) return opts.explicitPath;
  return FORECAST_PATH_LATEST_WEEKLY[resolution];
}
