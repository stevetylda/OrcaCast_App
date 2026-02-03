import { useEffect, useId } from "react";
import type { ModelInfo } from "../data/dummyModels";

type Props = {
  open: boolean;
  models: ModelInfo[];
  onClose: () => void;
  onRemove: (id: string) => void;
};

export function CompareModal({ open, models, onClose, onRemove }: Props) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="overlay" role="presentation" onClick={onClose}>
      <section
        className="modal modelsCompareModal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal__header">
          <div className="modal__title" id={titleId}>
            Compare models
          </div>
          <button
            className="iconBtn iconBtn--ghost"
            onClick={onClose}
            aria-label="Close"
            type="button"
          >
            <span className="material-symbols-rounded" aria-hidden="true">
              close
            </span>
          </button>
        </div>

        <div className="modal__body">
          {models.length < 2 ? (
            <div className="modelsCompareModal__notice">
              Select at least two models to compare.
            </div>
          ) : null}
          <div className="modelsCompareGrid">
            {models.map((model) => (
              <article key={model.id} className="modelsCompareCard">
                <header className="modelsCompareCard__header">
                  <div>
                    <div className="modelsCompareCard__name">{model.name}</div>
                    <div className="modelsCompareCard__tags">
                      <span className="modelsCompareCard__tag">{model.family}</span>
                      {model.tags.map((tag) => (
                        <span key={tag} className="modelsCompareCard__tag">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="modelsCompareCard__remove"
                    onClick={() => onRemove(model.id)}
                  >
                    Remove
                  </button>
                </header>

                <div className="modelsCompareCard__hero">
                  <div className="modelsCompareCard__heroLabel">{model.hero.label}</div>
                  <div className="modelsCompareCard__heroValue">{model.hero.value}</div>
                  {model.hero.hint ? (
                    <div className="modelsCompareCard__heroHint">{model.hero.hint}</div>
                  ) : null}
                </div>

                <div className="modelsCompareCard__rows">
                  {model.rows.map((row) => (
                    <div key={row.key} className="modelsCompareCard__row">
                      <span>
                        {row.label}
                        {row.hint ? <em>{row.hint}</em> : null}
                      </span>
                      <span>{row.value}</span>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
