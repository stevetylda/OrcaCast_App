import { useEffect, useId, useMemo, useState } from "react";
import type { ModelInfo } from "../data/dummyModels";

type Props = {
  open: boolean;
  models: ModelInfo[];
  allModels: ModelInfo[];
  selectedIds: string[];
  onAdd: (id: string) => void;
  onClose: () => void;
  onRemove: (id: string) => void;
};

export function CompareModal({ open, models, allModels, selectedIds, onAdd, onClose, onRemove }: Props) {
  const titleId = useId();
  const availableModels = useMemo(
    () => allModels.filter((model) => !selectedIds.includes(model.id)),
    [allModels, selectedIds]
  );
  const [showAddList, setShowAddList] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    setShowAddList(false);
  }, [open]);

  if (!open) return null;
  const cols = Math.min(4, Math.max(2, models.length));

  return (
    <div className="overlay" role="presentation" onClick={onClose}>
      <section
        className="modal modelsCompareModal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
        style={{ ["--compare-cols" as string]: cols }}
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
            {models.map((model, index) => {
              const toneClass = ["modelsCompareCard--teal", "modelsCompareCard--gold", "modelsCompareCard--purple", "modelsCompareCard--blue"][index % 4];
              return (
                <article key={model.id} className={`modelsCompareCard ${toneClass}`.trim()}>
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
                <footer className="modelsCompareCard__footer">
                  <button
                    type="button"
                    className="modelsCompareCard__remove"
                    onClick={() => onRemove(model.id)}
                  >
                    Remove
                  </button>
                </footer>
              </article>
            );
            })}
            <button
              type="button"
              className="modelsCompareAddRail"
              onClick={() => setShowAddList((prev) => !prev)}
              aria-label="Add model"
              disabled={availableModels.length === 0}
            >
              <span className="material-symbols-rounded" aria-hidden="true">
                add
              </span>
            </button>
          </div>
        </div>

        <aside className={`modelsCompareAddPanel ${showAddList ? "isOpen" : ""}`} aria-hidden={!showAddList}>
          <div className="modelsCompareAddPanel__header">
            <div className="modelsCompareAddPanel__title">Add model</div>
            <button
              type="button"
              className="modelsCompareAddPanel__close"
              onClick={() => setShowAddList(false)}
              aria-label="Close add panel"
            >
              <span className="material-symbols-rounded" aria-hidden="true">
                close
              </span>
            </button>
          </div>
          <div className="modelsCompareAddPanel__list" role="list">
            {availableModels.length === 0 ? (
              <div className="modelsCompareAddPanel__empty">No more models available.</div>
            ) : (
              availableModels.map((model) => (
                <button
                  key={model.id}
                  type="button"
                  className="modelsCompareAddPanel__item"
                  onClick={() => {
                    onAdd(model.id);
                    setShowAddList(false);
                  }}
                >
                  {model.name}
                </button>
              ))
            )}
          </div>
        </aside>
      </section>
    </div>
  );
}
