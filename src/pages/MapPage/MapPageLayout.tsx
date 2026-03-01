import { AppHeader } from "../../components/AppHeader";
import { AppFooter } from "../../components/AppFooter";
import { ToolDrawer } from "../../components/ToolDrawer";
import { ForecastMap } from "../../components/ForecastMap";
import { SwipeComparePills } from "../../components/Compare/SwipeComparePills";
import { DualMapCompare } from "../../components/Compare/DualMapCompare";
import { SingleSwipeMap } from "../../components/Compare/SingleSwipeMap";
import { MapPageFailureState } from "./MapPageFailureState";
import { trackRender } from "../../debug/perf";
import type { NonNoneLastWeekMode } from "./types";
import type { MapPageController } from "./useMapPageController";

type MapPageLayoutProps = {
  controller: MapPageController;
};

export function MapPageLayout({ controller }: MapPageLayoutProps) {
  trackRender("MapPageLayout");
  const {
    primaryMapRef,
    darkMode,
    setThemeMode,
    resolution,
    setResolution,
    modelId,
    setModelId,
    forecastIndex,
    setForecastIndex,
    periods,
    lastWeekMode,
    setLastWeekMode,
    hotspotsEnabled,
    setHotspotsEnabled,
    hotspotMode,
    setHotspotMode,
    hotspotPercentile,
    setHotspotPercentile,
    compareEnabled,
    setCompareEnabled,
    compareSettings,
    setCompareSettings,
    selectedPaletteId,
    setSelectedPaletteId,
    toolsOpen,
    setToolsOpen,
    timeseriesOpen,
    setTimeseriesOpen,
    hotspotTotalCells,
    setHotspotTotalCells,
    poiFilters,
    setPoiFilters,
    modelOptions,
    compareModels,
    setCompareModelA,
    setCompareModelB,
    setComparePeriodA,
    setComparePeriodB,
    compareResolutionA,
    setCompareResolutionA,
    compareResolutionB,
    setCompareResolutionB,
    mapResizeTick,
    compareViewState,
    setCompareViewState,
    mapResetNonce,
    deltaMapData,
    showNoForecastNotice,
    forecastPath,
    latestForecastPath,
    expectedSummary,
    modelVersion,
    showLastWeek,
    currentWeek,
    currentWeekYear,
    compareDisabled,
    compareDisabledReason,
    periodOptions,
    resolvedCompareModelA,
    resolvedCompareModelB,
    comparePeriodAObj,
    comparePeriodBObj,
    effectiveCompareResolutionB,
    comparePathA,
    comparePathB,
    deltaFillExpr,
    deltaCellPopupHtmlBuilder,
    compareRenderMode,
    deltaMode,
    syncEnabled,
    shareBusy,
    shareSnapshot,
    downloadSnapshotAction,
    handleResetMap,
    setMenuOpen,
    setSelectedCompareH3,
    DEFAULT_DELTA_LEGEND,
    pageLoadError,
    reportFatalDataError,
    retryPageLoad,
  } = controller;

  const handleFatalDataError = (error: Parameters<typeof reportFatalDataError>[0]) => {
    reportFatalDataError(error);
  };

  if (pageLoadError) {
    return (
      <div className="mapPageRoot">
        <AppHeader
          title="OrcaCast"
          subtitle="Orca Sightings Forecast"
          forecastPeriods={[]}
          forecastIndex={0}
          onForecastIndexChange={setForecastIndex}
          expectedActivityCount={expectedSummary.current}
          expectedActivityVsPriorWeek={expectedSummary.vsPriorWeek}
          expectedActivityVs12WeekAvg={expectedSummary.vs12WeekAvg}
          expectedActivityTrend={expectedSummary.trend}
          expectedActivityChart={{
            values: expectedSummary.chartValues,
            forecastIndex: expectedSummary.forecastIndex,
            ciLow: expectedSummary.ciLow,
            ciHigh: expectedSummary.ciHigh,
          }}
          showForecastNotice={false}
          forecastNoticeText=""
          resolution={resolution}
          onResolutionChange={setResolution}
          darkMode={darkMode}
          onToggleDarkMode={() => setThemeMode(darkMode ? "light" : "dark")}
          onOpenInfo={() => controller.setInfoOpen(true)}
          onOpenMenu={() => setMenuOpen(true)}
          onBrandClick={handleResetMap}
          compareEnabled={false}
          onExitCompareMode={() => setCompareEnabled(false)}
        />
        <main className="app__main">
          <MapPageFailureState
            title="Data failed to load"
            message="The map could not start because a required data file was unavailable."
            failingPath={pageLoadError.path}
            status={pageLoadError.status}
            details={pageLoadError.details ?? pageLoadError.message}
            onRetry={retryPageLoad}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="mapPageRoot">
      <AppHeader
        title="OrcaCast"
        subtitle="Orca Sightings Forecast"
        forecastPeriods={periods}
        forecastIndex={Math.max(0, forecastIndex)}
        onForecastIndexChange={setForecastIndex}
        expectedActivityCount={expectedSummary.current}
        expectedActivityVsPriorWeek={expectedSummary.vsPriorWeek}
        expectedActivityVs12WeekAvg={expectedSummary.vs12WeekAvg}
        expectedActivityTrend={expectedSummary.trend}
        expectedActivityChart={{
          values: expectedSummary.chartValues,
          forecastIndex: expectedSummary.forecastIndex,
          ciLow: expectedSummary.ciLow,
          ciHigh: expectedSummary.ciHigh,
        }}
        showForecastNotice={showNoForecastNotice}
        forecastNoticeText="Forecast data is not available for the selected period."
        resolution={resolution}
        onResolutionChange={setResolution}
        darkMode={darkMode}
        onToggleDarkMode={() => setThemeMode(darkMode ? "light" : "dark")}
        onOpenInfo={() => controller.setInfoOpen(true)}
        onOpenMenu={() => setMenuOpen(true)}
        onBrandClick={handleResetMap}
        compareEnabled={compareEnabled}
        onExitCompareMode={() => setCompareEnabled(false)}
      />

      <main className="app__main">
        {!compareEnabled ? (
          <ForecastMap
            ref={primaryMapRef}
            key={`map-main-${selectedPaletteId}-${mapResetNonce}`}
            darkMode={darkMode}
            paletteId={selectedPaletteId}
            resolution={resolution}
            showLastWeek={showLastWeek}
            lastWeekMode={lastWeekMode}
            poiFilters={poiFilters}
            modelId={modelId}
            periods={periods}
            selectedWeek={currentWeek}
            selectedWeekYear={currentWeekYear}
            timeseriesOpen={timeseriesOpen}
            hotspotsEnabled={hotspotsEnabled}
            hotspotMode={hotspotMode}
            hotspotPercentile={hotspotPercentile}
            hotspotModeledCount={expectedSummary.current}
            onHotspotsEnabledChange={setHotspotsEnabled}
            onGridCellCount={setHotspotTotalCells}
            onGridCellSelect={setSelectedCompareH3}
            forecastPath={forecastPath}
            fallbackForecastPath={latestForecastPath}
            onFatalDataError={handleFatalDataError}
          />
        ) : (
          <div className="compareModeStage compareModeStage--map">
            {compareRenderMode === "delta" ? (
              <div className="compareMapPane">
                <ForecastMap
                  key={`map-delta-${selectedPaletteId}-${mapResetNonce}-${comparePeriodAObj.periodKey}-${comparePeriodBObj.periodKey}-${compareResolutionA}-${effectiveCompareResolutionB}-${resolvedCompareModelA}-${resolvedCompareModelB}`}
                  darkMode={darkMode}
                  paletteId={selectedPaletteId}
                  resolution={compareResolutionA}
                  showLastWeek={showLastWeek}
                  lastWeekMode={lastWeekMode}
                  poiFilters={poiFilters}
                  modelId={resolvedCompareModelA || modelId}
                  periods={periods}
                  selectedWeek={comparePeriodAObj.stat_week}
                  selectedWeekYear={comparePeriodAObj.year}
                  timeseriesOpen={timeseriesOpen}
                  hotspotsEnabled={hotspotsEnabled}
                  hotspotMode={hotspotMode}
                  hotspotPercentile={hotspotPercentile}
                  hotspotModeledCount={expectedSummary.current}
                  onHotspotsEnabledChange={setHotspotsEnabled}
                  onGridCellCount={setHotspotTotalCells}
                  onGridCellSelect={setSelectedCompareH3}
                  resizeTick={mapResizeTick}
                  derivedValuesByCell={deltaMapData?.deltaByCell ?? {}}
                  derivedValueProperty="delta_pctl"
                  derivedFillExpr={deltaFillExpr}
                  deltaLegend={DEFAULT_DELTA_LEGEND}
                  disableHotspots
                  enableSparklinePopup={false}
                  cellPopupHtmlBuilder={deltaCellPopupHtmlBuilder}
                  useExternalColorScale={false}
                  syncViewState={syncEnabled ? compareViewState : null}
                  onMoveViewState={setCompareViewState}
                  onMoveEndViewState={setCompareViewState}
                  onFatalDataError={handleFatalDataError}
                />
              </div>
            ) : compareRenderMode === "dual" ? (
              <DualMapCompare
                childrenLeft={
                  <div className="compareMapPane">
                    <ForecastMap
                      key={`map-dual-a-${selectedPaletteId}-${mapResetNonce}`}
                      darkMode={darkMode}
                      paletteId={selectedPaletteId}
                      resolution={compareResolutionA}
                      showLastWeek={showLastWeek}
                      lastWeekMode={lastWeekMode}
                      poiFilters={poiFilters}
                      modelId={resolvedCompareModelA || modelId}
                      periods={periods}
                      selectedWeek={comparePeriodAObj.stat_week}
                      selectedWeekYear={comparePeriodAObj.year}
                      timeseriesOpen={timeseriesOpen}
                      hotspotsEnabled={hotspotsEnabled}
                      hotspotMode={hotspotMode}
                      hotspotPercentile={hotspotPercentile}
                      hotspotModeledCount={expectedSummary.current}
                      onHotspotsEnabledChange={setHotspotsEnabled}
                      onGridCellCount={setHotspotTotalCells}
                      onGridCellSelect={setSelectedCompareH3}
                      resizeTick={mapResizeTick}
                      forecastPath={comparePathA}
                      fallbackForecastPath={latestForecastPath}
                      useExternalColorScale={false}
                      syncViewState={syncEnabled ? compareViewState : null}
                      onMoveViewState={setCompareViewState}
                      onMoveEndViewState={setCompareViewState}
                      onFatalDataError={handleFatalDataError}
                    />
                  </div>
                }
                childrenRight={
                  <div className="compareMapPane">
                    <ForecastMap
                      key={`map-dual-b-${selectedPaletteId}-${mapResetNonce}`}
                      darkMode={darkMode}
                      paletteId={selectedPaletteId}
                      resolution={compareResolutionB}
                      showLastWeek={showLastWeek}
                      lastWeekMode={lastWeekMode}
                      poiFilters={poiFilters}
                      modelId={resolvedCompareModelB || modelId}
                      periods={periods}
                      selectedWeek={comparePeriodBObj.stat_week}
                      selectedWeekYear={comparePeriodBObj.year}
                      timeseriesOpen={timeseriesOpen}
                      hotspotsEnabled={hotspotsEnabled}
                      hotspotMode={hotspotMode}
                      hotspotPercentile={hotspotPercentile}
                      hotspotModeledCount={expectedSummary.current}
                      onHotspotsEnabledChange={setHotspotsEnabled}
                      onGridCellCount={setHotspotTotalCells}
                      onGridCellSelect={setSelectedCompareH3}
                      resizeTick={mapResizeTick}
                      forecastPath={comparePathB}
                      fallbackForecastPath={latestForecastPath}
                      useExternalColorScale={false}
                      syncViewState={syncEnabled ? compareViewState : null}
                      onMoveViewState={setCompareViewState}
                      onMoveEndViewState={setCompareViewState}
                      onFatalDataError={handleFatalDataError}
                    />
                  </div>
                }
              />
            ) : (
              <SingleSwipeMap
                splitPct={compareSettings.splitPct}
                onSplitCommit={(pct) => setCompareSettings((prev) => ({ ...prev, splitPct: pct }))}
                childrenLeft={
                  <div className="compareMapPane">
                    <ForecastMap
                      key={`map-swipe-a-${selectedPaletteId}-${mapResetNonce}`}
                      darkMode={darkMode}
                      paletteId={selectedPaletteId}
                      resolution={compareResolutionA}
                      showLastWeek={showLastWeek}
                      lastWeekMode={lastWeekMode}
                      poiFilters={poiFilters}
                      modelId={resolvedCompareModelA || modelId}
                      periods={periods}
                      selectedWeek={comparePeriodAObj.stat_week}
                      selectedWeekYear={comparePeriodAObj.year}
                      timeseriesOpen={timeseriesOpen}
                      hotspotsEnabled={hotspotsEnabled}
                      hotspotMode={hotspotMode}
                      hotspotPercentile={hotspotPercentile}
                      hotspotModeledCount={expectedSummary.current}
                      onHotspotsEnabledChange={setHotspotsEnabled}
                      onGridCellCount={setHotspotTotalCells}
                      onGridCellSelect={setSelectedCompareH3}
                      resizeTick={mapResizeTick}
                      forecastPath={comparePathA}
                      fallbackForecastPath={latestForecastPath}
                      useExternalColorScale={false}
                      syncViewState={syncEnabled ? compareViewState : null}
                      onMoveEndViewState={setCompareViewState}
                      onFatalDataError={handleFatalDataError}
                    />
                  </div>
                }
                childrenRight={
                  <div className="compareMapPane">
                    <ForecastMap
                      key={`map-swipe-b-${selectedPaletteId}-${mapResetNonce}`}
                      darkMode={darkMode}
                      paletteId={selectedPaletteId}
                      resolution={compareResolutionB}
                      showLastWeek={showLastWeek}
                      lastWeekMode={lastWeekMode}
                      poiFilters={poiFilters}
                      modelId={resolvedCompareModelB || modelId}
                      periods={periods}
                      selectedWeek={comparePeriodBObj.stat_week}
                      selectedWeekYear={comparePeriodBObj.year}
                      timeseriesOpen={timeseriesOpen}
                      hotspotsEnabled={hotspotsEnabled}
                      hotspotMode={hotspotMode}
                      hotspotPercentile={hotspotPercentile}
                      hotspotModeledCount={expectedSummary.current}
                      onHotspotsEnabledChange={setHotspotsEnabled}
                      onGridCellCount={setHotspotTotalCells}
                      onGridCellSelect={setSelectedCompareH3}
                      resizeTick={mapResizeTick}
                      forecastPath={comparePathB}
                      fallbackForecastPath={latestForecastPath}
                      useExternalColorScale={false}
                      syncViewState={syncEnabled ? compareViewState : null}
                      onMoveEndViewState={setCompareViewState}
                      onFatalDataError={handleFatalDataError}
                    />
                  </div>
                }
              />
            )}

            <SwipeComparePills
              modelLeftId={resolvedCompareModelA || modelId}
              modelRightId={resolvedCompareModelB || modelId}
              periodLeft={comparePeriodAObj.periodKey}
              periodRight={comparePeriodBObj.periodKey}
              resolutionLeft={compareResolutionA}
              resolutionRight={effectiveCompareResolutionB}
              periodOptions={periodOptions}
              models={compareModels}
              dualMapMode={compareSettings.dualMapMode}
              deltaMode={deltaMode}
              onChangeModelLeft={setCompareModelA}
              onChangeModelRight={setCompareModelB}
              onChangePeriodLeft={setComparePeriodA}
              onChangePeriodRight={setComparePeriodB}
              onChangeResolutionLeft={(next) => {
                setCompareResolutionA(next);
                if (deltaMode) setCompareResolutionB(next);
              }}
              onChangeResolutionRight={setCompareResolutionB}
              onToggleDeltaMode={() => setCompareSettings((prev) => ({ ...prev, showDelta: !prev.showDelta }))}
              onToggleLocked={() =>
                setCompareSettings((prev) => ({
                  ...prev,
                  dualMapMode: !prev.dualMapMode,
                  splitPct: !prev.dualMapMode ? 50 : prev.splitPct,
                }))
              }
            />
          </div>
        )}

        <ToolDrawer
          open={toolsOpen}
          onToggle={() => setToolsOpen((v) => !v)}
          onClose={() => setToolsOpen(false)}
          onSelectLastWeek={(mode: NonNoneLastWeekMode) => {
            const prev = lastWeekMode;
            let next = prev;
            if (prev === "none") next = mode;
            else if (prev === mode) next = "none";
            else if (prev === "both") next = mode === "previous" ? "selected" : "previous";
            else next = "both";
            setLastWeekMode(next);
          }}
          lastWeekMode={lastWeekMode}
          showLastWeek={showLastWeek}
          hotspotsEnabled={hotspotsEnabled}
          onHotspotsEnabledChange={setHotspotsEnabled}
          hotspotMode={hotspotMode}
          onHotspotModeChange={setHotspotMode}
          hotspotPercentile={hotspotPercentile}
          onHotspotPercentileChange={setHotspotPercentile}
          hotspotTotalCells={hotspotTotalCells}
          hotspotModeledCount={expectedSummary.current}
          onOpenTimeseries={() => setTimeseriesOpen(true)}
          poiFilters={poiFilters}
          onTogglePoiAll={() =>
            setPoiFilters((prev) => {
              const allOn = prev.Park && prev.Marina && prev.Ferry;
              return { Park: !allOn, Marina: !allOn, Ferry: !allOn };
            })
          }
          onTogglePoiType={(type) => setPoiFilters((prev) => ({ ...prev, [type]: !prev[type] }))}
          compareEnabled={compareEnabled}
          compareDisabled={compareDisabled}
          compareDisabledReason={compareDisabledReason}
          selectedPaletteId={selectedPaletteId}
          onPaletteChange={setSelectedPaletteId}
          onToggleCompare={() => {
            if (!compareEnabled) {
              setCompareResolutionA(resolution);
              setCompareResolutionB(resolution);
            }
            setCompareEnabled(!compareEnabled);
          }}
        />

        <div className="app__footer">
          <AppFooter
            modelVersion={modelVersion}
            modelId={modelId}
            modelOptions={modelOptions}
            onModelChange={setModelId}
            compareEnabled={compareEnabled}
            onShareSnapshot={shareSnapshot}
            onDownloadSnapshot={downloadSnapshotAction}
            shareBusy={shareBusy}
            shareDisabled={compareEnabled}
            shareDisabledReason="Snapshots are available in single-map mode."
          />
        </div>
      </main>
    </div>
  );
}
