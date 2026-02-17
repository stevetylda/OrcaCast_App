import { useEffect, useMemo, useState } from "react";
import type { InteractionRankingRow, InteractionSampleRow } from "../../features/explainability/types";
import { mergeSymmetricInteractionRanking } from "../../features/explainability/utils";
import { InteractionScatterPlot } from "./plots";

type Props = {
  supported: boolean;
  ranking: InteractionRankingRow[];
  samples: InteractionSampleRow[];
};

export function InteractionsPanel({ supported, ranking, samples }: Props) {
  const [mode, setMode] = useState<"effect" | "interaction">("effect");

  const normalizedRanking = useMemo(() => mergeSymmetricInteractionRanking(ranking), [ranking]);
  const [selectedPair, setSelectedPair] = useState<string>(
    normalizedRanking[0] ? `${normalizedRanking[0].feature_a}::${normalizedRanking[0].feature_b}` : ""
  );

  useEffect(() => {
    if (!selectedPair && normalizedRanking[0]) {
      setSelectedPair(`${normalizedRanking[0].feature_a}::${normalizedRanking[0].feature_b}`);
    }
  }, [normalizedRanking, selectedPair]);

  const selectedSamples = useMemo(() => {
    if (!selectedPair) return [];
    const [a, b] = selectedPair.split("::");
    return samples.filter(
      (row) => (row.feature_a === a && row.feature_b === b) || (row.feature_a === b && row.feature_b === a)
    );
  }, [samples, selectedPair]);

  if (!supported) {
    return (
      <section className="pageSection explainabilityPanel">
        <h3>Interactions</h3>
        <div className="explainabilityEmptyState">
          Interactions are available for tree models (XGBoost/LightGBM).
        </div>
      </section>
    );
  }

  return (
    <section className="explainabilityInteractionsGrid">
      <section className="pageSection explainabilityPanel">
        <h3>Interaction ranking</h3>
        <div className="explainabilityPairList" role="listbox" aria-label="Top interaction pairs">
          {normalizedRanking.slice(0, 50).map((row) => {
            const key = `${row.feature_a}::${row.feature_b}`;
            const active = key === selectedPair;
            return (
              <button
                type="button"
                key={key}
                className={active ? "explainabilityPairList__item explainabilityPairList__item--active" : "explainabilityPairList__item"}
                onClick={() => setSelectedPair(key)}
              >
                <span>{row.feature_a} x {row.feature_b}</span>
                <strong>{row.mean_abs_interaction.toFixed(4)}</strong>
              </button>
            );
          })}
        </div>
      </section>

      <section className="pageSection explainabilityPanel">
        <div className="explainabilityPanel__head">
          <h3>Interaction plot</h3>
          <div className="insightsExplorer__unitToggle">
            <button
              type="button"
              className={mode === "effect" ? "pageToggle pageToggle--active" : "pageToggle"}
              onClick={() => setMode("effect")}
            >
              Effect
            </button>
            <button
              type="button"
              className={mode === "interaction" ? "pageToggle pageToggle--active" : "pageToggle"}
              onClick={() => setMode("interaction")}
            >
              Interaction value
            </button>
          </div>
        </div>
        <InteractionScatterPlot rows={selectedSamples} mode={mode} />
      </section>
    </section>
  );
}
