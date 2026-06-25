import { useEffect, useMemo, useRef, useState } from "react";
import type { ViewabilityScoreType } from "../../../data/viewabilityTypes";

type Speed = 0.5 | 1 | 2 | 7;

const SPEED_OPTIONS: Array<{ label: string; value: Speed }> = [
  { label: "0.5x", value: 0.5 },
  { label: "1x", value: 1 },
  { label: "2x", value: 2 },
  { label: "7x", value: 7 },
];

const SPEED_MS: Record<Speed, number> = {
  0.5: 2000,
  1: 1200,
  2: 600,
  7: 170,
};

type Props = {
  selectedDateOrPeriod: string;
  availableDates: string[];
  onSelectedDateOrPeriodChange: (value: string) => void;
  scoreType: ViewabilityScoreType;
  onScoreTypeChange: (value: ViewabilityScoreType) => void;
  selectedSourceCellId: string | null;
  onResetSelection: () => void;
};

function ViewabilityDynamicOption({
  selected,
  selectedDate,
  dates,
  onChangeDate,
  onSelectDynamic,
}: {
  selected: boolean;
  selectedDate: string;
  dates: string[];
  onChangeDate: (date: string) => void;
  onSelectDynamic: () => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [speed, setSpeed] = useState<Speed>(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playDir, setPlayDir] = useState<1 | -1>(1);
  const [scrubIndex, setScrubIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const debounceRef = useRef<number | null>(null);

  const safeDates = useMemo(() => (dates.length > 0 ? dates : [selectedDate]), [dates, selectedDate]);
  const selectedIndex = Math.max(0, safeDates.indexOf(selectedDate));
  const selectedIndexRef = useRef(selectedIndex);

  useEffect(() => {
    selectedIndexRef.current = selectedIndex;
  }, [selectedIndex]);

  useEffect(() => () => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (containerRef.current.contains(event.target as Node)) return;
      setOpen(false);
      setIsPlaying(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      setIsPlaying(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!isPlaying) return;
    const id = window.setTimeout(() => {
      const next = selectedIndex + playDir;
      if (next < 0 || next >= safeDates.length) {
        setIsPlaying(false);
        return;
      }
      onChangeDate(safeDates[next]);
    }, SPEED_MS[speed]);
    return () => window.clearTimeout(id);
  }, [isPlaying, onChangeDate, playDir, safeDates, selectedIndex, speed]);

  const currentLabel = useMemo(() => safeDates[selectedIndex] ?? safeDates[0], [safeDates, selectedIndex]);
  const firstDate = safeDates[0] ?? selectedDate;
  const lastDate = safeDates.at(-1) ?? selectedDate;

  const commitIndex = (idx: number) => {
    if (idx === selectedIndexRef.current) return;
    const nextDate = safeDates[idx];
    if (nextDate) onChangeDate(nextDate);
  };

  const scheduleCommit = (idx: number) => {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    debounceRef.current = window.setTimeout(() => {
      commitIndex(idx);
      debounceRef.current = null;
    }, 150);
  };

  const stopPlayback = () => {
    if (isPlaying) setIsPlaying(false);
  };

  const moveTo = (idx: number) => {
    stopPlayback();
    if (idx < 0 || idx >= safeDates.length) return;
    commitIndex(idx);
  };

  const handlePlayToggle = () => {
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }
    const dir: 1 | -1 = selectedIndex >= safeDates.length - 1 ? -1 : 1;
    setPlayDir(dir);
    setIsPlaying(true);
  };

  return (
    <div ref={containerRef} className={`viewabilitySegmented__item${open ? " viewabilitySegmented__item--open" : ""}`}>
      <button
        type="button"
        className={`viewabilitySegmented__option viewabilitySegmented__option--dynamic${selected ? " isSelected" : ""}`}
        role="radio"
        aria-checked={selected}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={(event) => {
          onSelectDynamic();
          if ((event.target as HTMLElement).closest(".viewabilitySegmented__playAffordance")) {
            setOpen((value) => !value);
          }
        }}
      >
        <span>Dynamic</span>
        <span className="viewabilitySegmented__playAffordance" aria-label={`Open date slider, current date ${currentLabel}`} title={currentLabel}>
          <span className="material-symbols-rounded" aria-hidden="true">
            play_arrow
          </span>
        </span>
      </button>

      {open && (
        <div className="periodPopover" role="dialog" aria-label="Viewability date controls">
          <div className="periodPopover__dateRow">
            <span className="periodPopover__date">{currentLabel}</span>
            <span className="periodPopover__count">{safeDates.length.toLocaleString()} days</span>
          </div>
          <input
            className="periodPopover__slider"
            type="range"
            min={0}
            max={safeDates.length - 1}
            step={1}
            value={isDragging ? scrubIndex : selectedIndex}
            onChange={(event) => {
              const value = Number(event.target.value);
              stopPlayback();
              setScrubIndex(value);
              scheduleCommit(value);
            }}
            onMouseDown={() => {
              setScrubIndex(selectedIndex);
              setIsDragging(true);
            }}
            onMouseUp={(event) => {
              setIsDragging(false);
              if (debounceRef.current) window.clearTimeout(debounceRef.current);
              debounceRef.current = null;
              commitIndex(Number((event.target as HTMLInputElement).value));
            }}
            onTouchStart={() => {
              setScrubIndex(selectedIndex);
              setIsDragging(true);
            }}
            onTouchEnd={(event) => {
              setIsDragging(false);
              if (debounceRef.current) window.clearTimeout(debounceRef.current);
              debounceRef.current = null;
              commitIndex(Number((event.target as HTMLInputElement).value));
            }}
            aria-label="Viewability date"
          />
          <div className="periodPopover__range">
            <span>{firstDate}</span>
            <span>{lastDate}</span>
          </div>

          <div className="periodPopover__controls">
            <button type="button" className="periodPopover__btn" onClick={() => moveTo(0)} aria-label="First date">
              <span className="material-symbols-rounded">skip_previous</span>
            </button>
            <button type="button" className="periodPopover__btn" onClick={() => moveTo(selectedIndex - 1)} aria-label="Previous date">
              <span className="material-symbols-rounded">chevron_left</span>
            </button>
            <button type="button" className="periodPopover__btn periodPopover__btn--play" onClick={handlePlayToggle} aria-label={isPlaying ? "Pause playback" : "Play dates"}>
              <span className="material-symbols-rounded">{isPlaying ? "pause" : "play_arrow"}</span>
            </button>
            <button type="button" className="periodPopover__btn" onClick={() => moveTo(selectedIndex + 1)} aria-label="Next date">
              <span className="material-symbols-rounded">chevron_right</span>
            </button>
            <button type="button" className="periodPopover__btn" onClick={() => moveTo(safeDates.length - 1)} aria-label="Last date">
              <span className="material-symbols-rounded">skip_next</span>
            </button>
            <select
              className="periodPopover__speed"
              value={speed}
              onChange={(event) => setSpeed(Number(event.target.value) as Speed)}
              aria-label="Playback speed"
            >
              {SPEED_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

export function ViewabilityTopControls({
  selectedDateOrPeriod,
  availableDates,
  onSelectedDateOrPeriodChange,
  scoreType,
  onScoreTypeChange,
  selectedSourceCellId,
  onResetSelection,
}: Props) {
  return (
    <div className="viewabilityTopControls" aria-label="Viewability controls">
      <div className="viewabilitySegmented" role="radiogroup" aria-label="Score type">
        <button
          type="button"
          className={`viewabilitySegmented__option${scoreType === "base" ? " isSelected" : ""}`}
          role="radio"
          aria-checked={scoreType === "base"}
          onClick={() => onScoreTypeChange("base")}
        >
          Base
        </button>
        <ViewabilityDynamicOption
          selected={scoreType === "dynamic"}
          selectedDate={selectedDateOrPeriod}
          dates={availableDates}
          onChangeDate={onSelectedDateOrPeriodChange}
          onSelectDynamic={() => onScoreTypeChange("dynamic")}
        />
      </div>

      {selectedSourceCellId && (
        <button type="button" className="iconBtn viewabilityResetBtn" onClick={onResetSelection} aria-label="Reset source selection" title="Reset selection">
          <span className="material-symbols-rounded" aria-hidden="true">
            close
          </span>
        </button>
      )}
    </div>
  );
}
