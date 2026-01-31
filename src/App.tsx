import { useMemo, useState } from "react";
import { AppHeader } from "./components/AppHeader";
import { AppFooter } from "./components/AppFooter";
import { ForecastMap } from "./components/ForecastMap";
import { ToolDrawer } from "./components/ToolDrawer";
import { SideDrawer } from "./components/SideDrawer";
import { InfoModal } from "./components/InfoModal";
import { TimeseriesModal } from "./components/modals/TimeseriesModal";
import { appConfig, formatForecastPeriod } from "./config/appConfig";
import type { H3Resolution } from "./config/dataPaths";
import { forecastPeriodToIsoWeek } from "./core/time/forecastPeriodToIsoWeek";
import "./styles.css";

type Resolution = H3Resolution;

export default function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [resolution, setResolution] = useState<Resolution>("H6");
  const [modelId, setModelId] = useState("best");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [showLastWeek, setShowLastWeek] = useState(false);
  const [timeseriesOpen, setTimeseriesOpen] = useState(false);
  const modelVersion = useMemo(() => "vPhase2", []);
  const forecastPeriodText = useMemo(
    () => formatForecastPeriod(appConfig.forecastPeriod),
    []
  );
  const currentWeek = useMemo(
    () => forecastPeriodToIsoWeek(appConfig.forecastPeriod),
    []
  );

  return (
    <div className={darkMode ? "app app--dark" : "app"}>
      <AppHeader
        title="OrcaCast"
        subtitle="Orca Sightings Forecast"
        forecastPeriodText={forecastPeriodText}
        resolution={resolution}
        onResolutionChange={setResolution}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((v) => !v)}
        onOpenInfo={() => setInfoOpen(true)}
        onOpenMenu={() => setDrawerOpen(true)}
      />

      <main className="app__main">
        <ForecastMap
          darkMode={darkMode}
          resolution={resolution}
          showLastWeek={showLastWeek}
          timeseriesOpen={timeseriesOpen}
        />

        <ToolDrawer
          open={toolsOpen}
          onToggle={() => setToolsOpen((v) => !v)}
          onClose={() => setToolsOpen(false)}
          onToggleLastWeek={() => setShowLastWeek((v) => !v)}
          onToggleHistoric={() => alert("Historic presence toggle")}
          onOpenTimeseries={() => setTimeseriesOpen(true)}
          onToggleParks={() => alert("Parks/POI toggle")}
          onTogglePod={() => alert("Pod selector toggle")}
        />

        <div className="app__footer">
          <AppFooter
            modelVersion={modelVersion}
            modelId={modelId}
            onModelChange={setModelId}
          />
        </div>
      </main>

      <SideDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <InfoModal open={infoOpen} onClose={() => setInfoOpen(false)} />
      <TimeseriesModal
        open={timeseriesOpen}
        onClose={() => setTimeseriesOpen(false)}
        darkMode={darkMode}
        currentWeek={currentWeek}
        forecastPeriodLabel={forecastPeriodText}
        resolution={resolution}
      />
    </div>
  );
}
