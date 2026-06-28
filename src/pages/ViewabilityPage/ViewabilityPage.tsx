import { useRef, useState } from "react";
import { useMenu } from "../../state/MenuContext";
import { useMapState } from "../../state/MapStateContext";
import { ViewabilityAreaSelectionModal } from "./components/ViewabilityAreaSelectionModal";
import { ViewabilityBottomDrawer } from "./components/ViewabilityBottomDrawer";
import { ViewabilityFooter } from "./components/ViewabilityFooter";
import { ViewabilityLegend } from "./components/ViewabilityLegend";
import { ViewabilityMap, type ViewabilityMapHandle } from "./components/ViewabilityMap";
import { ViewabilitySettingsPanel } from "./components/ViewabilitySettingsPanel";
import { ViewabilityTopControls } from "./components/ViewabilityTopControls";
import { useViewabilityPageController } from "./useViewabilityPageController";

export function ViewabilityPage() {
  const controller = useViewabilityPageController();
  const { setMenuOpen } = useMenu();
  const { darkMode, setThemeMode } = useMapState();
  const mapRef = useRef<ViewabilityMapHandle | null>(null);
  const [shareBusy, setShareBusy] = useState(false);
  const [hoveredSourceCellId, setHoveredSourceCellId] = useState<string | null>(null);

  const selectedDateToken = controller.selectedDateOrPeriod.replace(/[^0-9-]+/g, "_");

  const captureSnapshot = async () => {
    const blob = await mapRef.current?.captureSnapshot();
    if (!blob) throw new Error("Snapshot not available");
    return blob;
  };

  const downloadSnapshot = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const handleDownloadSnapshot = async () => {
    if (shareBusy) return;
    setShareBusy(true);
    try {
      const blob = await captureSnapshot();
      downloadSnapshot(blob, `orcacast_viewability_${selectedDateToken}.png`);
    } catch (error) {
      console.error("[Viewability Download] Snapshot failed", error);
    } finally {
      setShareBusy(false);
    }
  };

  const handleShareSnapshot = async () => {
    if (shareBusy) return;
    setShareBusy(true);
    try {
      const blob = await captureSnapshot();
      const fileName = `orcacast_viewability_${selectedDateToken}.png`;
      const snapshotFile = new File([blob], fileName, { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (data?: ShareData) => boolean };
      const canNativeShareFiles =
        typeof nav.share === "function" &&
        (typeof nav.canShare !== "function" || nav.canShare({ files: [snapshotFile] }));

      if (canNativeShareFiles) {
        await nav.share({
          files: [snapshotFile],
          title: "OrcaCast Viewability Snapshot",
        });
      } else {
        downloadSnapshot(blob, fileName);
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        console.error("[Viewability Share] Snapshot failed", error);
      }
    } finally {
      setShareBusy(false);
    }
  };

  const handleAreaSelectionSelect = () => {
    mapRef.current?.confirmAreaSelection();
  };

  const handleAreaSelectionClear = () => {
    mapRef.current?.clearAreaSelection();
    controller.setAreaSelectionMetrics(0, false);
    controller.resetSelection();
  };

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
            hasSelection={controller.selectedSourceCellIds.length > 0 || controller.selectedTargetCellIds.length > 0}
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
          ref={mapRef}
          key={darkMode ? "viewability-map-dark" : "viewability-map-light"}
          darkMode={darkMode}
          targetCells={controller.targetCells}
          sourceCells={controller.sourceCells}
          selectedTargetVisibility={controller.selectedVisibility}
          selectedSourceVisibility={controller.selectedTargetSources}
          mode={controller.mapMode}
          scoreType={controller.scoreType}
          showTargetCells={controller.showTargetCells}
          showSourceCells={controller.showSourceCells}
          selectedSourceCellId={controller.selectedSourceCellId}
          selectedSourceCellIds={controller.selectedSourceCellIds}
          selectedTargetCellIds={controller.selectedTargetCellIds}
          hoveredSourceCellId={hoveredSourceCellId}
          colorScaleSettings={controller.colorScaleSettings}
          poiFilters={controller.poiFilters}
          selectionMode={controller.selectionMode}
          areaSelectionTool={controller.areaSelectionTool}
          drawSelectionKind={controller.drawSelectionKind}
          onAreaSelectionMetricsChange={controller.setAreaSelectionMetrics}
          onSelectSourceCell={controller.selectSourceCell}
          onSelectSourceCells={controller.selectSourceCells}
          onSelectTargetCell={controller.selectTargetCell}
          onSelectTargetCells={controller.selectTargetCells}
        />

        <ViewabilitySettingsPanel
          open={controller.settingsOpen}
          settings={controller.colorScaleSettings}
          showTargetCells={controller.showTargetCells}
          showSourceCells={controller.showSourceCells}
          selectionMode={controller.selectionMode}
          drawSelectionKind={controller.drawSelectionKind}
          poiFilters={controller.poiFilters}
          onChange={controller.setColorScale}
          onToggleTargetCells={controller.toggleTargetCells}
          onToggleSourceCells={controller.toggleSourceCells}
          onSelectCellMode={controller.closeAreaSelection}
          onSelectAreaMode={controller.openAreaSelection}
          onTogglePoiAll={controller.togglePoiAll}
          onTogglePoiType={controller.togglePoiType}
          onToggleOpen={() => controller.setSettingsOpen(!controller.settingsOpen)}
          onClose={() => controller.setSettingsOpen(false)}
        />

        <ViewabilityAreaSelectionModal
          open={controller.selectionMode === "area"}
          targetLabel={controller.drawSelectionKind}
          tool={controller.areaSelectionTool}
          areaKm2={controller.areaSelectionAreaKm2}
          ready={controller.areaSelectionReady}
          onToolChange={controller.setAreaSelectionTool}
          onClear={handleAreaSelectionClear}
          onClose={controller.closeAreaSelection}
          onSelect={handleAreaSelectionSelect}
        />

        <ViewabilityLegend
          scoreType={controller.scoreType}
          settings={controller.colorScaleSettings}
          inspectorMode={controller.mapMode !== "overview"}
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
          sourceCellIds={controller.selectedSourceCellIds}
          sourceTimeSeriesBySource={controller.selectedSourceTimeSeriesBySource}
          hoveredSourceCellId={hoveredSourceCellId}
          onHoverSourceCell={setHoveredSourceCellId}
        />
      </main>
      <div className="app__footer">
        <ViewabilityFooter
          onDownloadSnapshot={handleDownloadSnapshot}
          onShareSnapshot={handleShareSnapshot}
          shareBusy={shareBusy}
        />
      </div>
    </div>
  );
}
