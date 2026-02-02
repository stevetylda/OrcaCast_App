import { useEffect, useId } from "react";
import { attribution } from "../config/attribution";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function InfoModal({ open, onClose }: Props) {
  const titleId = useId();
  const sourcesCount = attribution.sources?.length ?? 0;

  // Escape closes modal (tiny UX win)
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="overlay" onClick={onClose} role="presentation">
      <section
        className="modal"
        onClick={(ev) => ev.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="modal__header">
          <div className="modal__title" id={titleId}>
            About / Learn More
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
          <h3>What is OrcaCast?</h3>
          <p>
            OrcaCast is a short-term forecast of where orca sightings are more likely to be{" "}
            <strong>reported</strong> during the selected window. Hotter cells indicate{" "}
            <strong>higher relative likelihood</strong> within the same period.
          </p>
          <p>
            Forecasts are not guarantees and do not show real-time whale locations. Results may
            reflect <strong>observer effort</strong>, weather, and other factors.
          </p>

          <h3>How to use this</h3>
          <ul className="modal__bullets">
            <li>
              <strong>Hex cells:</strong> the forecast surface.
            </li>
            <li>
              <strong>Points (optional):</strong> reported sightings for the selected/previous
              period.
            </li>
            <li>
              Use the toggle to switch between <strong>Observed</strong> and{" "}
              <strong>Forecast</strong> point views.
            </li>
          </ul>

          <p>
            <strong>Resolution:</strong> H4 = broad scan, H5 = regional focus, H6 = local hotspots
            (more detail, more noise). Start at <strong>H4/H5</strong>, then zoom into{" "}
            <strong>H6</strong>.
          </p>

          <details className="modal__sources">
            <summary
              className="modal__sourcesSummary"
              aria-label={`Sources (${sourcesCount})`}
            >
              <span>Sources</span>
              <span className="modal__sourcesMeta">({sourcesCount})</span>
              <span
                className="material-symbols-rounded modal__sourcesChevron"
                aria-hidden="true"
              >
                expand_more
              </span>
            </summary>

            <div className="modal__sourcesBody">
              <div className="modal__sourcesGrid">
                <div className="modal__sourcesGroup" aria-label="Basemap sources">
                  <div className="modal__sourcesGroupTitle">Basemap</div>
                  <ul className="modal__sourceList">
                    <li>
                      <a
                        className="modal__link"
                        href="https://www.openstreetmap.org/copyright"
                        target="_blank"
                        rel="noreferrer"
                      >
                        OpenStreetMap contributors
                      </a>
                    </li>
                    <li>
                      <a
                        className="modal__link"
                        href="https://carto.com/attributions"
                        target="_blank"
                        rel="noreferrer"
                      >
                        CARTO basemaps
                      </a>
                    </li>
                  </ul>
                </div>

                <div className="modal__sourcesGroup" aria-label="Sighting data sources">
                  <div className="modal__sourcesGroupTitle">Sightings</div>
                  <ul className="modal__sourceList">
                    <li>
                      <a
                        className="modal__link"
                        href="https://acartia.io/home"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Acartia
                      </a>
                    </li>
                    <li>
                      <a
                        className="modal__link"
                        href="https://www.whalemuseum.org/"
                        target="_blank"
                        rel="noreferrer"
                      >
                        The Whale Museum
                      </a>
                    </li>
                    <li>
                      <a
                        className="modal__link"
                        href="https://www.inaturalist.org/"
                        target="_blank"
                        rel="noreferrer"
                      >
                        iNaturalist
                      </a>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="modal__sourcesFooter">
                <a className="modal__link modal__learnMore" href="/about" onClick={onClose}>
                  Go to About page
                  <span className="material-symbols-rounded modal__linkIcon" aria-hidden="true">
                    arrow_forward
                  </span>
                </a>
                <div className="modal__sourcesNote">Links open in a new tab.</div>
              </div>
            </div>
          </details>

          <div className="modal__callout" role="note" aria-label="Responsible use">
            <span className="material-symbols-rounded modal__calloutIcon" aria-hidden="true">
              warning
            </span>
            <div className="modal__calloutText">
              <strong>Responsible use:</strong> Follow local wildlife guidance and keep a
              respectful distance. OrcaCast is for education and planning — not navigation or
              enforcement.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
