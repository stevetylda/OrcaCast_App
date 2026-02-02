import { ZERO_COLOR, type HeatScale } from "../map/colorScale";


type Props = {
  scale: HeatScale;
};

export function ProbabilityLegend({ scale }: Props) {
  const { binColorsRgba, labels } = scale;
  const nonZeroLabels = labels.slice(1);

  return (
    <div className="legend" aria-label="Probability legend">
      <div className="legend__header">
        <div className="legend__title">Sighting Heat</div>
      </div>
      <div className="legend__list">
        <div className="legend__row">
          <span className="legend__swatch" style={{ background: ZERO_COLOR }} />
          <div className="legend__label">{labels[0]}</div>
        </div>

        {nonZeroLabels.map((label, idx) => {
          const swatch = binColorsRgba[Math.min(idx, binColorsRgba.length - 1)];
          return (
            <div key={`${label}-${idx}`} className="legend__row">
              <span className="legend__swatch" style={{ background: swatch }} />
              <div className="legend__label">{label}</div>
            </div>
          );
        })}

      </div>
    </div>
  );
}
