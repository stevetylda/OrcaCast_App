import { attribution } from "../config/attribution";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function InfoModal({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <div className="overlay" onClick={onClose} role="presentation">
      <section className="modal" onClick={(e) => e.stopPropagation()} aria-label="About OrcaCast">
        <div className="modal__header">
          <div className="modal__title">About / Learn More</div>
          <button className="iconBtn iconBtn--ghost" onClick={onClose} aria-label="Close">
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>

        <div className="modal__body">
          <p>
            OrcaCast shows a short-term forecast of likely orca sightings based on modeled
            habitat suitability. Forecast periods indicate the time window the model
            summarizes (weekly or daily).
          </p>
          <p>
            Resolution (H4/H5/H6) reflects spatial granularity: higher numbers indicate more
            detailed local cells while lower numbers represent broader regional likelihoods.
          </p>
          <p>
            Data sources are currently served from static JSON outputs and will be updated as
            new model runs are published.
          </p>
          <p className="modal__attrib">Basemap attribution: {attribution.inlineText}</p>
          <div className="modal__attrib">
            Sources:
            <ul className="modal__attribList">
              {attribution.sources.map((source) => (
                <li key={source}>{source}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
