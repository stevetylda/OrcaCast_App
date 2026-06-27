import { useRef, useState } from "react";
import { useMenu } from "../../state/MenuContext";
import { useMapState } from "../../state/MapStateContext";
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
          ref={mapRef}
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
          selectedSourceCellIds={controller.selectedSourceCellIds}
          hoveredSourceCellId={hoveredSourceCellId}
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
