export type NumericDomain = {
  min: number;
  max: number;
};

export const WIDTH = 1000;
export const HEIGHT = 230;
export const STACKED_HEIGHT = 350;
export const MARGIN = { top: 18, right: 24, bottom: 34, left: 42 };
export const PLOT_WIDTH = WIDTH - MARGIN.left - MARGIN.right;
export const PLOT_HEIGHT = HEIGHT - MARGIN.top - MARGIN.bottom;
export const MIN_VISIBLE_DAYS = 14;

export function clampWindow(start: number, end: number, count: number): { start: number; end: number } {
  if (count <= 0) return { start: 0, end: 0 };
  const span = Math.min(count, Math.max(1, end - start + 1));
  const clampedStart = Math.max(0, Math.min(count - span, start));
  return { start: clampedStart, end: clampedStart + span - 1 };
}

export function xForIndex(index: number, count: number): number {
  if (count <= 1) return MARGIN.left + PLOT_WIDTH / 2;
  return MARGIN.left + (index / (count - 1)) * PLOT_WIDTH;
}

export function yForNormalizedValue(value: number): number {
  return MARGIN.top + (1 - Math.max(0, Math.min(1, value))) * PLOT_HEIGHT;
}

export function sourceYForValue(value: number, domain: NumericDomain): number {
  const span = domain.max - domain.min;
  if (span <= 0) return MARGIN.top + PLOT_HEIGHT;
  const pct = Math.max(0, Math.min(1, (value - domain.min) / span));
  return MARGIN.top + (1 - pct) * PLOT_HEIGHT;
}

export function boxWidth(count: number): number {
  if (count <= 1) return 8;
  return Math.max(1.4, Math.min(8, (PLOT_WIDTH / count) * 0.64));
}

export function periodLabel(value: string | undefined): string {
  return value && value.length >= 7 ? value.slice(0, 7) : value ?? "";
}
