import { useEffect, useMemo, useState } from "react";
import { PageShell } from "../components/PageShell";
import { ComparePanel } from "../components/explainability/ComparePanel";
import { DriversPanel } from "../components/explainability/DriversPanel";
import { ExplainabilityHeader } from "../components/explainability/ExplainabilityHeader";
import { ExplainabilityToggle } from "../components/explainability/ExplainabilityToggle";
import { InteractionsPanel } from "../components/explainability/InteractionsPanel";
import { WindowPanel } from "../components/explainability/WindowPanel";
import {
  loadExplainabilityFeatures,
  loadExplainabilityIndex,
  loadExplainabilityMeta,
  loadExplainabilitySamples,
  loadGlobalImportance,
  loadInteractionRanking,
  loadInteractionSamples,
} from "../features/explainability/data";
import type {
  DateWindow,
  ExplainabilityFeature,
  ExplainabilityIndexEntry,
  ExplainabilityMeta,
  ExplainabilityView,
  GlobalImportanceRow,
  InteractionRankingRow,
  InteractionSampleRow,
  ShapSampleRow,
} from "../features/explainability/types";
import { DEFAULT_EXPLAINABILITY_VIEW, buildPresetWindow, clampWindow } from "../features/explainability/utils";

// Explainability UI ownership map:
// - Header/chips/explainer: src/components/explainability/ExplainabilityHeader.tsx
// - Segmented toggle: src/components/explainability/ExplainabilityToggle.tsx
// - Chart header controls/cards: src/components/explainability/DriversPanel.tsx + src/components/explainability/WindowPanel.tsx
// - Beeswarm/legend/axis layer: src/components/explainability/plots.tsx

const LABEL_OVERRIDES: Record<string, string> = {
  lag_vector_features__all_time_prob: "Recent presence history",
  clim_eras__all_time_prob: "Climate regime (baseline)",
};
const RESOLUTION_CHOICES = ["H4", "H5", "H6"] as const;
const RESOLUTION_LABELS: Record<(typeof RESOLUTION_CHOICES)[number], string> = {
  H4: "Regional (H4)",
  H5: "Sub-Regional (H5)",
  H6: "Local (H6)",
};

function Skeleton() {
  return (
    <section className="pageSection">
      <div className="shapSkeleton">
        <div className="shapSkeleton__row" />
        <div className="shapSkeleton__row" />
        <div className="shapSkeleton__row" />
      </div>
    </section>
  );
}

export function ExplainabilityPage() {
  const [view, setView] = useState<ExplainabilityView>(DEFAULT_EXPLAINABILITY_VIEW);
  const [modelId, setModelId] = useState("composite_linear_logit");
  const [resolution, setResolution] = useState("H4");
  const [context, setContext] = useState<ExplainabilityIndexEntry | null>(null);
  const [meta, setMeta] = useState<ExplainabilityMeta | null>(null);
  const [features, setFeatures] = useState<ExplainabilityFeature[]>([]);
  const [samples, setSamples] = useState<ShapSampleRow[]>([]);
  const [globalImportance, setGlobalImportance] = useState<GlobalImportanceRow[]>([]);
  const [interactionRanking, setInteractionRanking] = useState<InteractionRankingRow[]>([]);
  const [interactionSamples, setInteractionSamples] = useState<InteractionSampleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [windowA, setWindowA] = useState<DateWindow>({ start: "", end: "" });
  const [windowB, setWindowB] = useState<DateWindow>({ start: "", end: "" });

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    loadExplainabilityIndex()
      .then(async (index) => {
        if (!active) return;
        const selected = index.default;
        setContext(selected);

        const [nextMeta, nextFeatures, nextSamples, nextGlobal] = await Promise.all([
          loadExplainabilityMeta(selected.run_id, selected.model_id, selected.target),
          loadExplainabilityFeatures(selected.run_id, selected.model_id, selected.target),
          loadExplainabilitySamples(selected.run_id, selected.model_id, selected.target),
          loadGlobalImportance(selected.run_id, selected.model_id, selected.target),
        ]);

        let nextInteractionRanking: InteractionRankingRow[] = [];
        let nextInteractionSamples: InteractionSampleRow[] = [];
        if (nextMeta.supports_interactions) {
          try {
            [nextInteractionRanking, nextInteractionSamples] = await Promise.all([
              loadInteractionRanking(selected.run_id, selected.model_id, selected.target),
              loadInteractionSamples(selected.run_id, selected.model_id, selected.target),
            ]);
          } catch {
            nextInteractionRanking = [];
            nextInteractionSamples = [];
          }
        }

        if (!active) return;
        setMeta(nextMeta);
        setModelId(nextMeta.model_id);
        setResolution(nextMeta.resolution);
        setFeatures(nextFeatures);
        setSamples(nextSamples);
        setGlobalImportance(nextGlobal);
        setInteractionRanking(nextInteractionRanking);
        setInteractionSamples(nextInteractionSamples);

        const all = { start: nextMeta.time_min, end: nextMeta.time_max };
        const bDefault = buildPresetWindow("last12w", nextMeta.time_min, nextMeta.time_max);
        setWindowA(all);
        setWindowB(bDefault);
      })
      .catch(() => {
        if (!active) return;
        setError("Explainability artifacts are unavailable for this environment.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const featureLabelByName = useMemo(
    () =>
      new Map(
        features.map((item) => [
          item.feature_name,
          LABEL_OVERRIDES[item.feature_name] ?? item.display_name ?? item.feature_name,
        ])
      ),
    [features]
  );
  const featureTypeByName = useMemo(
    () => new Map(features.map((item) => [item.feature_name, item.feature_group])),
    [features]
  );

  if (loading) {
    return (
      <PageShell title="Explainability" stageClassName="pageStage--data" fullBleed showBottomRail={false} showFooter={false}>
        <div className="dataPageBg explainabilityPageBg">
          <div className="dataPageContent explainabilityPageContent">
            <Skeleton />
          </div>
        </div>
      </PageShell>
    );
  }

  if (error || !meta || !context) {
    return (
      <PageShell title="Explainability" stageClassName="pageStage--data" fullBleed showBottomRail={false} showFooter={false}>
        <div className="dataPageBg explainabilityPageBg">
          <div className="dataPageContent explainabilityPageContent">
            <section className="pageSection">
              <p className="pageNote">{error ?? "Explainability context is not configured."}</p>
            </section>
          </div>
        </div>
      </PageShell>
    );
  }

  const minIso = meta.time_min;
  const maxIso = meta.time_max;
  const availableResolutions = new Set([meta.resolution]);
  const resolutionOptions = RESOLUTION_CHOICES.map((value) => ({
    value,
    label: availableResolutions.has(value) ? RESOLUTION_LABELS[value] : `${RESOLUTION_LABELS[value]} (unavailable)`,
    disabled: !availableResolutions.has(value),
  }));
  const safeWindowA = clampWindow(windowA, minIso, maxIso);
  const safeWindowB = clampWindow(windowB, minIso, maxIso);
  const version = (() => {
    const match = meta.run_id.match(/_v_(\d+)_(\d+)_(\d+)$/);
    if (!match) return "v1.0.0";
    return `v${match[1]}.${match[2]}.${match[3]}`;
  })();

  return (
    <PageShell title="Explainability" stageClassName="pageStage--data" fullBleed showBottomRail={false} showFooter={false}>
      <div className="dataPageBg explainabilityPageBg">
        <div className="dataPageContent explainabilityPageContent">
          <ExplainabilityHeader
            title="Explainability"
          />
          <div className="explainabilityToggleSticky">
            <ExplainabilityToggle value={view} onChange={setView} />
          </div>

          {view === "drivers" && (
            <DriversPanel
              samples={samples}
              globalImportance={globalImportance}
              featureLabelByName={featureLabelByName}
              featureTypeByName={featureTypeByName}
              modelId={modelId}
              modelOptions={[{ value: "composite_linear_logit", label: "Composite Linear Logit" }]}
              onModelChange={setModelId}
              resolution={resolution}
              resolutionOptions={resolutionOptions}
              onResolutionChange={setResolution}
            />
          )}

          {view === "window" && (
            <WindowPanel
              allSamples={samples}
              allImportance={globalImportance}
              featureLabelByName={featureLabelByName}
              featureTypeByName={featureTypeByName}
              minIso={minIso}
              maxIso={maxIso}
              initialWindow={safeWindowB}
              onWindowChange={(window) => setWindowB(window)}
              onCompareToAllTime={() => {
                setWindowA({ start: minIso, end: maxIso });
                setView("compare");
              }}
            />
          )}

          {view === "interactions" && (
            <InteractionsPanel
              supported={meta.supports_interactions}
              ranking={interactionRanking}
              samples={interactionSamples}
            />
          )}

          {view === "compare" && (
            <ComparePanel
              allSamples={samples}
              minIso={minIso}
              maxIso={maxIso}
              windowA={safeWindowA}
              windowB={safeWindowB}
              onWindowAChange={(window) => setWindowA(clampWindow(window, minIso, maxIso))}
              onWindowBChange={(window) => setWindowB(clampWindow(window, minIso, maxIso))}
            />
          )}

          <div className="explainabilityBottomBar footer" role="note" aria-label={`Explainability version ${version}`}>
            <div className="footer__row">
              <div className="footer__pill footer__pill--static footer__pill--version">
                <span className="footer__label">Version</span>
                <span className="footer__value">{version}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
