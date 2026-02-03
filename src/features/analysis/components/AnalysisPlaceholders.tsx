import type { AnalysisVisualType } from "../analysisContent";

const PlaceholderShell = ({ label, children }: { label: string; children: React.ReactNode }) => {
  return (
    <div className="analysisPlaceholder">
      <div className="analysisPlaceholder__label">{label}</div>
      <div className="analysisPlaceholder__body">{children}</div>
    </div>
  );
};

export const MiniTimeseriesPlaceholder = () => (
  <PlaceholderShell label="Trend pulse">
    <svg viewBox="0 0 240 120" role="img" aria-label="Trend placeholder">
      <defs>
        <linearGradient id="trendFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="rgba(25, 240, 215, 0.6)" />
          <stop offset="100%" stopColor="rgba(25, 240, 215, 0)" />
        </linearGradient>
      </defs>
      <path
        d="M10 80 C40 40, 70 90, 100 60 C130 30, 160 70, 190 40 C210 20, 225 50, 230 46"
        fill="none"
        stroke="rgba(25, 240, 215, 0.9)"
        strokeWidth="3"
      />
      <path
        d="M10 80 C40 40, 70 90, 100 60 C130 30, 160 70, 190 40 C210 20, 225 50, 230 46 L230 110 L10 110 Z"
        fill="url(#trendFill)"
      />
    </svg>
  </PlaceholderShell>
);

export const HeatmapPlaceholder = () => (
  <PlaceholderShell label="Signal density">
    <div className="analysisHeatmap">
      {Array.from({ length: 35 }).map((_, index) => (
        <span key={index} className="analysisHeatmap__cell" />
      ))}
    </div>
  </PlaceholderShell>
);

export const LagCurvePlaceholder = () => (
  <PlaceholderShell label="Lag curve">
    <svg viewBox="0 0 240 120" role="img" aria-label="Lag curve placeholder">
      <path
        d="M12 95 C40 70, 70 40, 100 35 C140 28, 180 55, 228 90"
        fill="none"
        stroke="rgba(0, 194, 255, 0.9)"
        strokeWidth="3"
      />
      <circle cx="100" cy="35" r="5" fill="rgba(25, 240, 215, 0.85)" />
      <circle cx="180" cy="55" r="4" fill="rgba(25, 240, 215, 0.6)" />
    </svg>
  </PlaceholderShell>
);

export const MapPlaceholder = () => (
  <PlaceholderShell label="Regional map">
    <div className="analysisMap">
      <div className="analysisMap__glow" />
      <div className="analysisMap__dot" />
      <div className="analysisMap__dot analysisMap__dot--secondary" />
      <div className="analysisMap__route" />
    </div>
  </PlaceholderShell>
);

export const renderVisual = (visual: AnalysisVisualType) => {
  switch (visual) {
    case "heatmap":
      return <HeatmapPlaceholder />;
    case "lag":
      return <LagCurvePlaceholder />;
    case "map":
      return <MapPlaceholder />;
    case "timeseries":
    default:
      return <MiniTimeseriesPlaceholder />;
  }
};
