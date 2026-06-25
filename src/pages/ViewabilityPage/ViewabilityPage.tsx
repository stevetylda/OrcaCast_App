import { useMenu } from "../../state/MenuContext";
import { useMapState } from "../../state/MapStateContext";
import { ViewabilityBottomDrawer } from "./components/ViewabilityBottomDrawer";
import { ViewabilityLegend } from "./components/ViewabilityLegend";
import { ViewabilityMap } from "./components/ViewabilityMap";
import { ViewabilitySettingsPanel } from "./components/ViewabilitySettingsPanel";
import { ViewabilityTopControls } from "./components/ViewabilityTopControls";
import { useViewabilityPageController } from "./useViewabilityPageController";

export function ViewabilityPage() {
  const controller = useViewabilityPageController();
  const { setMenuOpen } = useMenu();
  const { darkMode, setThemeMode } = useMapState();

  return (
    <div className="mapPageRoot viewabilityPage">
      <header className="header viewabilityHeader">
        <div className="header__left">
          <button className="iconBtn iconBtn--menu" type="button" onClick={() => setMenuOpen(true)} aria-label="Menu">
            <span className="material-symbols-rounded" aria-hidden="true">
              menu
            </span>
          </button>
          <button type="button" className="brand brandBtn" aria-label="Reset viewability selection" onClick={controller.resetSelection}>
            <div className="brand__title">
              OrcaCast <span className="brand__subtitle">- Viewability</span>
            </div>
          </button>
        </div>

        <div className="header__right viewabilityHeader__right">
          <ViewabilityTopControls
            selectedDateOrPeriod={controller.selectedDateOrPeriod}
            availableDates={controller.availableDates}
            onSelectedDateOrPeriodChange={controller.setSelectedDateOrPeriod}
            scoreType={controller.scoreType}
            onScoreTypeChange={controller.setScoreType}
            selectedSourceCellId={controller.selectedSourceCellId}
            onResetSelection={controller.resetSelection}
          />
          <button
            className="iconBtn"
            type="button"
            onClick={() => setThemeMode(darkMode ? "light" : "dark")}
            aria-label="Toggle dark mode"
            title="Dark/Light Mode"
          >
            <span className="material-symbols-rounded" aria-hidden="true">
              {darkMode ? "light_mode" : "dark_mode"}
            </span>
          </button>
        </div>
      </header>

      <main className="app__main">
        <ViewabilityMap
          key={darkMode ? "viewability-map-dark" : "viewability-map-light"}
          darkMode={darkMode}
          targetCells={controller.targetCells}
          sourceCells={controller.sourceCells}
          selectedVisibility={controller.selectedVisibility}
          mode={controller.mapMode}
          scoreType={controller.scoreType}
          showTargetCells={controller.showTargetCells}
          showSourceCells={controller.showSourceCells}
          selectedSourceCellId={controller.selectedSourceCellId}
          colorScaleSettings={controller.colorScaleSettings}
          poiFilters={controller.poiFilters}
          onSelectSourceCell={controller.selectSourceCell}
        />

        <ViewabilitySettingsPanel
          open={controller.settingsOpen}
          settings={controller.colorScaleSettings}
          showTargetCells={controller.showTargetCells}
          showSourceCells={controller.showSourceCells}
          poiFilters={controller.poiFilters}
          onChange={controller.setColorScale}
          onToggleTargetCells={controller.toggleTargetCells}
          onToggleSourceCells={controller.toggleSourceCells}
          onTogglePoiAll={controller.togglePoiAll}
          onTogglePoiType={controller.togglePoiType}
          onToggleOpen={() => controller.setSettingsOpen(!controller.settingsOpen)}
          onClose={() => controller.setSettingsOpen(false)}
        />

        <ViewabilityLegend
          scoreType={controller.scoreType}
          settings={controller.colorScaleSettings}
          inspectorMode={controller.mapMode === "source-inspector"}
        />

        {controller.loading && <div className="viewabilityMapNotice">Loading viewability data...</div>}
        {controller.error && <div className="viewabilityMapNotice viewabilityMapNotice--error">{controller.error}</div>}

        <ViewabilityBottomDrawer
          open={controller.bottomDrawerOpen}
          onToggleOpen={() => controller.setBottomDrawerOpen(!controller.bottomDrawerOpen)}
          activeTab={controller.analysisTab}
          onTabChange={controller.setAnalysisTab}
          points={controller.areaConditions}
          selectedDate={controller.selectedDateOrPeriod}
          scoreType={controller.scoreType}
          sourceCellId={controller.selectedSourceCellId}
          sourceTimeSeries={controller.selectedSourceTimeSeries}
        />

      </main>
    </div>
  );
}
