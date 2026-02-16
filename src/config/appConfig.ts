export type ForecastPeriodConfig =
  | { mode: "single"; date: string }
  | { mode: "range"; start: string; end: string };

export const appConfig: {
  forecastPeriod: ForecastPeriodConfig;
  kdeBandsRunId: string;
  kdeBandsFolder: string;
  kdeBandsAreaMinKm2: number;
  kdeBandsHoleMinKm2: number;
  bestModelId: string;
} = {
  forecastPeriod: {
    mode: "range",
    start: "2026-02-16",
    end: "2026-02-22",
  },
  kdeBandsRunId: "latest",
  kdeBandsFolder: "forecasts/latest/weekly_blurred",
  kdeBandsAreaMinKm2: 2.0,
  kdeBandsHoleMinKm2: 1.0,
  bestModelId: "best",
};

export function formatForecastPeriod(period: ForecastPeriodConfig): string {
  if (period.mode === "single") return period.date;
  return `${period.start} → ${period.end}`;
}
