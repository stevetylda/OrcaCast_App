import {
  DEFAULT_EXPLAINABILITY_VIEW,
  computeCompareRows,
  filterSamplesByWindow,
  mergeSymmetricInteractionRanking,
} from "./utils";
import type { InteractionRankingRow, ShapSampleRow } from "./types";

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
  }
}

export function runExplainabilityUnitTests() {
  assertEqual(DEFAULT_EXPLAINABILITY_VIEW, "drivers", "Expected Drivers to be default mode");

  const samples: ShapSampleRow[] = [
    { sample_id: "s1", time: "2025-01-01", feature_name: "f1", feature_value: 1, shap_value: 0.4 },
    { sample_id: "s1", time: "2025-01-01", feature_name: "f2", feature_value: 2, shap_value: 0.1 },
    { sample_id: "s2", time: "2025-06-01", feature_name: "f1", feature_value: 3, shap_value: 1.2 },
    { sample_id: "s2", time: "2025-06-01", feature_name: "f2", feature_value: 3, shap_value: -0.3 },
  ];

  const windowRows = filterSamplesByWindow(samples, { start: "2025-01-01", end: "2025-02-01" });
  assertEqual(windowRows.length, 2, "Window filtering should include only in-range rows");

  const compare = computeCompareRows(
    samples,
    { start: "2025-01-01", end: "2025-02-01" },
    { start: "2025-05-01", end: "2025-07-01" }
  );
  const f1 = compare.find((row) => row.feature_name === "f1");
  assert(Boolean(f1), "Expected compare output to include f1");
  assert((f1?.delta ?? 0) > 0.7, "Expected f1 to increase in window B");

  const pairs: InteractionRankingRow[] = [
    { feature_a: "a", feature_b: "b", mean_abs_interaction: 0.5, rank: 1 },
    { feature_a: "b", feature_b: "a", mean_abs_interaction: 0.3, rank: 2 },
  ];
  const merged = mergeSymmetricInteractionRanking(pairs);
  assertEqual(merged.length, 1, "Symmetric pairs should merge to one row");
  assert(Math.abs(merged[0].mean_abs_interaction - 0.4) < 1e-9, "Merged pair should average interaction score");
}
