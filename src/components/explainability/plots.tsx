import { useMemo } from "react";
import type {
  CompareRow,
  GlobalImportanceRow,
  InteractionSampleRow,
  ShapSampleRow,
} from "../../features/explainability/types";

export type DependenceRow = {
  sample_id: string;
  time: string;
  x: number;
  y: number;
  color: number | null;
};

type TrendPoint = {
  x: number;
  median: number;
  q25: number;
  q75: number;
};

type SummaryProps = {
  samples: ShapSampleRow[];
  ranking: GlobalImportanceRow[];
  topN: number;
  featureLabelByName: Map<string, string>;
  featureTypeByName?: Map<string, string>;
  impactAxisLabel?: string;
  renderMode?: "dense" | "crisp";
  onRenderModeChange?: (mode: "dense" | "crisp") => void;
  selectedFeature?: string | null;
  onFeatureSelect?: (featureName: string) => void;
};

function colorFromGradient(value: number, min: number, max: number): string {
  if (!Number.isFinite(value)) return "rgba(139, 152, 173, 0.75)";
  const t = max <= min ? 0.5 : Math.max(0, Math.min(1, (value - min) / (max - min)));
  // Vivid cyan -> neon violet gradient.
  const low = { r: 0, g: 224, b: 255 };
  const high = { r: 196, g: 78, b: 255 };
  const r = Math.round(low.r + t * (high.r - low.r));
  const g = Math.round(low.g + t * (high.g - low.g));
  const b = Math.round(low.b + t * (high.b - low.b));
  return `rgba(${r}, ${g}, ${b}, 0.95)`;
}

function formatTick(value: number): string {
  if (Math.abs(value) >= 1) return value.toFixed(1);
  return value.toFixed(2).replace(/\.00$/, "");
}

function stableAxisMax(maxAbs: number): number {
  const ladder = [0.4, 0.8, 1.2, 1.6, 2.4, 3.2, 4.8, 6.4];
  for (const step of ladder) {
    if (maxAbs <= step) return step;
  }
  return Math.ceil(maxAbs);
}

function truncateFeatureLabel(value: string, maxChars = 28): string {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, maxChars - 3)}...`;
}

function compactFeatureLabel(value: string): string {
  const compacted = value
    .replace(/\bSpatiotemporal\b/g, "Spatiotemp")
    .replace(/\bclimatology\b/gi, "clim.")
    .replace(/\bClimate\b/g, "Clim.")
    .replace(/\bclimate\b/g, "clim.")
    .replace(/\bDistance\b/g, "Dist.")
    .replace(/\bdistance\b/g, "dist.")
    .replace(/\bPercent\b/g, "Pct.")
    .replace(/\bpercent\b/g, "pct.")
    .replace(/\bhistory\b/gi, "hist.")
    .replace(/\bfeatures\b/gi, "feat.")
    .replace(/\bbaseline\b/gi, "base.")
    .replace(/\s{2,}/g, " ")
    .trim();

  return truncateFeatureLabel(compacted, 24);
}

function normalizeFeatureType(value?: string): string {
  if (!value) return "Other";
  const normalized = value.toLowerCase();
  if (normalized.includes("temporal") || normalized.includes("lag")) return "Lag";
  if (normalized.includes("spatial") || normalized.includes("distance")) return "Static";
  if (normalized.includes("environment") || normalized.includes("climate")) return "Baseline";
  if (normalized.includes("human")) return "Human";
  if (normalized.includes("prey")) return "Prey";
  return value;
}

export function ShapSummaryPlot({
  samples,
  ranking,
  topN,
  featureLabelByName,
  featureTypeByName,
  impactAxisLabel = "Impact (logit)",
  renderMode = "dense",
  onRenderModeChange,
  selectedFeature,
  onFeatureSelect,
}: SummaryProps) {
  const topFeatures = ranking.slice(0, topN).map((row) => row.feature_name);

  const data = useMemo(() => {
    const filtered = samples.filter((row) => topFeatures.includes(row.feature_name));
    const byFeature = new Map<string, ShapSampleRow[]>();
    for (const row of filtered) {
      const list = byFeature.get(row.feature_name) ?? [];
      list.push(row);
      byFeature.set(row.feature_name, list);
    }
    const maxAbs = Math.max(...filtered.map((row) => Math.abs(row.shap_value)), 1e-6);
    return { byFeature, maxAbs };
  }, [samples, topFeatures]);

  if (topFeatures.length === 0 || samples.length === 0) {
    return <p className="pageNote">No SHAP samples available for this selection.</p>;
  }

  const rowHeight = 32;
  const leftPad = 210;
  const topPad = 40;
  const bottomPad = 52;
  const rightPad = 96;
  const width = 1120;
  const height = topPad + topFeatures.length * rowHeight + bottomPad;
  const axisMax = stableAxisMax(data.maxAbs);
  const plotWidth = width - leftPad - rightPad;
  const legendCenterX = width - 54;
  const legendBarY = topPad + 22;
  const legendBarHeight = 94;
  const ticks = [-1, -0.5, 0, 0.5, 1].map((factor) => factor * axisMax);
  const axisY = height - bottomPad + 6;

  return (
    <div className="explainabilityPlotWrap">
      <svg className="explainabilityPlot" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Global SHAP summary beeswarm">
        <defs>
          <linearGradient id="featureValueGradient" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#00E0FF" />
            <stop offset="100%" stopColor="#C44EFF" />
          </linearGradient>
          <linearGradient id="violinGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00E0FF" stopOpacity="0.96" />
            <stop offset="100%" stopColor="#C44EFF" stopOpacity="0.96" />
          </linearGradient>
        </defs>

        {ticks.map((tick) => {
          const x = leftPad + ((tick + axisMax) / (2 * axisMax)) * plotWidth;
          return (
            <g key={tick}>
              <line x1={x} y1={topPad - 2} x2={x} y2={axisY} className="explainabilityPlot__tickLine" />
              <text x={x} y={axisY + 16} textAnchor="middle" className="explainabilityPlot__tickLabel">
                {formatTick(tick)}
              </text>
            </g>
          );
        })}

        <line
          x1={leftPad + plotWidth / 2}
          y1={topPad - 14}
          x2={leftPad + plotWidth / 2}
          y2={axisY}
          className="explainabilityPlot__zero"
        />
        <text x={leftPad + plotWidth / 2 - 16} y={topPad - 18} textAnchor="end" className="explainabilityPlot__zeroLabel">
          ↓ lowers prediction
        </text>
        <text x={leftPad + plotWidth / 2 + 16} y={topPad - 18} textAnchor="start" className="explainabilityPlot__zeroLabel">
          ↑ raises prediction
        </text>

        {topFeatures.map((feature, featureIdx) => {
          const fullLabel = featureLabelByName.get(feature) ?? feature;
          const compactLabel = compactFeatureLabel(fullLabel);
          const featureType = normalizeFeatureType(featureTypeByName?.get(feature));
          const rows = data.byFeature.get(feature) ?? [];
          const rowTop = topPad + featureIdx * rowHeight;
          const centerY = rowTop + rowHeight / 2;
          const values = rows
            .map((row) => (row.feature_value == null ? Number.NaN : Number(row.feature_value)))
            .filter(Number.isFinite);
          const valueMin = values.length > 0 ? Math.min(...values) : -1;
          const valueMax = values.length > 0 ? Math.max(...values) : 1;
          return (
            <g key={feature}>
              <rect
                x={leftPad}
                y={rowTop + 1}
                width={plotWidth}
                height={rowHeight - 2}
                className={selectedFeature === feature ? "explainabilityPlot__rowHighlight isActive" : "explainabilityPlot__rowHighlight"}
                onClick={() => onFeatureSelect?.(feature)}
              />
              <line x1={leftPad} y1={centerY} x2={width - rightPad} y2={centerY} className="explainabilityPlot__rowLine" />
              <text
                x={leftPad - 8}
                y={centerY + 4}
                textAnchor="end"
                className={selectedFeature === feature ? "explainabilityPlot__feature isActive" : "explainabilityPlot__feature"}
                onClick={() => onFeatureSelect?.(feature)}
              >
                {compactLabel}
                <title>{`${fullLabel}\nType: ${featureType}`}</title>
              </text>
              {renderMode === "crisp" && (() => {
                const bins = 52;
                const counts = new Array<number>(bins).fill(0);
                for (const row of rows) {
                  const bounded = Math.max(-axisMax, Math.min(axisMax, row.shap_value));
                  const t = (bounded + axisMax) / (2 * axisMax);
                  const idx = Math.max(0, Math.min(bins - 1, Math.floor(t * bins)));
                  counts[idx] += 1;
                }
                const smoothed = counts.map((_, idx) => {
                  const c0 = counts[Math.max(0, idx - 2)] ?? 0;
                  const c1 = counts[Math.max(0, idx - 1)] ?? 0;
                  const c2 = counts[idx] ?? 0;
                  const c3 = counts[Math.min(bins - 1, idx + 1)] ?? 0;
                  const c4 = counts[Math.min(bins - 1, idx + 2)] ?? 0;
                  return (c0 + 2 * c1 + 3 * c2 + 2 * c3 + c4) / 9;
                });
                const maxCount = Math.max(...smoothed, 1);
                const topPoints: string[] = [];
                const bottomPoints: string[] = [];
                for (let idx = 0; idx < bins; idx += 1) {
                  const x = leftPad + ((idx + 0.5) / bins) * plotWidth;
                  const widthScale = (smoothed[idx] / maxCount) * (rowHeight * 0.46);
                  topPoints.push(`${x},${centerY - widthScale}`);
                  bottomPoints.push(`${x},${centerY + widthScale}`);
                }
                const points = [...topPoints, ...bottomPoints.reverse()].join(" ");
                return <polygon points={points} className="explainabilityPlot__violin" />;
              })()}
              {renderMode === "dense" &&
                rows.map((row, dotIdx) => {
                  const bounded = Math.max(-axisMax, Math.min(axisMax, row.shap_value));
                  const x = leftPad + ((bounded + axisMax) / (2 * axisMax)) * plotWidth;
                  const jitter = ((Math.sin(dotIdx * 12.9898 + featureIdx * 31.127) * 43758.5453) % 1) * 16 - 8;
                  const y = centerY + jitter;
                  const fill =
                    row.feature_value == null
                      ? "rgba(152, 165, 189, 0.72)"
                      : colorFromGradient(Number(row.feature_value), valueMin, valueMax);
                  return (
                    <circle key={`${row.sample_id}-${feature}-${dotIdx}`} cx={x} cy={y} r={2.2} fill={fill}>
                      <title>{`${fullLabel}\nType: ${featureType}\nSHAP: ${row.shap_value.toFixed(4)}\nFeature value: ${
                        row.feature_value == null ? "n/a" : Number(row.feature_value).toFixed(4)
                      }\nTime: ${row.time}`}</title>
                    </circle>
                  );
                })}
            </g>
          );
        })}

        <line x1={leftPad} y1={axisY} x2={width - rightPad} y2={axisY} className="explainabilityPlot__axis" />
        <text x={leftPad + plotWidth / 2} y={height - 10} textAnchor="middle" className="explainabilityPlot__axisLabel">
          {impactAxisLabel}
        </text>
        <text x={legendCenterX} y={topPad + 8} textAnchor="middle" className="explainabilityPlot__legendTitle">
          Feature value
        </text>
        {onRenderModeChange && (
          <g transform={`translate(${legendCenterX - 20}, ${topPad - 34})`}>
            <rect x={0} y={0} width={52} height={18} rx={9} className="explainabilityPlot__modeRail" />
            <g
              transform="translate(2,2)"
              className={renderMode === "dense" ? "explainabilityPlot__modeBtn isActive" : "explainabilityPlot__modeBtn"}
              onClick={() => onRenderModeChange("dense")}
            >
              <rect x={0} y={0} width={24} height={14} rx={7} />
              <circle cx={7} cy={7} r={1.2} />
              <circle cx={11} cy={6} r={1.2} />
              <circle cx={15} cy={8} r={1.2} />
              <circle cx={18} cy={5} r={1.2} />
            </g>
            <g
              transform="translate(26,2)"
              className={renderMode === "crisp" ? "explainabilityPlot__modeBtn isActive" : "explainabilityPlot__modeBtn"}
              onClick={() => onRenderModeChange("crisp")}
            >
              <rect x={0} y={0} width={24} height={14} rx={7} />
              <path d="M4 7 C7 3, 11 3, 14 7 C11 11, 7 11, 4 7 Z" />
              <line x1={14} y1={7} x2={20} y2={7} />
            </g>
          </g>
        )}
        <rect x={legendCenterX - 5} y={legendBarY} width={10} height={legendBarHeight} rx={6} fill="url(#featureValueGradient)" />
        <text x={legendCenterX + 12} y={legendBarY + 4} textAnchor="start" className="explainabilityPlot__legendLabel">
          High
        </text>
        <text x={legendCenterX + 12} y={legendBarY + legendBarHeight} textAnchor="start" className="explainabilityPlot__legendLabel">
          Low
        </text>
      </svg>
    </div>
  );
}

type DependencePlotProps = {
  rows: DependenceRow[];
  xLabel: string;
  colorLabel: string;
  showTrend?: boolean;
  showBand?: boolean;
};

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const idx = (sorted.length - 1) * q;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  const t = idx - lo;
  return sorted[lo] * (1 - t) + sorted[hi] * t;
}

function buildTrend(rows: DependenceRow[]): TrendPoint[] {
  if (rows.length < 20) return [];
  const sortedRows = [...rows].sort((a, b) => a.x - b.x);
  const n = sortedRows.length;
  const bins = Math.max(12, Math.min(36, Math.round(Math.sqrt(n))));
  const binSize = Math.max(8, Math.floor(n / bins));
  const trend: TrendPoint[] = [];
  for (let start = 0; start < n; start += binSize) {
    const chunk = sortedRows.slice(start, Math.min(n, start + binSize));
    if (chunk.length < 6) continue;
    const xs = chunk.map((row) => row.x).sort((a, b) => a - b);
    const ys = chunk.map((row) => row.y).sort((a, b) => a - b);
    trend.push({
      x: quantile(xs, 0.5),
      median: quantile(ys, 0.5),
      q25: quantile(ys, 0.25),
      q75: quantile(ys, 0.75),
    });
  }
  return trend;
}

export function FeatureDependencePlot({
  rows,
  xLabel,
  colorLabel,
  showTrend = true,
  showBand = true,
}: DependencePlotProps) {
  if (rows.length === 0) {
    return <p className="pageNote">No dependence samples available for this feature.</p>;
  }

  const width = 980;
  const height = 380;
  const leftPad = 58;
  const rightPad = 20;
  const topPad = 16;
  const bottomPad = 42;
  const plotWidth = width - leftPad - rightPad;
  const plotHeight = height - topPad - bottomPad;

  const xMin = Math.min(...rows.map((row) => row.x));
  const xMax = Math.max(...rows.map((row) => row.x));
  const yMin = Math.min(...rows.map((row) => row.y));
  const yMax = Math.max(...rows.map((row) => row.y));
  const colorValues = rows.map((row) => row.color).filter((value): value is number => Number.isFinite(value as number));
  const cMin = colorValues.length > 0 ? Math.min(...colorValues) : -1;
  const cMax = colorValues.length > 0 ? Math.max(...colorValues) : 1;

  const toX = (value: number) => leftPad + ((value - xMin) / Math.max(xMax - xMin, 1e-9)) * plotWidth;
  const toY = (value: number) => topPad + (1 - (value - yMin) / Math.max(yMax - yMin, 1e-9)) * plotHeight;
  const trend = buildTrend(rows);
  const trendPath =
    trend.length > 1
      ? trend
          .map((point, idx) => `${idx === 0 ? "M" : "L"} ${toX(point.x)} ${toY(point.median)}`)
          .join(" ")
      : "";
  const ribbonPoints =
    trend.length > 2
      ? [
          ...trend.map((point) => `${toX(point.x)},${toY(point.q75)}`),
          ...[...trend].reverse().map((point) => `${toX(point.x)},${toY(point.q25)}`),
        ].join(" ")
      : "";

  return (
    <div className="explainabilityPlotWrap">
      <svg className="explainabilityPlot" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Feature dependence plot">
        <line x1={leftPad} y1={height - bottomPad} x2={width - rightPad} y2={height - bottomPad} className="explainabilityPlot__axis" />
        <line x1={leftPad} y1={topPad} x2={leftPad} y2={height - bottomPad} className="explainabilityPlot__axis" />
        {showBand && ribbonPoints && <polygon points={ribbonPoints} className="explainabilityPlot__trendBand" />}
        {rows.map((row, idx) => (
          <circle
            key={`${row.sample_id}-${idx}`}
            cx={toX(row.x)}
            cy={toY(row.y)}
            r={2.3}
            fill={row.color == null ? "rgba(152, 165, 189, 0.7)" : colorFromGradient(row.color, cMin, cMax)}
            opacity={0.86}
          />
        ))}
        {showTrend && trendPath && <path d={trendPath} className="explainabilityPlot__trendLine" />}
        <text x={width / 2} y={height - 10} textAnchor="middle" className="explainabilityPlot__axisLabel">
          {xLabel}
        </text>
        <text x={12} y={height / 2} textAnchor="middle" className="explainabilityPlot__axisLabel" transform={`rotate(-90 12 ${height / 2})`}>
          SHAP impact
        </text>
        <text x={width - 12} y={topPad + 12} textAnchor="end" className="explainabilityPlot__legendLabel">
          Color by: {colorLabel}
        </text>
      </svg>
    </div>
  );
}

type InteractionPlotProps = {
  rows: InteractionSampleRow[];
  mode: "effect" | "interaction";
};

export function InteractionScatterPlot({ rows, mode }: InteractionPlotProps) {
  if (rows.length === 0) {
    return <p className="pageNote">No interaction samples for this pair.</p>;
  }

  const width = 980;
  const height = 420;
  const leftPad = 56;
  const rightPad = 26;
  const topPad = 18;
  const bottomPad = 34;
  const plotWidth = width - leftPad - rightPad;
  const plotHeight = height - topPad - bottomPad;

  const xMin = Math.min(...rows.map((row) => row.value_a));
  const xMax = Math.max(...rows.map((row) => row.value_a));
  const yValues = mode === "interaction" ? rows.map((row) => row.interaction_value ?? 0) : rows.map((row) => row.shap_a);
  const yMin = Math.min(...yValues);
  const yMax = Math.max(...yValues);
  const cMin = Math.min(...rows.map((row) => row.value_b));
  const cMax = Math.max(...rows.map((row) => row.value_b));

  const toX = (value: number) => leftPad + ((value - xMin) / Math.max(xMax - xMin, 1e-9)) * plotWidth;
  const toY = (value: number) => topPad + (1 - (value - yMin) / Math.max(yMax - yMin, 1e-9)) * plotHeight;

  return (
    <div className="explainabilityPlotWrap">
      <svg className="explainabilityPlot" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Interaction dependence plot">
        <line x1={leftPad} y1={height - bottomPad} x2={width - rightPad} y2={height - bottomPad} className="explainabilityPlot__axis" />
        <line x1={leftPad} y1={topPad} x2={leftPad} y2={height - bottomPad} className="explainabilityPlot__axis" />
        {rows.map((row, idx) => (
          <circle
            key={`${row.time}-${idx}`}
            cx={toX(row.value_a)}
            cy={toY(mode === "interaction" ? row.interaction_value ?? 0 : row.shap_a)}
            r={2.8}
            fill={colorFromGradient(row.value_b, cMin, cMax)}
          >
            <title>{`${row.feature_a}: ${row.value_a.toFixed(3)}\n${
              mode === "interaction" ? "Interaction" : "SHAP(A)"
            }: ${(mode === "interaction" ? row.interaction_value ?? 0 : row.shap_a).toFixed(4)}\n${row.feature_b}: ${row.value_b.toFixed(3)}`}</title>
          </circle>
        ))}
        <text x={width / 2} y={height - 8} textAnchor="middle" className="explainabilityPlot__axisLabel">
          {rows[0]?.feature_a ?? "Feature A"} value
        </text>
        <text x={12} y={height / 2} textAnchor="middle" className="explainabilityPlot__axisLabel" transform={`rotate(-90 12 ${height / 2})`}>
          {mode === "interaction" ? "Interaction value" : "SHAP(A)"}
        </text>
      </svg>
    </div>
  );
}

type DeltaProps = {
  rows: CompareRow[];
};

export function DeltaBarChart({ rows }: DeltaProps) {
  if (rows.length === 0) {
    return <p className="pageNote">No overlapping SHAP samples for the selected windows.</p>;
  }

  const visible = rows.slice(0, 18);
  const maxAbs = Math.max(...visible.map((row) => Math.abs(row.delta)), 1e-9);
  const width = 920;
  const rowHeight = 30;
  const leftPad = 230;
  const rightPad = 24;
  const topPad = 16;
  const height = topPad + visible.length * rowHeight + 20;
  const plotWidth = width - leftPad - rightPad;

  return (
    <div className="explainabilityPlotWrap">
      <svg className="explainabilityPlot" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Delta mean absolute SHAP by feature">
        <line
          x1={leftPad + plotWidth / 2}
          y1={topPad - 8}
          x2={leftPad + plotWidth / 2}
          y2={height - 8}
          className="explainabilityPlot__zero"
        />
        {visible.map((row, idx) => {
          const centerY = topPad + idx * rowHeight + rowHeight / 2;
          const px = (Math.abs(row.delta) / maxAbs) * (plotWidth / 2);
          const x = row.delta >= 0 ? leftPad + plotWidth / 2 : leftPad + plotWidth / 2 - px;
          return (
            <g key={row.feature_name}>
              <text x={leftPad - 8} y={centerY + 4} textAnchor="end" className="explainabilityPlot__feature">
                {row.feature_name}
              </text>
              <rect
                x={x}
                y={centerY - 8}
                width={px}
                height={16}
                rx={4}
                className={row.delta >= 0 ? "explainabilityPlot__barPos" : "explainabilityPlot__barNeg"}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
