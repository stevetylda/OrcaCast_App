import { useEffect, useRef, useState } from "react";

type Props = {
  onSelectLastWeek: (mode: "previous" | "selected") => void;
  lastWeekMode: "none" | "previous" | "selected" | "both";
  showLastWeek: boolean;
  onToggleHistoric: () => void;
  onOpenTimeseries: () => void;
  onToggleParks: () => void;
  onTogglePod: () => void;
  className?: string;
};

function ToolButton({
  icon,
  label,
  onClick,
  tourId,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  tourId?: string;
}) {
  return (
    <button
      className="toolBtn"
      onClick={onClick}
      title={label}
      aria-label={label}
      data-tour={tourId}
    >
      <span className="material-symbols-rounded">{icon}</span>
    </button>
  );
}

export function MapToolbar({
  onSelectLastWeek,
  lastWeekMode,
  showLastWeek,
  onToggleHistoric,
  onOpenTimeseries,
  onToggleParks,
  onTogglePod,
  className,
}: Props) {
  const lastWeekRef = useRef<HTMLDivElement | null>(null);
  const [lastWeekOpen, setLastWeekOpen] = useState(false);
  const hasPrevious = lastWeekMode === "previous" || lastWeekMode === "both";
  const hasSelected = lastWeekMode === "selected" || lastWeekMode === "both";

  useEffect(() => {
    if (!lastWeekOpen) return;
    const onDocClick = (event: MouseEvent) => {
      if (!lastWeekRef.current) return;
      if (lastWeekRef.current.contains(event.target as Node)) return;
      setLastWeekOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setLastWeekOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [lastWeekOpen]);

  return (
    <div className={className ? `toolbar ${className}` : "toolbar"} data-tour="toolbar">
      <div
        ref={lastWeekRef}
        className={`toolMenu${lastWeekOpen ? " toolMenu--open" : ""}`}
      >
        <button
          className={`toolBtn${
            showLastWeek
              ? lastWeekMode === "both"
                ? " toolBtn--active toolBtn--activeBoth"
                : lastWeekMode === "previous"
                  ? " toolBtn--active toolBtn--activePrev"
                  : " toolBtn--active toolBtn--activeNext"
              : ""
          }`}
          onClick={() => setLastWeekOpen((v) => !v)}
          title="Add last week sightings"
          aria-label="Add last week sightings"
          data-tour="history"
        >
          <span className="material-symbols-rounded">history</span>
        </button>

        {lastWeekOpen && (
          <div className="toolMenu__popover" role="menu" aria-label="Last week sightings">
            <button
              className={`toolMenu__option${
                showLastWeek && hasPrevious ? " toolMenu__option--active" : ""
              } toolMenu__option--prev`}
              onClick={() => {
                onSelectLastWeek("previous");
                setLastWeekOpen(false);
              }}
              title="Prior week sightings"
              aria-label="Prior week sightings"
            >
              <span className="material-symbols-rounded">keyboard_double_arrow_left</span>
            </button>
            <button
              className={`toolMenu__option${
                showLastWeek && hasSelected ? " toolMenu__option--active" : ""
              } toolMenu__option--next`}
              onClick={() => {
                onSelectLastWeek("selected");
                setLastWeekOpen(false);
              }}
              title="Selected week sightings"
              aria-label="Selected week sightings"
            >
              <span className="material-symbols-rounded">keyboard_double_arrow_right</span>
            </button>
          </div>
        )}
      </div>
      <ToolButton
        icon="timeline"
        label="Open timeseries"
        onClick={onOpenTimeseries}
        tourId="timeseries"
      />
      <ToolButton
        icon="pin_drop"
        label="Add parks + viewpoints"
        onClick={onToggleParks}
        tourId="poi"
      />
      <ToolButton
        icon="group"
        label="Pod selection (SRKW/Transient/Both)"
        onClick={onTogglePod}
        tourId="pods"
      />
      <ToolButton
        icon="manage_search"
        label="Historic presence in period"
        onClick={onToggleHistoric}
        tourId="historic"
      />
    </div>
  );
}
