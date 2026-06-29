import { formatScore } from "../../utils/viewabilityColorScales";

export function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function targetTooltipHtml(props: Record<string, unknown>) {
  if (props.source_target_weight !== undefined) {
    return `
      <div class="viewabilityPopup__title">Target cell</div>
      <div>${escapeHtml(String(props.h3 ?? "-"))}</div>
      <dl>
        <dt>Active source-target weight</dt><dd>${formatScore(Number(props.source_target_weight))}</dd>
        <dt>Selected source cells</dt><dd>${escapeHtml(String(props.selected_source_count ?? 1))}</dd>
        <dt>Base source-target weight</dt><dd>${formatScore(Number(props.base_source_target_weight))}</dd>
        <dt>Dynamic source-target weight</dt><dd>${formatScore(Number(props.dynamic_source_target_weight))}</dd>
        <dt>Dynamic modifier</dt><dd>${formatScore(Number(props.source_target_modifier))}</dd>
        <dt>Distance km</dt><dd>${formatScore(Number(props.distance_km))}</dd>
        <dt>Terrain weight</dt><dd>${formatScore(Number(props.weight_terrain))}</dd>
        <dt>Vegetation weight</dt><dd>${formatScore(Number(props.weight_vegetation))}</dd>
        <dt>Distance weight</dt><dd>${formatScore(Number(props.weight_distance))}</dd>
      </dl>
    `;
  }
  return `
    <div class="viewabilityPopup__title">Target cell</div>
    <div>${escapeHtml(String(props.h3 ?? "-"))}</div>
    <dl>
      <dt>Base score</dt><dd>${formatScore(Number(props.base_viewability_score))}</dd>
      <dt>Dynamic score</dt><dd>${formatScore(Number(props.dynamic_viewability_score))}</dd>
    </dl>
  `;
}
