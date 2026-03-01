import { ProbabilityLegend } from "../ProbabilityLegend";
import type { HeatScale } from "../../map/colorScale";
import type { DeltaLegendSpec } from "../../map/deltaMap";

type MapControlsProps = {
  hotspotsEnabled: boolean;
  hasForecastLegend: boolean;
  disableHotspots: boolean;
  legendOpen: boolean;
  legendSpec: HeatScale | null;
  deltaLegend: DeltaLegendSpec | null;
  kdeEnabled: boolean;
  kdeWarning: string | null;
  onHotspotsEnabledChange: (next: boolean) => void;
  onLegendToggle: () => void;
};

export function MapControls({
  hotspotsEnabled,
  hasForecastLegend,
  disableHotspots,
  legendOpen,
  legendSpec,
  deltaLegend,
  kdeEnabled,
  kdeWarning,
  onHotspotsEnabledChange,
  onLegendToggle,
}: MapControlsProps) {
  return (
    <>
      <div className="map__cornerRightBottom" data-tour="legend-controls">
        <div className="legendClusterItem">
          <button
            className={
              hotspotsEnabled
                ? `iconBtn legendClusterBtn legendHotspots legendHotspots--active${(!hasForecastLegend || disableHotspots) ? " legendClusterBtn--disabled" : ""}`
                : `iconBtn legendClusterBtn legendHotspots${(!hasForecastLegend || disableHotspots) ? " legendClusterBtn--disabled" : ""}`
            }
            onClick={() => {
              if (disableHotspots) return;
              onHotspotsEnabledChange(!hotspotsEnabled);
            }}
            aria-label="Toggle hotspots"
            data-tour="hotspots"
            disabled={!hasForecastLegend || disableHotspots}
          >
            <span className="material-symbols-rounded">local_fire_department</span>
          </button>
        </div>
        <button
          className={`iconBtn legendClusterBtn${!hasForecastLegend ? " legendClusterBtn--disabled" : ""}`}
          onClick={onLegendToggle}
          aria-label={legendOpen ? "Hide legend" : "Show legend"}
          data-tour="legend-toggle"
          disabled={!hasForecastLegend}
        >
          <span className="material-symbols-rounded">legend_toggle</span>
        </button>
      </div>
      {legendOpen && <ProbabilityLegend scale={legendSpec} deltaLegend={deltaLegend} />}
      {kdeEnabled && kdeWarning && (
        <div className="map__kdeWarning" role="status" aria-live="polite">
          <span className="material-symbols-rounded" aria-hidden="true">
            warning
          </span>
          <span>{kdeWarning}</span>
        </div>
      )}
    </>
  );
}
