import { AttributionHover } from "../../../components/AttributionHover";

type Props = {
  onShareSnapshot?: () => void;
  onDownloadSnapshot?: () => void;
  shareBusy?: boolean;
};

const VIEWABILITY_SOURCES = [
  "DEM",
  "CHM",
  "Weather",
  "OpenStreetMap",
  "Stadia Maps",
];

export function ViewabilityFooter({
  onShareSnapshot,
  onDownloadSnapshot,
  shareBusy = false,
}: Props) {
  return (
    <div className="footer">
      <div className="footer__row" role="group" aria-label="Viewability actions">
        <div className="footer__rightCluster">
          <AttributionHover
            className="footer__pill footer__pill--sources"
            sources={VIEWABILITY_SOURCES}
          />
          <div className="footer__pill footer__iconPill" aria-label="Snapshot actions" role="group">
            <button
              type="button"
              className="footer__iconPillButton"
              onClick={onDownloadSnapshot}
              disabled={shareBusy || !onDownloadSnapshot}
              title="Download snapshot"
              aria-label={shareBusy ? "Preparing snapshot" : "Download snapshot"}
            >
              <span className="material-symbols-rounded" aria-hidden="true">
                download
              </span>
            </button>
            <button
              type="button"
              className="footer__iconPillButton"
              onClick={onShareSnapshot}
              disabled={shareBusy || !onShareSnapshot}
              title="Share snapshot"
              aria-label={shareBusy ? "Preparing snapshot" : "Share snapshot"}
            >
              <span className="material-symbols-rounded" aria-hidden="true">
                ios_share
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
