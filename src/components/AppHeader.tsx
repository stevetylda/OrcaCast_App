import React from "react";
import type { H3Resolution } from "../config/dataPaths";
import { H3ResolutionPill } from "./controls/H3ResolutionPill";

type Resolution = H3Resolution;

type Props = {
  title: string;
  subtitle: string;
  forecastPeriodText: string;
  resolution: Resolution;
  onResolutionChange: (v: Resolution) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenInfo: () => void;
  onOpenMenu: () => void;
};

export function AppHeader({
  title,
  subtitle,
  forecastPeriodText,
  resolution,
  onResolutionChange,
  darkMode,
  onToggleDarkMode,
  onOpenInfo,
  onOpenMenu,
}: Props) {
  return (
    <header className="header">
      <div className="header__left">
        <button className="iconBtn iconBtn--menu" onClick={onOpenMenu} aria-label="Menu">
          <span className="material-symbols-rounded">menu</span>
        </button>

        <div className="brand">
          <div className="brand__title">
            {title} <span className="brand__subtitle">– {subtitle}</span>
          </div>
        </div>
      </div>

      <div className="header__right">
        <div className="periodChip" aria-label={`Forecast Period ${forecastPeriodText}`}>
          <span className="periodChip__label">Forecast Period:</span>
          <span className="periodChip__value">{forecastPeriodText}</span>
        </div>

        <H3ResolutionPill
          value={resolution === "H4" ? 4 : resolution === "H5" ? 5 : 6}
          onChange={(next) =>
            onResolutionChange(next === 4 ? "H4" : next === 5 ? "H5" : "H6")
          }
        />

        <button
          className="iconBtn"
          onClick={onToggleDarkMode}
          aria-label="Toggle dark mode"
          title="Dark/Light Mode"
        >
          <span className="material-symbols-rounded">
            {darkMode ? "light_mode" : "dark_mode"}
          </span>
        </button>

        <button className="iconBtn" onClick={onOpenInfo} aria-label="Info">
          <span className="material-symbols-rounded">info</span>
        </button>
      </div>
    </header>
  );
}
