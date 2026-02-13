import type { Period } from "../data/periods";

type CompareMode = "split" | "overlay";
type ScaleMode = "shared" | "separate";

type CompareSpec = {
  enabled: boolean;
  mode: CompareMode;
  scaleMode: ScaleMode;
  modelA: { model: string; year: number; period: number };
  modelB: { model: string; year: number; period: number };
  split: { syncDrag: boolean; fixed: boolean; splitPct: number };
  overlay: { opacity: number };
  selection: { h3: string | null };
  showDelta: boolean;
};

type Props = {
  compare: CompareSpec;
  periods: Period[];
  modelOptions: Array<{ value: string; label: string }>;
  valueA: number | null;
  valueB: number | null;
  onChange: (next: CompareSpec | ((prev: CompareSpec) => CompareSpec)) => void;
};

export function CompareToolTray({ compare, periods, modelOptions, valueA, valueB, onChange }: Props) {
  if (!compare.enabled) return null;

  const delta = valueA !== null && valueB !== null ? valueB - valueA : null;

  const renderPeriodSelect = (
    side: "modelA" | "modelB",
    current: { year: number; period: number }
  ) => (
    <select
      value={`${current.year}-${current.period}`}
      onChange={(e) => {
        const [year, period] = e.target.value.split("-").map(Number);
        onChange((prev) => ({ ...prev, [side]: { ...prev[side], year, period } }));
      }}
    >
      {periods.map((p) => (
        <option key={p.periodKey} value={`${p.year}-${p.stat_week}`}>
          {p.year} W{String(p.stat_week).padStart(2, "0")}
        </option>
      ))}
    </select>
  );

  return (
    <div className="compareTray" data-tour="compare-tray">
      <div className="compareTray__row">
        <label>
          Model A
          <select
            value={compare.modelA.model}
            onChange={(e) => onChange((prev) => ({ ...prev, modelA: { ...prev.modelA, model: e.target.value } }))}
          >
            {modelOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </label>
        <label>Period A {renderPeriodSelect("modelA", compare.modelA)}</label>

        <label>
          Model B
          <select
            value={compare.modelB.model}
            onChange={(e) => onChange((prev) => ({ ...prev, modelB: { ...prev.modelB, model: e.target.value } }))}
          >
            {modelOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </label>
        <label>Period B {renderPeriodSelect("modelB", compare.modelB)}</label>
      </div>

      <div className="compareTray__row" data-tour="compare-mode">
        <label>
          Shared scale
          <input
            type="checkbox"
            checked={compare.scaleMode === "shared"}
            onChange={(e) => onChange((prev) => ({ ...prev, scaleMode: e.target.checked ? "shared" : "separate" }))}
          />
        </label>
        <label>
          <input type="radio" checked={compare.mode === "split"} onChange={() => onChange((p) => ({ ...p, mode: "split" }))} />
          Split
        </label>
        <label>
          <input type="radio" checked={compare.mode === "overlay"} onChange={() => onChange((p) => ({ ...p, mode: "overlay" }))} />
          Overlay
        </label>

        {compare.mode === "split" ? (
          <>
            <label>
              Sync drag
              <input type="checkbox" checked={compare.split.syncDrag} onChange={(e) => onChange((p) => ({ ...p, split: { ...p.split, syncDrag: e.target.checked } }))} />
            </label>
            <label>
              Fixed split
              <input type="checkbox" checked={compare.split.fixed} onChange={(e) => onChange((p) => ({ ...p, split: { ...p.split, fixed: e.target.checked } }))} />
            </label>
            {!compare.split.fixed && (
              <label>
                Split %
                <input type="range" min={20} max={80} value={compare.split.splitPct} onChange={(e) => onChange((p) => ({ ...p, split: { ...p.split, splitPct: Number(e.target.value) } }))} />
              </label>
            )}
          </>
        ) : (
          <label>
            Opacity
            <input type="range" min={0} max={1} step={0.05} value={compare.overlay.opacity} onChange={(e) => onChange((p) => ({ ...p, overlay: { opacity: Number(e.target.value) } }))} />
          </label>
        )}
      </div>

      <div className="compareTray__selection">
        <strong>{compare.selection.h3 ? `H3 ${compare.selection.h3}` : "No selection"}</strong>
        <span>A: {valueA === null ? "—" : valueA.toFixed(4)}</span>
        <span>B: {valueB === null ? "—" : valueB.toFixed(4)}</span>
        {compare.showDelta && <span>Δ: {delta === null ? "—" : delta.toFixed(4)}</span>}
        <label>
          <input type="checkbox" checked={compare.showDelta} onChange={(e) => onChange((p) => ({ ...p, showDelta: e.target.checked }))} />
          Show Δ
        </label>
      </div>
    </div>
  );
}
