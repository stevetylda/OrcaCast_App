import { PALETTES } from "../../../constants/palettes";
import type { ViewabilityColorScaleSettings } from "../../../data/viewabilityTypes";

type Props = {
  open: boolean;
  settings: ViewabilityColorScaleSettings;
  onChange: (next: Partial<ViewabilityColorScaleSettings>) => void;
  onToggleOpen: () => void;
  onClose: () => void;
};

export function ViewabilitySettingsPanel({ open, settings, onChange, onToggleOpen, onClose }: Props) {
  return (
    <div className="viewabilitySettings">
      <button type="button" className="iconBtn toolDrawer__toggle" aria-label="Viewability settings" onClick={onToggleOpen}>
        <span className="material-symbols-rounded" aria-hidden="true">
          settings
        </span>
      </button>
      {open && (
        <>
          <div className="viewabilitySettings__overlay" role="presentation" onClick={onClose} />
          <div className="viewabilitySettings__panel" aria-label="Viewability settings panel">
            <label className="viewabilityField">
              <span>Color scale</span>
              <select
                className="select"
                value={settings.paletteId}
                onChange={(event) => onChange({ paletteId: event.target.value as ViewabilityColorScaleSettings["paletteId"] })}
              >
                <option value="orcacast_classic">{PALETTES.orcacast_classic.name}</option>
                <option value="amethyst">{PALETTES.amethyst.name}</option>
                <option value="cividis_safe">{PALETTES.cividis_safe.name}</option>
              </select>
            </label>
            <label className="viewabilityCheck">
              <input
                type="checkbox"
                checked={settings.normalizeValues}
                onChange={(event) => onChange({ normalizeValues: event.target.checked })}
              />
              <span>Normalize values</span>
            </label>
            <label className="viewabilityCheck">
              <input
                type="checkbox"
                checked={settings.reversePalette}
                onChange={(event) => onChange({ reversePalette: event.target.checked })}
              />
              <span>Reverse palette</span>
            </label>
          </div>
        </>
      )}
    </div>
  );
}
