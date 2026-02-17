import type {
  CompareRow,
  DateWindow,
  GlobalImportanceRow,
  InteractionRankingRow,
  ShapSampleRow,
} from "./types";

export const DEFAULT_EXPLAINABILITY_VIEW = "drivers" as const;

export function clampWindow(window: DateWindow, minIso: string, maxIso: string): DateWindow {
  const start = window.start < minIso ? minIso : window.start;
  const end = window.end > maxIso ? maxIso : window.end;
  if (start > end) return { start: minIso, end: maxIso };
  return { start, end };
}

export function filterSamplesByWindow(samples: ShapSampleRow[], window: DateWindow): ShapSampleRow[] {
  return samples.filter((row) => row.time >= window.start && row.time <= window.end);
}

export function computeGlobalImportanceFromSamples(samples: ShapSampleRow[]): GlobalImportanceRow[] {
  const agg = new Map<string, { absSum: number; signedSum: number; weightSum: number; absValues: number[] }>();
  for (const row of samples) {
    const weight = Number.isFinite(row.weight) ? Math.max(Number(row.weight), 0) : 1;
    const current = agg.get(row.feature_name) ?? { absSum: 0, signedSum: 0, weightSum: 0, absValues: [] };
    current.absSum += Math.abs(row.shap_value) * weight;
    current.signedSum += row.shap_value * weight;
    current.weightSum += weight;
    current.absValues.push(Math.abs(row.shap_value));
    agg.set(row.feature_name, current);
  }

  return [...agg.entries()]
    .map(([feature_name, values]) => {
      const sorted = values.absValues.sort((a, b) => a - b);
      const p95 = sorted.length === 0 ? 0 : sorted[Math.floor((sorted.length - 1) * 0.95)] ?? 0;
      const mean_abs_shap = values.weightSum > 0 ? values.absSum / values.weightSum : 0;
      const mean_shap = values.weightSum > 0 ? values.signedSum / values.weightSum : 0;
      return { feature_name, mean_abs_shap, mean_shap, p95_abs_shap: p95 };
    })
    .sort((a, b) => b.mean_abs_shap - a.mean_abs_shap);
}

function clampProb(value: number): number {
  return Math.min(0.999999, Math.max(0.000001, value));
}

function logit(prob: number): number {
  const p = clampProb(prob);
  return Math.log(p / (1 - p));
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function logitToProbabilityDelta(valueLogit: number, baselineProb = 0.5): number {
  const z0 = logit(baselineProb);
  const p1 = sigmoid(z0 + valueLogit);
  return p1 - baselineProb;
}

export function convertSamplesForUnits(
  samples: ShapSampleRow[],
  units: "logit" | "probability",
  baselineProb = 0.5
): ShapSampleRow[] {
  if (units === "logit") return samples;
  return samples.map((row) => ({
    ...row,
    shap_value: logitToProbabilityDelta(row.shap_value, baselineProb),
  }));
}

export function computeCompareRows(
  samples: ShapSampleRow[],
  windowA: DateWindow,
  windowB: DateWindow
): CompareRow[] {
  const importanceA = computeGlobalImportanceFromSamples(filterSamplesByWindow(samples, windowA));
  const importanceB = computeGlobalImportanceFromSamples(filterSamplesByWindow(samples, windowB));
  const aMap = new Map(importanceA.map((row) => [row.feature_name, row.mean_abs_shap]));
  const bMap = new Map(importanceB.map((row) => [row.feature_name, row.mean_abs_shap]));
  const features = new Set([...aMap.keys(), ...bMap.keys()]);

  const rows = [...features].map((feature_name) => {
    const a_mean_abs_shap = aMap.get(feature_name) ?? 0;
    const b_mean_abs_shap = bMap.get(feature_name) ?? 0;
    return {
      feature_name,
      a_mean_abs_shap,
      b_mean_abs_shap,
      delta: b_mean_abs_shap - a_mean_abs_shap,
    };
  });

  rows.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  return rows;
}

export function canonicalPair(a: string, b: string): [string, string] {
  return a <= b ? [a, b] : [b, a];
}

export function mergeSymmetricInteractionRanking(rows: InteractionRankingRow[]): InteractionRankingRow[] {
  const agg = new Map<string, { feature_a: string; feature_b: string; sum: number; count: number }>();
  for (const row of rows) {
    const [feature_a, feature_b] = canonicalPair(row.feature_a, row.feature_b);
    const key = `${feature_a}::${feature_b}`;
    const current = agg.get(key) ?? { feature_a, feature_b, sum: 0, count: 0 };
    current.sum += row.mean_abs_interaction;
    current.count += 1;
    agg.set(key, current);
  }

  return [...agg.values()]
    .map((row, index) => ({
      feature_a: row.feature_a,
      feature_b: row.feature_b,
      mean_abs_interaction: row.count > 0 ? row.sum / row.count : 0,
      rank: index + 1,
    }))
    .sort((a, b) => b.mean_abs_interaction - a.mean_abs_interaction)
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

export function uniqueSampleCount(rows: ShapSampleRow[]): number {
  return new Set(rows.map((row) => row.sample_id)).size;
}

export function toMonthLabel(isoDate: string): string {
  return isoDate.slice(0, 7);
}

export function buildPresetWindow(
  preset: "last4w" | "last12w" | "year" | "all",
  minIso: string,
  maxIso: string
): DateWindow {
  if (preset === "all") return { start: minIso, end: maxIso };
  const max = new Date(`${maxIso}T00:00:00Z`);
  const start = new Date(max);
  if (preset === "last4w") start.setUTCDate(start.getUTCDate() - 28);
  if (preset === "last12w") start.setUTCDate(start.getUTCDate() - 84);
  if (preset === "year") start.setUTCMonth(0, 1);
  const isoStart = start.toISOString().slice(0, 10);
  return clampWindow({ start: isoStart, end: maxIso }, minIso, maxIso);
}
