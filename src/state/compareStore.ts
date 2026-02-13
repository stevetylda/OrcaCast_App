export type CompareViewMode = "split" | "overlay";

export type CompareSettings = {
  mode: CompareViewMode;
  sharedScale: boolean;
  syncDrag: boolean;
  fixedSplit: boolean;
  overlayOpacity: number;
  showDelta: boolean;
  splitPct: number;
};

export const DEFAULT_COMPARE_SETTINGS: CompareSettings = {
  mode: "split",
  sharedScale: true,
  syncDrag: true,
  fixedSplit: true,
  overlayOpacity: 0.5,
  showDelta: true,
  splitPct: 50,
};
