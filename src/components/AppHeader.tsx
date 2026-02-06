import type { H3Resolution } from "../config/dataPaths";
import type { Period } from "../data/periods";
import { ForecastPeriodPill } from "./ForecastPeriodPill";
import { H3ResolutionPill } from "./controls/H3ResolutionPill";

type Resolution = H3Resolution;

type Props = {
  title: string;
  subtitle: string;
  forecastPeriods: Period[];
  forecastIndex: number;
  onForecastIndexChange: (idx: number) => void;
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
  forecastPeriods,
  forecastIndex,
  onForecastIndexChange,
  resolution,
  onResolutionChange,
  darkMode,
  onToggleDarkMode,
  onOpenInfo,
  onOpenMenu,
}: Props) {
  return (
    <header className="header" data-tour="top-bar">
      <div className="header__left">
        <button
          className="iconBtn iconBtn--menu"
          onClick={onOpenMenu}
          aria-label="Menu"
          data-tour="menu"
        >
          <span className="material-symbols-rounded">menu</span>
        </button>

        <div className="brand">
          <div className="brand__title">
            {title} <span className="brand__subtitle">– {subtitle}</span>
          </div>
        </div>
      </div>

      <div className="header__right">
        <ForecastPeriodPill
          periods={forecastPeriods}
          selectedIndex={forecastIndex}
          onChangeIndex={onForecastIndexChange}
          disabled={forecastPeriods.length === 0}
          tourId="forecast-period"
        />

        <H3ResolutionPill
          value={resolution === "H4" ? 4 : resolution === "H5" ? 5 : 6}
          onChange={(next) =>
            onResolutionChange(next === 4 ? "H4" : next === 5 ? "H5" : "H6")
          }
          tourId="resolution"
        />

        <button
          className="iconBtn"
          onClick={onToggleDarkMode}
          aria-label="Toggle dark mode"
          title="Dark/Light Mode"
          data-tour="theme-toggle"
        >
          <span className="material-symbols-rounded">
            {darkMode ? "light_mode" : "dark_mode"}
          </span>
        </button>

        <button
          className="iconBtn"
          onClick={onOpenInfo}
          aria-label="Info"
          data-tour="info"
        >
          <span className="material-symbols-rounded">info</span>
        </button>
      </div>
    </header>
  );
}
