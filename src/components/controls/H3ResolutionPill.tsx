import React, { useMemo, useRef } from "react";

export type H3Res = 4 | 5 | 6;

type Option = {
  res: H3Res;
  label: string;
  shortLabel: string;
  tooltip: string;
  iconSize: number;
};

const OPTIONS: Option[] = [
  {
    res: 4,
    label: "Regional",
    shortLabel: "Regional",
    tooltip: "Regional (H4) — large regions / overview",
    iconSize: 26,
  },
  {
    res: 5,
    label: "Sub-Regional",
    shortLabel: "Sub-Regional",
    tooltip: "Sub-Regional (H5) — balanced detail",
    iconSize: 20,
  },
  {
    res: 6,
    label: "Local",
    shortLabel: "Local",
    tooltip: "Local (H6) — fine detail / small regions",
    iconSize: 14,
  },
];

type Props = {
  value: H3Res;
  onChange: (next: H3Res) => void;
  disabled?: boolean;
  compact?: boolean;
};

export function H3ResolutionPill({ value, onChange, disabled = false, compact = true }: Props) {
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const activeIndex = useMemo(
    () => Math.max(0, OPTIONS.findIndex((opt) => opt.res === value)),
    [value]
  );

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const key = event.key;
    if (key !== "ArrowLeft" && key !== "ArrowRight" && key !== "Home" && key !== "End") return;
    event.preventDefault();
    let nextIndex = activeIndex;
    if (key === "ArrowLeft") nextIndex = Math.max(0, activeIndex - 1);
    if (key === "ArrowRight") nextIndex = Math.min(OPTIONS.length - 1, activeIndex + 1);
    if (key === "Home") nextIndex = 0;
    if (key === "End") nextIndex = OPTIONS.length - 1;
    const next = OPTIONS[nextIndex]?.res;
    if (next !== undefined && next !== value) {
      onChange(next);
    }
    const nextButton = buttonRefs.current[nextIndex];
    if (nextButton) nextButton.focus();
  };

  return (
    <div
      className={`h3pill${compact ? " h3pill--compact" : ""}${disabled ? " h3pill--disabled" : ""}`}
      role="radiogroup"
      aria-label="Resolution"
      onKeyDown={handleKeyDown}
      style={{ ["--h3-pill-index" as string]: String(activeIndex) }}
    >
      {OPTIONS.map((opt, idx) => {
        const isActive = opt.res === value;
        return (
          <button
            key={opt.res}
            ref={(el) => {
              buttonRefs.current[idx] = el;
            }}
            type="button"
            className={`h3pill__segment${isActive ? " h3pill__segment--active" : ""}`}
            role="radio"
            aria-checked={isActive}
            aria-label={opt.tooltip}
            title={opt.tooltip}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(opt.res)}
            disabled={disabled}
          >
            <span
              className="material-symbols-outlined h3pill__icon"
              style={{ fontSize: `${opt.iconSize}px` }}
              aria-hidden="true"
            >
              hexagon
            </span>
            {!compact && <span className="h3pill__label">{opt.shortLabel}</span>}
          </button>
        );
      })}
    </div>
  );
}
