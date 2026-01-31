export type ForecastPeriodConfig =
  | { mode: "single"; date: string }
  | { mode: "range"; start: string; end: string };

export const appConfig: { forecastPeriod: ForecastPeriodConfig } = {
  forecastPeriod: {
    mode: "range",
    start: "2026-01-19",
    end: "2026-01-25",
  },
};

export function formatForecastPeriod(period: ForecastPeriodConfig): string {
  if (period.mode === "single") return period.date;
  return `${period.start} → ${period.end}`;
}
