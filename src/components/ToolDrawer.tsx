import { MapToolbar } from "./MapToolbar";

type Props = {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onToggleLastWeek: () => void;
  onToggleHistoric: () => void;
  onOpenTimeseries: () => void;
  onToggleParks: () => void;
  onTogglePod: () => void;
};

export function ToolDrawer({
  open,
  onToggle,
  onClose,
  onToggleLastWeek,
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
              onToggleLastWeek={onToggleLastWeek}
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
