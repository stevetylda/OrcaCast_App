import { useEffect, useRef, useState } from "react";
import { HotspotsSettingsSection } from "./map/settings/HotspotsSettingsSection";

type Props = {
  onSelectLastWeek: (mode: "previous" | "selected") => void;
  lastWeekMode: "none" | "previous" | "selected" | "both";
  showLastWeek: boolean;
  hotspotsEnabled: boolean;
  onHotspotsEnabledChange: (value: boolean) => void;
  hotspotMode: "modeled" | "custom";
  onHotspotModeChange: (value: "modeled" | "custom") => void;
  hotspotPercentile: number;
  onHotspotPercentileChange: (value: number) => void;
  hotspotTotalCells: number | null;
  onOpenTimeseries: () => void;
  poiFilters: { Park: boolean; Marina: boolean; Ferry: boolean };
  onTogglePoiAll: () => void;
  onTogglePoiType: (type: "Park" | "Marina" | "Ferry") => void;
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
  hotspotsEnabled,
  onHotspotsEnabledChange,
  hotspotMode,
  onHotspotModeChange,
  hotspotPercentile,
  onHotspotPercentileChange,
  hotspotTotalCells,
  onOpenTimeseries,
  poiFilters,
  onTogglePoiAll,
  onTogglePoiType,
  className,
}: Props) {
  const lastWeekRef = useRef<HTMLDivElement | null>(null);
  const poiRef = useRef<HTMLDivElement | null>(null);
  const hotspotRef = useRef<HTMLDivElement | null>(null);
  const [lastWeekOpen, setLastWeekOpen] = useState(false);
  const [poiOpen, setPoiOpen] = useState(false);
  const [hotspotOpen, setHotspotOpen] = useState(false);
  const hasPrevious = lastWeekMode === "previous" || lastWeekMode === "both";
  const hasSelected = lastWeekMode === "selected" || lastWeekMode === "both";
  const poiActive = poiFilters.Park || poiFilters.Marina || poiFilters.Ferry;

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

  useEffect(() => {
    if (!poiOpen) return;
    const onDocClick = (event: MouseEvent) => {
      if (!poiRef.current) return;
      if (poiRef.current.contains(event.target as Node)) return;
      setPoiOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setPoiOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [poiOpen]);

  useEffect(() => {
    if (!hotspotOpen) return;
    const onDocClick = (event: MouseEvent) => {
      if (!hotspotRef.current) return;
      if (hotspotRef.current.contains(event.target as Node)) return;
      setHotspotOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setHotspotOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [hotspotOpen]);

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
      <div ref={poiRef} className={`toolMenu${poiOpen ? " toolMenu--open" : ""}`}>
        <button
          className={`toolBtn${poiActive ? " toolBtn--active" : ""}`}
          onClick={() => {
            onTogglePoiAll();
            setPoiOpen(true);
          }}
          title="POI filters"
          aria-label="POI filters"
          data-tour="poi"
        >
          <span className="material-symbols-rounded">pin_drop</span>
        </button>
        {poiOpen && (
          <div className="toolMenu__popover" role="menu" aria-label="Points of interest">
            <button
              className={`toolMenu__option${poiFilters.Park ? " toolMenu__option--active" : ""}`}
              onClick={() => onTogglePoiType("Park")}
              title="Parks"
              aria-label="Parks"
            >
              <span className="material-symbols-rounded">park</span>
            </button>
            <button
              className={`toolMenu__option${poiFilters.Marina ? " toolMenu__option--active" : ""}`}
              onClick={() => onTogglePoiType("Marina")}
              title="Marinas"
              aria-label="Marinas"
            >
              <span className="material-symbols-rounded">sailing</span>
            </button>
            <button
              className={`toolMenu__option${poiFilters.Ferry ? " toolMenu__option--active" : ""}`}
              onClick={() => onTogglePoiType("Ferry")}
              title="Ferries"
              aria-label="Ferries"
            >
              <span className="material-symbols-rounded">directions_boat</span>
            </button>
          </div>
        )}
      </div>
      <div ref={hotspotRef} className={`toolMenu${hotspotOpen ? " toolMenu--open" : ""}`}>
        <button
          className={`toolBtn${hotspotsEnabled ? " toolBtn--active" : ""}`}
          onClick={() => setHotspotOpen((v) => !v)}
          title="Hotspot threshold"
          aria-label="Hotspot threshold"
        >
          <span className="toolBtn__iconStack" aria-hidden="true">
            <span className="material-symbols-rounded toolBtn__iconBase toolBtn__iconBase--hotspot">
              local_fire_department
            </span>
            <span className="material-symbols-rounded toolBtn__iconBadge">settings</span>
          </span>
        </button>
        {hotspotOpen && (
          <div
            className="toolMenu__popover toolMenu__popover--stack"
            role="dialog"
            aria-label="Hotspots settings"
          >
            <HotspotsSettingsSection
              enabled={hotspotsEnabled}
              onEnabledChange={onHotspotsEnabledChange}
              mode={hotspotMode}
              onModeChange={onHotspotModeChange}
              percentile={hotspotPercentile}
              onPercentileChange={onHotspotPercentileChange}
              totalCells={hotspotTotalCells}
            />
          </div>
        )}
      </div>
    </div>
  );
}
