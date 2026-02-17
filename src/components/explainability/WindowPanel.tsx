import { useEffect, useMemo, useState } from "react";
import type { DateWindow, GlobalImportanceRow, ShapSampleRow } from "../../features/explainability/types";
import {
  buildPresetWindow,
  clampWindow,
  computeGlobalImportanceFromSamples,
  convertSamplesForUnits,
  filterSamplesByWindow,
  toMonthLabel,
  uniqueSampleCount,
} from "../../features/explainability/utils";
import { ShapSummaryPlot } from "./plots";

type Props = {
  allSamples: ShapSampleRow[];
  allImportance: GlobalImportanceRow[];
  featureLabelByName: Map<string, string>;
  featureTypeByName: Map<string, string>;
  minIso: string;
  maxIso: string;
  initialWindow: DateWindow;
  onWindowChange: (window: DateWindow) => void;
  onCompareToAllTime: () => void;
};

export function WindowPanel({
  allSamples,
  allImportance,
  featureLabelByName,
  featureTypeByName,
  minIso,
  maxIso,
  initialWindow,
  onWindowChange,
  onCompareToAllTime,
}: Props) {
  const [window, setWindow] = useState<DateWindow>(initialWindow);
  const [topN, setTopN] = useState(20);
  const [units, setUnits] = useState<"logit" | "probability">("probability");

  const clamped = useMemo(() => clampWindow(window, minIso, maxIso), [window, minIso, maxIso]);
  const filtered = useMemo(() => filterSamplesByWindow(allSamples, clamped), [allSamples, clamped]);
  const filteredForUnits = useMemo(() => convertSamplesForUnits(filtered, units), [filtered, units]);
  const allImportanceForUnits = useMemo(
    () => (units === "logit" ? allImportance : computeGlobalImportanceFromSamples(convertSamplesForUnits(allSamples, units))),
    [allImportance, allSamples, units]
  );
  const importance = useMemo(() => computeGlobalImportanceFromSamples(filteredForUnits), [filteredForUnits]);
  const n = useMemo(() => uniqueSampleCount(filtered), [filtered]);
  const maxAvailable = (importance.length > 0 ? importance : allImportanceForUnits).length;
  const topNOptions = [10, 20, 50];
  const highestAvailableTopN = topNOptions.filter((value) => value <= maxAvailable).at(-1) ?? topNOptions[0];
  const effectiveTopN = Math.min(topN, maxAvailable || topN);

  useEffect(() => {
    if (!topNOptions.includes(topN)) {
      setTopN(highestAvailableTopN);
      return;
    }
    if (topN > maxAvailable && maxAvailable > 0) {
      setTopN(highestAvailableTopN);
    }
  }, [topN, maxAvailable, highestAvailableTopN]);

  const applyWindow = (next: DateWindow) => {
    const normalized = clampWindow(next, minIso, maxIso);
    setWindow(normalized);
    onWindowChange(normalized);
  };

  return (
    <section className="pageSection explainabilityPanel">
      <div className="explainabilityPanel__head">
        <h3>Drivers (Window)</h3>
        <div className="explainabilityPanel__controls">
          <label className="insightsExplorer__field">
            <span>Top N Drivers</span>
            <select className="select" value={topN} onChange={(event) => setTopN(Number(event.target.value))}>
              {topNOptions.map((value) => (
                <option key={value} value={value} disabled={value > maxAvailable}>
                  {value > maxAvailable ? `${value} (unavailable)` : value}
                </option>
              ))}
            </select>
          </label>
          <label className="insightsExplorer__field">
            <span className="explainabilityFieldLabel">
              Impact units
              <span className="explainabilityInfoWrap">
                <button
                  type="button"
                  className="explainabilityInfoDot"
                  aria-label="Impact units help"
                >
                  i
                </button>
                <span className="explainabilityInfoHelp" role="tooltip">
                  Probability = approximate change in predicted probability.
                  <br />
                  Logit = change in log-odds; larger magnitude = stronger push.
                </span>
              </span>
            </span>
            <select
              className="select"
              value={units}
              onChange={(event) => setUnits(event.target.value as "logit" | "probability")}
            >
              <option value="logit">Logit</option>
              <option value="probability">Probability</option>
            </select>
          </label>
        </div>
      </div>

      <div className="explainabilityPanel__controls explainabilityPanel__controls--window">
        <label className="insightsExplorer__field">
          <span>Start</span>
          <input
            className="select"
            type="date"
            value={clamped.start}
            min={minIso}
            max={maxIso}
            onChange={(event) => applyWindow({ ...clamped, start: event.target.value })}
          />
        </label>
        <label className="insightsExplorer__field">
          <span>End</span>
          <input
            className="select"
            type="date"
            value={clamped.end}
            min={minIso}
            max={maxIso}
            onChange={(event) => applyWindow({ ...clamped, end: event.target.value })}
          />
        </label>
      </div>

      <div className="insightsExplorer__chips" role="tablist" aria-label="Window presets">
        <button type="button" className="pageToggle" onClick={() => applyWindow(buildPresetWindow("last4w", minIso, maxIso))}>
          Last 4w
        </button>
        <button type="button" className="pageToggle" onClick={() => applyWindow(buildPresetWindow("last12w", minIso, maxIso))}>
          Last 12w
        </button>
        <button type="button" className="pageToggle" onClick={() => applyWindow(buildPresetWindow("year", minIso, maxIso))}>
          This year
        </button>
        <button type="button" className="pageToggle" onClick={() => applyWindow(buildPresetWindow("all", minIso, maxIso))}>
          Custom
        </button>
      </div>

      <div className="explainabilityWindowBanner">
        Window: {toMonthLabel(clamped.start)}
        {" -> "}
        {toMonthLabel(clamped.end)}
        {" | n="}
        {n.toLocaleString()}
      </div>

      <ShapSummaryPlot
        samples={filteredForUnits}
        ranking={importance.length > 0 ? importance : allImportanceForUnits}
        topN={effectiveTopN}
        featureLabelByName={featureLabelByName}
        featureTypeByName={featureTypeByName}
        impactAxisLabel={units === "probability" ? "Impact (probability)" : "Impact (log-odds)"}
      />
      <p className="explainabilityPanel__foot">
        Window: {clamped.start}
        {" -> "}
        {clamped.end}
        {" | n="}
        {n.toLocaleString()}
        {" | Sorted by mean(|impact|) | Top N: "}
        {effectiveTopN}
        {" | Available features: "}
        {maxAvailable}
      </p>

      <div className="explainabilityPanel__actions">
        <button type="button" className="ghostBtn" onClick={onCompareToAllTime}>
          Compare to all-time
        </button>
      </div>
    </section>
  );
}
