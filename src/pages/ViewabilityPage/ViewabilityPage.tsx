import { useMenu } from "../../state/MenuContext";
import { useMapState } from "../../state/MapStateContext";
import { ViewabilityBottomDrawer } from "./components/ViewabilityBottomDrawer";
import { ViewabilityInspectorPanel } from "./components/ViewabilityInspectorPanel";
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
            onSelectedDateOrPeriodChange={controller.setSelectedDateOrPeriod}
            scoreType={controller.scoreType}
            onScoreTypeChange={controller.setScoreType}
            showTargetCells={controller.showTargetCells}
            showSourceCells={controller.showSourceCells}
            onToggleTargetCells={controller.toggleTargetCells}
            onToggleSourceCells={controller.toggleSourceCells}
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
          targetCells={controller.targetCells}
          sourceCells={controller.sourceCells}
          selectedVisibility={controller.selectedVisibility}
          mode={controller.mapMode}
          scoreType={controller.scoreType}
          showTargetCells={controller.showTargetCells}
          showSourceCells={controller.showSourceCells}
          selectedSourceCellId={controller.selectedSourceCellId}
          colorScaleSettings={controller.colorScaleSettings}
          onSelectSourceCell={controller.selectSourceCell}
        />

        <ViewabilitySettingsPanel
          open={controller.settingsOpen}
          settings={controller.colorScaleSettings}
          onChange={controller.setColorScale}
          onToggleOpen={() => controller.setSettingsOpen(!controller.settingsOpen)}
          onClose={() => controller.setSettingsOpen(false)}
        />

        <ViewabilityLegend
          scoreType={controller.scoreType}
          settings={controller.colorScaleSettings}
          inspectorMode={controller.mapMode === "source-inspector"}
        />

        {controller.loading && <div className="viewabilityMapNotice">Loading viewability fixtures...</div>}
        {controller.error && <div className="viewabilityMapNotice viewabilityMapNotice--error">{controller.error}</div>}

        <ViewabilityInspectorPanel
          source={controller.selectedSourceSummary}
          conditions={controller.selectedSourceConditions}
          visibility={controller.selectedVisibility}
          timeSeries={controller.selectedSourceTimeSeries}
          onClose={controller.resetSelection}
        />

        <ViewabilityBottomDrawer
          open={controller.bottomDrawerOpen}
          onToggleOpen={() => controller.setBottomDrawerOpen(!controller.bottomDrawerOpen)}
          bins={controller.relationshipBins}
          source={controller.selectedSourceSummary}
          visibility={controller.selectedVisibility}
        />

        <div className="viewabilityStatusBar" role="status">
          <span>{controller.mapMode === "source-inspector" ? "Source inspector" : "Overview"}</span>
          <span>{controller.selectedSourceCellId ?? "No source selected"}</span>
          <span>{controller.targetCells?.features.length ?? 0} target cells</span>
          <span>{controller.sourceCells?.features.length ?? 0} source cells</span>
        </div>
      </main>
    </div>
  );
}
