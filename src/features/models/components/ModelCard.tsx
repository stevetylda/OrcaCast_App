import type React from "react";
import type { ModelInfo } from "../data/dummyModels";

export type ModelCardProps = {
  model: ModelInfo;
  selected: boolean;
  onToggleCompare: (id: string) => void;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
};

const FAMILY_LABELS: Record<ModelInfo["family"], string> = {
  baseline: "Baseline",
  composite: "Composite",
  hybrid: "Hybrid",
};

export function ModelCard({ model, selected, onToggleCompare, dragHandleProps }: ModelCardProps) {
  return (
    <article className={`modelCardNeo ${selected ? "isSelected" : ""}`}>
      {model.ribbon ? <span className="modelCardNeo__ribbon">{model.ribbon}</span> : null}
      <div className="modelCardNeo__inner">
        <header className="modelCardNeo__header">
          <div>
            <div className="modelCardNeo__name">{model.name}</div>
            <div className="modelCardNeo__family">{FAMILY_LABELS[model.family]}</div>
          </div>
          <div className="modelCardNeo__tags">
            {model.tags.map((tag) => (
              <span className="modelCardNeo__tag" key={tag}>
                {tag}
              </span>
            ))}
          </div>
        </header>

        <div className="modelCardNeo__hero">
          <div className="modelCardNeo__heroLabel">{model.hero.label}</div>
          <div className="modelCardNeo__heroValue">{model.hero.value}</div>
          {model.hero.hint ? <div className="modelCardNeo__heroHint">{model.hero.hint}</div> : null}
        </div>

        <div className="modelCardNeo__rows">
          {model.rows.slice(0, 4).map((row) => (
            <div className="modelCardNeo__row" key={row.key}>
              <span>{row.label}</span>
              <span>{row.value}</span>
            </div>
          ))}
        </div>

        <footer className="modelCardNeo__footer">
          <button
            type="button"
            className={`modelCardNeo__compareBtn ${selected ? "isSelected" : ""}`}
            onClick={() => onToggleCompare(model.id)}
          >
            {selected ? "Remove" : "+ Compare"}
          </button>
          <button
            type="button"
            className="modelCardNeo__dragHandle"
            aria-label={`Drag ${model.name} to compare tray`}
            {...dragHandleProps}
          >
            ⠿
          </button>
        </footer>
      </div>
    </article>
  );
}
