import { getViewabilityPaletteOrDefault } from "../../../constants/palettes";
import type { ViewabilityColorScaleSettings, ViewabilityScoreType } from "../../../data/viewabilityTypes";

type Props = {
  scoreType: ViewabilityScoreType;
  settings: ViewabilityColorScaleSettings;
  inspectorMode: boolean;
};

export function ViewabilityLegend({ scoreType, settings, inspectorMode }: Props) {
  const palette = getViewabilityPaletteOrDefault(settings.paletteId);
  const colors = settings.reversePalette ? [...palette.colors].reverse() : palette.colors;
  return (
    <div className="viewabilityLegend" aria-label="Viewability legend">
      <div className="viewabilityLegend__title">
        {inspectorMode ? "Source-target weight" : `${scoreType} viewability`}
      </div>
      <div className="viewabilityLegend__ramp" style={{ background: `linear-gradient(90deg, ${colors.join(", ")})` }} />
      <div className="viewabilityLegend__ticks">
        <span>Low</span>
        <span>High</span>
      </div>
    </div>
  );
}
