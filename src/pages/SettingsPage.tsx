import { PageShell } from "../components/PageShell";
import { useMapState } from "../state/MapStateContext";

export function SettingsPage() {
  const {
    themeMode,
    setThemeMode,
    resolution,
    setResolution,
    layerMode,
    setLayerMode,
    ecotype,
    setEcotype,
    pointsVisible,
    setPointsVisible,
  } = useMapState();

  return (
    <PageShell title="Settings">
      <section className="pageSection">
        <h2>Theme</h2>
        <div className="pageControlRow">
          {(["light", "dark", "system"] as const).map((mode) => (
            <button
              key={mode}
              className={`pageToggle${themeMode === mode ? " pageToggle--active" : ""}`}
              type="button"
              onClick={() => setThemeMode(mode)}
              aria-pressed={themeMode === mode}
            >
              {mode === "light" ? "Light" : mode === "dark" ? "Dark" : "System"}
            </button>
          ))}
        </div>
      </section>

      <section className="pageSection">
        <h2>Default resolution</h2>
        <div className="pageControlRow">
          {(["H4", "H5", "H6"] as const).map((value) => (
            <button
              key={value}
              className={`pageToggle${resolution === value ? " pageToggle--active" : ""}`}
              type="button"
              onClick={() => setResolution(value)}
              aria-pressed={resolution === value}
            >
              {value}
            </button>
          ))}
        </div>
      </section>

      <section className="pageSection">
        <h2>Default view</h2>
        <div className="pageControlRow">
          {(["observed", "forecast"] as const).map((value) => (
            <button
              key={value}
              className={`pageToggle${layerMode === value ? " pageToggle--active" : ""}`}
              type="button"
              onClick={() => setLayerMode(value)}
              aria-pressed={layerMode === value}
            >
              {value === "observed" ? "Observed" : "Forecast"}
            </button>
          ))}
        </div>
      </section>

      <section className="pageSection">
        <h2>Color scale</h2>
        <div className="pageControlRow">
          <button className="pageToggle pageToggle--active" type="button" aria-pressed>
            Default
          </button>
          <button className="pageToggle" type="button" aria-pressed={false}>
            Colorblind-friendly
          </button>
        </div>
        <p className="pageNote">Color scale selection will sync to the map in a future update.</p>
      </section>

      <section className="pageSection">
        <h2>Display</h2>
        <div className="pageControlRow">
          <button
            className={`pageToggle${pointsVisible ? " pageToggle--active" : ""}`}
            type="button"
            onClick={() => setPointsVisible(!pointsVisible)}
            aria-pressed={pointsVisible}
          >
            Points {pointsVisible ? "On" : "Off"}
          </button>
        </div>
      </section>

      <section className="pageSection">
        <h2>Ecotype</h2>
        <div className="pageControlRow">
          {(["srkw", "transient", "both"] as const).map((value) => (
            <button
              key={value}
              className={`pageToggle${ecotype === value ? " pageToggle--active" : ""}`}
              type="button"
              onClick={() => setEcotype(value)}
              aria-pressed={ecotype === value}
            >
              {value === "srkw" ? "SRKW" : value === "transient" ? "Transient" : "Both"}
            </button>
          ))}
        </div>
      </section>

      <section className="pageSection">
        <h2>Cache</h2>
        <div className="pageControlRow">
          <button className="pageAction" type="button">
            Clear cache
          </button>
        </div>
      </section>
    </PageShell>
  );
}
