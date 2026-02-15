import type { DataLineageNodeMeta } from "../../pages/data/lineageConfig";
import { getNodeLabel } from "../../pages/data/lineageConfig";

type Props = {
  selectedNode: DataLineageNodeMeta | null;
  className?: string;
  showEmptyState?: boolean;
  onClose?: () => void;
};

function toTitleCase(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function SourceDetailsPanel({
  selectedNode,
  className = "",
  showEmptyState = true,
  onClose,
}: Props) {
  const rootClassName = ["sourceDetails", className].filter(Boolean).join(" ");

  if (!selectedNode) {
    if (!showEmptyState) {
      return null;
    }

    return (
      <aside className={rootClassName} aria-live="polite">
        <div className="sourceDetails__empty">
          <h3>Source Details</h3>
          <p>Select a node to learn more about its role in the OrcaCast data pipeline.</p>
        </div>
      </aside>
    );
  }

  const chips = [
    selectedNode.cadence ? { key: "Cadence", value: selectedNode.cadence } : null,
    selectedNode.coverage ? { key: "Coverage", value: selectedNode.coverage } : null,
    selectedNode.access ? { key: "Access", value: selectedNode.access } : null,
  ].filter(Boolean) as Array<{ key: string; value: string }>;

  return (
    <aside className={rootClassName} aria-live="polite">
      {onClose && (
        <button
          type="button"
          className="sourceDetails__close"
          onClick={onClose}
          aria-label="Close source details"
        >
          <span className="material-symbols-rounded" aria-hidden="true">
            close
          </span>
        </button>
      )}
      <header className="sourceDetails__header">
        <div className="sourceDetails__eyebrow">{toTitleCase(selectedNode.kind)}</div>
        <h3>{selectedNode.label}</h3>
        <div className="sourceDetails__type">Type: {toTitleCase(selectedNode.category)}</div>
      </header>

      <p className="sourceDetails__description">{selectedNode.description}</p>

      {chips.length > 0 && (
        <div className="sourceDetails__chips" aria-label="Node metadata">
          {chips.map((chip) => (
            <span key={chip.key} className="sourceDetails__chip">
              <strong>{chip.key}:</strong> {chip.value}
            </span>
          ))}
        </div>
      )}

      {selectedNode.kind === "processing" && (
        <div className="sourceDetails__ioWrap">
          <div>
            <div className="sourceDetails__ioHeading">Inputs</div>
            <ul className="sourceDetails__list">
              {(selectedNode.inputs ?? []).map((nodeId) => (
                <li key={nodeId}>{getNodeLabel(nodeId)}</li>
              ))}
            </ul>
          </div>
          <div>
            <div className="sourceDetails__ioHeading">Outputs</div>
            <ul className="sourceDetails__list">
              {(selectedNode.outputs ?? []).map((nodeId) => (
                <li key={nodeId}>{getNodeLabel(nodeId)}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {!!selectedNode.attributionLinks?.length && (
        <div className="sourceDetails__links">
          <div className="sourceDetails__ioHeading">Attribution / License</div>
          <ul className="sourceDetails__list">
            {selectedNode.attributionLinks.map((link) => (
              <li key={link.url}>
                <a className="pageLink" href={link.url} target="_blank" rel="noreferrer">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {selectedNode.url && (
        <a className="sourceDetails__button" href={selectedNode.url} target="_blank" rel="noreferrer">
          Open site
        </a>
      )}
    </aside>
  );
}
