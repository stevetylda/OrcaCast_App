export type HeatScale = {
  thresholds: number[];
  binColorsRgba: string[];
  labels: string[];
  hotspotThreshold?: number;
};

type ColorScaleResult = {
  fillColorExpr: unknown[];
  scale: HeatScale | null;
};

const ZERO_COLOR = "rgba(25,240,215,0.12)";
const BASE_PALETTE = [
  "#123BFF",
  "#1B74FF",
  "#1AA8FF",
  "#14D3FF",
  "#00F5FF",
  "#00FFC6",
  "#00FFF0",
  "#E8FFFD",
];

const LABELS = [
  "No probability",
  "Very Low",
  "Low",
  "Moderate",
  "Elevated",
  "High",
  "Very High",
  "Extreme / Peak",
];

const Q_LEVELS = [0.6, 0.9, 0.94, 0.96, 0.975, 0.9875, 0.995];

function hexToRgb(hex: string): [number, number, number] {
  const cleaned = hex.replace("#", "");
  const full = cleaned.length === 3
    ? cleaned
        .split("")
        .map((c) => c + c)
        .join("")
    : cleaned;
  const num = parseInt(full, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function rgbToHsl([r, g, b]: [number, number, number]): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  switch (max) {
    case rn:
      h = (gn - bn) / d + (gn < bn ? 6 : 0);
      break;
    case gn:
      h = (bn - rn) / d + 2;
      break;
    default:
      h = (rn - gn) / d + 4;
  }
  h /= 6;
  return [h, s, l];
}

function hslToRgb([h, s, l]: [number, number, number]): [number, number, number] {
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const r = hue2rgb(p, q, h + 1 / 3);
  const g = hue2rgb(p, q, h);
  const b = hue2rgb(p, q, h - 1 / 3);
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function adjustPalette(base: string[]): string[] {
  return base.map((hex) => {
    const rgb = hexToRgb(hex);
    const [h, s, l] = rgbToHsl(rgb);
    const ns = Math.min(1, s * 1.18);
    const nl = Math.max(0, l * 0.92);
    const [r, g, b] = hslToRgb([h, ns, nl]);
    return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
  });
}

function rgbToRgba([r, g, b]: [number, number, number], alpha: number): string {
  return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${alpha.toFixed(3)})`;
}

function buildRamp(colors: string[], n: number, alphas: number[]): string[] {
  if (n <= 1) return [rgbToRgba(hexToRgb(colors[0]), alphas[0] ?? 0.6)];
  const stops = colors.map(hexToRgb);
  const ramp: string[] = [];
  for (let i = 0; i < n; i += 1) {
    const t = i / (n - 1);
    const idx = Math.min(stops.length - 2, Math.floor(t * (stops.length - 1)));
    const localT = (t * (stops.length - 1)) - idx;
    const a = stops[idx];
    const b = stops[idx + 1];
    const rgb: [number, number, number] = [
      lerp(a[0], b[0], localT),
      lerp(a[1], b[1], localT),
      lerp(a[2], b[2], localT),
    ];
    const alpha = alphas[Math.min(i, alphas.length - 1)];
    ramp.push(rgbToRgba(rgb, alpha));
  }
  return ramp;
}

function tailQuantileThresholds(values: number[]): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  const thresholds: number[] = [];
  Q_LEVELS.forEach((q) => {
    const idx = Math.max(0, Math.min(sorted.length - 1, Math.floor(q * (sorted.length - 1))));
    thresholds.push(sorted[idx]);
  });
  const unique: number[] = [];
  thresholds.forEach((t) => {
    const last = unique[unique.length - 1];
    if (last === undefined || t > last) unique.push(t);
  });
  return unique;
}

export function buildAutoColorExprFromValues(
  probsByH3: Record<string, number>,
  palette: string[] = BASE_PALETTE
): ColorScaleResult {
  const values = Object.values(probsByH3)
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v) && v > 0);
  if (values.length === 0) {
    return {
      fillColorExpr: ["case", ["<=", ["coalesce", ["get", "prob"], 0], 0], ZERO_COLOR, ZERO_COLOR],
      scale: null,
    };
  }

  let thresholds = tailQuantileThresholds(values);
  if (thresholds.length > 7) {
    thresholds = thresholds.slice(0, 7);
  }
  const bins = Math.max(1, thresholds.length + 1);
  const alphaRamp = Array.from({ length: bins }, (_, i) => {
    const t = i / Math.max(1, bins - 1);
    return 0.45 + t * (0.98 - 0.45);
  });
  const colors = buildRamp(adjustPalette(palette), bins, alphaRamp);

  if (thresholds.length === 0) {
    return {
      fillColorExpr: ["case", ["<=", ["coalesce", ["get", "prob"], 0], 0], ZERO_COLOR, colors[0] ?? ZERO_COLOR],
      scale: {
        thresholds: [],
        binColorsRgba: colors.length ? colors : [ZERO_COLOR],
        labels: LABELS,
        hotspotThreshold: undefined,
      },
    };
  }

  const stepExpr: unknown[] = ["step", ["get", "prob"], colors[0]];
  thresholds.forEach((t, i) => {
    stepExpr.push(t, colors[Math.min(i + 1, colors.length - 1)]);
  });

  const expr: unknown[] = ["case", ["<=", ["coalesce", ["get", "prob"], 0], 0], ZERO_COLOR, stepExpr];

  return {
    fillColorExpr: expr,
    scale: {
      thresholds,
      binColorsRgba: colors,
      labels: LABELS,
      hotspotThreshold: thresholds[thresholds.length - 1],
    },
  };
}

export function buildFillExprFromScale(scale: HeatScale, zeroColor = ZERO_COLOR): unknown[] {
  if (scale.thresholds.length === 0) {
    return [
      "case",
      ["<=", ["coalesce", ["get", "prob"], 0], 0],
      zeroColor,
      scale.binColorsRgba[0] ?? zeroColor,
    ];
  }
  const stepExpr: unknown[] = ["step", ["get", "prob"], scale.binColorsRgba[0]];
  scale.thresholds.forEach((t, i) => {
    stepExpr.push(t, scale.binColorsRgba[Math.min(i + 1, scale.binColorsRgba.length - 1)]);
  });
  return ["case", ["<=", ["coalesce", ["get", "prob"], 0], 0], zeroColor, stepExpr];
}

export function buildHotspotOnlyExpr(
  _scale: HeatScale,
  threshold: number,
  hotspotFill = "rgba(255,45,170,0.65)",
  zeroColor = "rgba(0,0,0,0)"
): unknown[] {
  return [
    "case",
    [">=", ["coalesce", ["get", "prob"], 0], threshold],
    hotspotFill,
    zeroColor,
  ];
}
