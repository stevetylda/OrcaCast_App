import { MapToolbar } from "./MapToolbar";

type Props = {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onSelectLastWeek: (mode: "previous" | "selected") => void;
  lastWeekMode: "none" | "previous" | "selected" | "both";
  showLastWeek: boolean;
  onToggleHistoric: () => void;
  onOpenTimeseries: () => void;
  poiFilters: { Park: boolean; Marina: boolean; Ferry: boolean };
  onTogglePoiAll: () => void;
  onTogglePoiType: (type: "Park" | "Marina" | "Ferry") => void;
  onTogglePod: () => void;
};

export function ToolDrawer({
  open,
  onToggle,
  onClose,
  onSelectLastWeek,
  lastWeekMode,
  showLastWeek,
  onToggleHistoric,
  onOpenTimeseries,
  poiFilters,
  onTogglePoiAll,
  onTogglePoiType,
  onTogglePod,
}: Props) {
  return (
    <div className="toolDrawer">
      <button
        className="iconBtn toolDrawer__toggle"
        onClick={onToggle}
        aria-label="Tools"
        data-tour="tools"
      >
        <span className="material-symbols-rounded">settings</span>
      </button>

      {open && (
        <>
          <div className="toolDrawer__overlay" onClick={onClose} role="presentation" />
          <div className="toolDrawer__panel">
            <MapToolbar
              className="toolbar--drawer"
              onSelectLastWeek={onSelectLastWeek}
              lastWeekMode={lastWeekMode}
              showLastWeek={showLastWeek}
              onToggleHistoric={onToggleHistoric}
              onOpenTimeseries={onOpenTimeseries}
              poiFilters={poiFilters}
              onTogglePoiAll={onTogglePoiAll}
              onTogglePoiType={onTogglePoiType}
              onTogglePod={onTogglePod}
            />
          </div>
        </>
      )}
    </div>
  );
}
