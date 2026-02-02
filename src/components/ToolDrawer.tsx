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
  onToggleParks: () => void;
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
  onToggleParks,
  onTogglePod,
}: Props) {
  return (
    <div className="toolDrawer">
      <button className="iconBtn toolDrawer__toggle" onClick={onToggle} aria-label="Tools">
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
              onToggleParks={onToggleParks}
              onTogglePod={onTogglePod}
            />
          </div>
        </>
      )}
    </div>
  );
}
