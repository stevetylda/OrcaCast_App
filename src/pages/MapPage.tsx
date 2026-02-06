import { useEffect, useMemo, useState, lazy, Suspense } from "react";
import { AppHeader } from "../components/AppHeader";
import { AppFooter } from "../components/AppFooter";
import { ToolDrawer } from "../components/ToolDrawer";
import { WelcomeModal } from "../components/WelcomeModal";

import { ForecastMap } from "../components/ForecastMap";
// import { InfoModal } from "../components/InfoModal";
// import { TimeseriesModal } from "../components/modals/TimeseriesModal";

// const ForecastMap = lazy(() =>
//   import("../components/ForecastMap").then((m) => ({ default: m.ForecastMap }))
// );

const InfoModal = lazy(() =>
  import("../components/InfoModal").then((m) => ({ default: m.InfoModal }))
);

const TimeseriesModal = lazy(() =>
  import("../components/modals/TimeseriesModal").then((m) => ({ default: m.TimeseriesModal }))
);


import { appConfig, formatForecastPeriod } from "../config/appConfig";
import { getForecastPathForPeriod } from "../config/dataPaths";
import {
  forecastPeriodToIsoWeek,
  forecastPeriodToIsoWeekYear,
} from "../core/time/forecastPeriodToIsoWeek";
import { loadPeriods } from "../data/periods";
import type { Period } from "../data/periods";
import { useMenu } from "../state/MenuContext";
import { useMapState } from "../state/MapStateContext";
import { startMapTour } from "../tour/startMapTour";

type LastWeekMode = "none" | "previous" | "selected" | "both";
type NonNoneLastWeekMode = Exclude<LastWeekMode, "none">;

export function MapPage() {
  const {
    darkMode,
    themeMode,
    setThemeMode,
    resolution,
    setResolution,
    modelId,
    setModelId,
    forecastIndex,
    setForecastIndex,
    lastWeekMode,
    setLastWeekMode,
  } = useMapState();

  const { setMenuOpen } = useMenu();

  const [infoOpen, setInfoOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [timeseriesOpen, setTimeseriesOpen] = useState(false);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [poiOpen, setPoiOpen] = useState(false);
  const [periods, setPeriods] = useState<Period[]>([]);

  const modelVersion = useMemo(() => "vPhase2", []);
  const showLastWeek = lastWeekMode !== "none";

  useEffect(() => {
    const seen = localStorage.getItem("orcacast.welcome.seen");
    if (!seen) {
      setWelcomeOpen(true);
      localStorage.setItem("orcacast.welcome.seen", "true");
    }
  }, []);

  useEffect(() => {
    let active = true;
    loadPeriods()
      .then((list) => {
        if (!active) return;
        setPeriods(list);
        if (list.length > 0) {
          // If forecastIndex is "unset", snap to latest
          setForecastIndex((idx) => (idx < 0 ? list.length - 1 : idx));
        }
      })
      .catch(() => {
        if (!active) return;
        setPeriods([]);
      });

    return () => {
      active = false;
    };
  }, [setForecastIndex]);

  useEffect(() => {
    if (periods.length === 0) return;
    setForecastIndex((idx) => (idx >= periods.length ? periods.length - 1 : idx));
  }, [periods, setForecastIndex]);

  const selectedForecast = useMemo(
    () => (forecastIndex >= 0 && forecastIndex < periods.length ? periods[forecastIndex] : null),
    [forecastIndex, periods]
  );

  const forecastPeriodText = useMemo(
    () => selectedForecast?.label ?? formatForecastPeriod(appConfig.forecastPeriod),
    [selectedForecast]
  );

  const forecastPath = useMemo(
    () =>
      selectedForecast ? getForecastPathForPeriod(resolution, selectedForecast.fileId) : undefined,
    [resolution, selectedForecast]
  );

  const latestForecastPath = useMemo(() => {
    if (periods.length === 0) return undefined;
    const latest = periods[periods.length - 1];
    return getForecastPathForPeriod(resolution, latest.fileId);
  }, [periods, resolution]);

  const currentWeek = useMemo(
    () => selectedForecast?.stat_week ?? forecastPeriodToIsoWeek(appConfig.forecastPeriod),
    [selectedForecast]
  );

  const currentWeekYear = useMemo(
    () => selectedForecast?.year ?? forecastPeriodToIsoWeekYear(appConfig.forecastPeriod),
    [selectedForecast]
  );

  return (
    <>
      <AppHeader
        title="OrcaCast"
        subtitle="Orca Sightings Forecast"
        forecastPeriods={periods}
        forecastIndex={Math.max(0, forecastIndex)}
        onForecastIndexChange={setForecastIndex}
        resolution={resolution}
        onResolutionChange={setResolution}
        darkMode={darkMode}
        onToggleDarkMode={() => setThemeMode(themeMode === "dark" ? "light" : "dark")}
        onOpenInfo={() => setInfoOpen(true)}
        onOpenMenu={() => setMenuOpen(true)}
      />

      <main className="app__main">
        {/* <Suspense fallback={<div className="mapStage mapLoading">Loading map…</div>}> */}
        <ForecastMap
          darkMode={darkMode}
          resolution={resolution}
          showLastWeek={showLastWeek}
          lastWeekMode={lastWeekMode}
          showPoi={poiOpen}
          selectedWeek={currentWeek}
          selectedWeekYear={currentWeekYear}
          timeseriesOpen={timeseriesOpen}
          forecastPath={forecastPath}
          fallbackForecastPath={latestForecastPath}
        />
        {/* </Suspense> */}


        <ToolDrawer
          open={toolsOpen}
          onToggle={() => setToolsOpen((v) => !v)}
          onClose={() => setToolsOpen(false)}
          onSelectLastWeek={(mode: NonNoneLastWeekMode) => {
            // ✅ setLastWeekMode in your context appears to accept a VALUE, not an updater fn.
            // So compute next from current `lastWeekMode` in scope.
            const prev = lastWeekMode as LastWeekMode;

            let next: LastWeekMode;
            if (prev === "none") next = mode;
            else if (prev === mode) next = "none";
            else if (prev === "both") next = mode === "previous" ? "selected" : "previous";
            else next = "both";

            setLastWeekMode(next);
          }}
          lastWeekMode={lastWeekMode}
          showLastWeek={showLastWeek}
          onToggleHistoric={() => alert("Historic presence toggle")}
          onOpenTimeseries={() => setTimeseriesOpen(true)}
          onToggleParks={() => setPoiOpen((v) => !v)}
          onTogglePod={() => alert("Pod selector toggle")}
        />

        <div className="app__footer">
          <AppFooter modelVersion={modelVersion} modelId={modelId} onModelChange={setModelId} />
        </div>
      </main>

      <Suspense fallback={<div className="modalLoading">Loading…</div>}>
        {welcomeOpen && (
          <WelcomeModal
            open={welcomeOpen}
            onClose={() => setWelcomeOpen(false)}
            onStartTour={() => startMapTour()}
            onLearnMore={() => {
              setWelcomeOpen(false);
              setInfoOpen(true);
            }}
          />
        )}

        {infoOpen && (
          <InfoModal
            open={infoOpen}
            onClose={() => setInfoOpen(false)}
            onStartTour={() => startMapTour()}
          />
        )}

        {timeseriesOpen && (
          <TimeseriesModal
            open={timeseriesOpen}
            onClose={() => setTimeseriesOpen(false)}
            darkMode={darkMode}
            currentWeek={currentWeek}
            forecastPeriodLabel={forecastPeriodText}
            forecastPath={forecastPath}
            resolution={resolution}
          />
        )}
      </Suspense>


    </>
  );
}
