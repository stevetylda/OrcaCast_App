import React from "react";

type Props = {
  onToggleLastWeek: () => void;
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
}: {
  icon: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button className="toolBtn" onClick={onClick} title={label} aria-label={label}>
      <span className="material-symbols-rounded">{icon}</span>
    </button>
  );
}

export function MapToolbar({
  onToggleLastWeek,
  onToggleHistoric,
  onOpenTimeseries,
  onToggleParks,
  onTogglePod,
  className,
}: Props) {
  return (
    <div className={className ? `toolbar ${className}` : "toolbar"}>
      <ToolButton icon="history" label="Add last week + prior sightings" onClick={onToggleLastWeek} />
      <ToolButton icon="timeline" label="Open timeseries" onClick={onOpenTimeseries} />
      <ToolButton icon="pin_drop" label="Add parks + viewpoints" onClick={onToggleParks} />
      <ToolButton icon="group" label="Pod selection (SRKW/Transient/Both)" onClick={onTogglePod} />
      <ToolButton icon="manage_search" label="Historic presence in period" onClick={onToggleHistoric} />
    </div>
  );
}
