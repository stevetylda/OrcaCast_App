import { useEffect, useMemo, useRef, useState } from "react";

type Trend = "up" | "down" | "steady" | "none";

type Props = {
  currentCount: number | null;
  vsPriorWeek: number | null;
  vs12WeekAvg: number | null;
  trend: Trend;
  chart: {
    values: number[];
    forecastIndex: number;
    ciLow?: number;
    ciHigh?: number;
  };
};

type Point = { x: number; y: number; value: number; isForecast: boolean };

function formatCount(value: number | null): string {
  if (!Number.isFinite(value ?? NaN)) return "--";
  return Math.round(value as number).toLocaleString();
}

function formatVs12WeekAvg(current: number | null, vs12WeekAvg: number | null): string {
  if (!Number.isFinite(current ?? NaN) || !Number.isFinite(vs12WeekAvg ?? NaN)) {
    return "12w avg: -- · Δ: --";
  }
  const avg = Math.round(vs12WeekAvg as number);
  const delta = Math.round((current as number) - (vs12WeekAvg as number));
  return `12w avg: ${avg.toLocaleString()} · Δ: ${delta > 0 ? "+" : ""}${delta.toLocaleString()}`;
}

function formatVsPriorWeek(current: number | null, vsPriorWeek: number | null): string {
  if (!Number.isFinite(current ?? NaN) || !Number.isFinite(vsPriorWeek ?? NaN)) {
    return "vs prior week: --";
  }
  const delta = Math.round((current as number) - (vsPriorWeek as number));
  return `vs prior week: ${delta > 0 ? "+" : ""}${delta.toLocaleString()}`;
}

function trendIcon(trend: Trend): string {
  if (trend === "up") return "arrow_upward";
  if (trend === "down") return "arrow_downward";
  if (trend === "steady") return "trending_flat";
  return "remove";
}

function computePoints(values: number[], forecastIndex: number) {
  const width = 238;
  const height = 96;
  const padLeft = 32;
  const padRight = 10;
  const padTop = 8;
  const padBottom = 14;
  const chartWidth = width - padLeft - padRight;
  const chartHeight = height - padTop - padBottom;

  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const range = Math.max(1, maxV - minV);

  const points: Point[] = values.map((value, idx) => {
    const x = padLeft + (values.length <= 1 ? 0 : (idx / (values.length - 1)) * chartWidth);
    const y = padTop + ((maxV - value) / range) * chartHeight;
    return { x, y, value, isForecast: idx === forecastIndex };
  });

  return {
    width,
    height,
    padLeft,
    padTop,
    chartHeight,
    minV,
    maxV,
    midV: Math.round((minV + maxV) / 2),
    points,
  };
}

export function ExpectedActivityPill({
  currentCount,
  vsPriorWeek,
  vs12WeekAvg,
  trend,
  chart,
}: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const disabled = currentCount === null;

  const trendClass = useMemo(() => {
    if (trend === "up") return "expectedPill__trend expectedPill__trend--up";
    if (trend === "down") return "expectedPill__trend expectedPill__trend--down";
    if (trend === "steady") return "expectedPill__trend expectedPill__trend--steady";
    return "expectedPill__trend expectedPill__trend--none";
  }, [trend]);

  const chartModel = useMemo(() => {
    const values = chart.values.filter((v) => Number.isFinite(v));
    if (values.length < 2) return null;
    const normalizedForecastIndex = Math.max(0, Math.min(chart.forecastIndex, values.length - 1));
    const model = computePoints(values, normalizedForecastIndex);
    const linePath = model.points
      .map((p, idx) => `${idx === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(" ");
    return { ...model, linePath };
  }, [chart.forecastIndex, chart.values]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (containerRef.current.contains(event.target as Node)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="expectedPillWrap">
      <button
        type="button"
        className={`expectedPill${disabled ? " expectedPill--disabled" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Expected activity details"
      >
        <span className="expectedPill__label">Expected Active</span>
        <span className="expectedPill__dot" aria-hidden="true">·</span>
        <span className="expectedPill__count">{formatCount(currentCount)}</span>
        <span className={trendClass} aria-hidden="true">
          <span className="material-symbols-rounded">{trendIcon(trend)}</span>
        </span>
      </button>

      {open && (
        <div className="expectedPopover" role="dialog" aria-label="Expected activity trend">
          <div className="expectedPopover__title">Expected Active Hexes</div>
          <div className="expectedPopover__desc">
            Predicted number of hexes with ≥1 sighting during this forecast week.
          </div>
          <div className="expectedPopover__valueRow">
            <span className="expectedPopover__value">{formatCount(currentCount)}</span>
            <span className="expectedPopover__delta">{formatVsPriorWeek(currentCount, vsPriorWeek)}</span>
          </div>
          <div className="expectedPopover__delta expectedPopover__delta--secondary">
            {formatVs12WeekAvg(currentCount, vs12WeekAvg)}
          </div>
          {Number.isFinite(chart.ciLow ?? NaN) && Number.isFinite(chart.ciHigh ?? NaN) && (
            <div className="expectedPopover__ciText">
              Typical error (MAE): ±6 hexes
            </div>
          )}
          {chartModel ? (
            <div className="expectedPopover__spark">
              <svg
                className="expectedPopover__sparkSvg"
                viewBox={`0 0 ${chartModel.width} ${chartModel.height}`}
                role="img"
                aria-label="Last 12 weeks actual activity with current forecast"
              >
                <line
                  x1={chartModel.padLeft}
                  y1={8}
                  x2={chartModel.padLeft}
                  y2={chartModel.height - 14}
                  className="expectedPopover__axis"
                />
                <text x={2} y={14} className="expectedPopover__axisLabel">
                  {Math.round(chartModel.maxV)}
                </text>
                <text x={2} y={chartModel.padTop + chartModel.chartHeight / 2 + 4} className="expectedPopover__axisLabel">
                  {chartModel.midV}
                </text>
                <text x={2} y={chartModel.height - 8} className="expectedPopover__axisLabel">
                  {Math.round(chartModel.minV)}
                </text>

                <path d={chartModel.linePath} className="expectedPopover__line" />
                {chartModel.points
                  .filter((p) => p.isForecast)
                  .map((p, idx) => (
                    <circle
                      key={`glow-${p.x}-${idx}`}
                      cx={p.x}
                      cy={p.y}
                      r={7.2}
                      className="expectedPopover__dotGlow"
                    />
                  ))}
                {chartModel.points.map((p, idx) => (
                  <circle
                    key={`${p.x}-${idx}`}
                    cx={p.x}
                    cy={p.y}
                    r={p.isForecast ? 3.8 : 2.7}
                    className={p.isForecast ? "expectedPopover__dot expectedPopover__dot--forecast" : "expectedPopover__dot"}
                  />
                ))}

                {Number.isFinite(chart.ciLow ?? NaN) &&
                  Number.isFinite(chart.ciHigh ?? NaN) &&
                  chartModel.points[chartModel.points.length - 1] && (
                    (() => {
                      const forecastPoint = chartModel.points[chartModel.points.length - 1];
                      const minV = chartModel.minV;
                      const maxV = chartModel.maxV;
                      const range = Math.max(1, maxV - minV);
                      const ciLowY = chartModel.padTop + ((maxV - (chart.ciLow as number)) / range) * chartModel.chartHeight;
                      const ciHighY = chartModel.padTop + ((maxV - (chart.ciHigh as number)) / range) * chartModel.chartHeight;
                      return (
                        <g>
                          <line
                            x1={forecastPoint.x}
                            y1={ciLowY}
                            x2={forecastPoint.x}
                            y2={ciHighY}
                            className="expectedPopover__ci"
                          />
                          <line
                            x1={forecastPoint.x - 4}
                            y1={ciLowY}
                            x2={forecastPoint.x + 4}
                            y2={ciLowY}
                            className="expectedPopover__ci"
                          />
                          <line
                            x1={forecastPoint.x - 4}
                            y1={ciHighY}
                            x2={forecastPoint.x + 4}
                            y2={ciHighY}
                            className="expectedPopover__ci"
                          />
                        </g>
                      );
                    })()
                  )}
              </svg>
              <div className="expectedPopover__sparkMeta">
                <span className="expectedPopover__sparkCaption">Last 12 weeks + current forecast</span>
              </div>
            </div>
          ) : (
            <div className="expectedPopover__empty">Not enough history to render trend.</div>
          )}
        </div>
      )}
    </div>
  );
}
