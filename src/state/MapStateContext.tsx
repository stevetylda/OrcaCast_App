import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { H3Resolution } from "../config/dataPaths";
import { appConfig } from "../config/appConfig";

type ThemeMode = "light" | "dark" | "system";
type CompareMode = "split" | "overlay";
type ScaleMode = "shared" | "separate";

type CompareSpec = {
  enabled: boolean;
  mode: CompareMode;
  scaleMode: ScaleMode;
  modelA: { model: string; year: number; period: number };
  modelB: { model: string; year: number; period: number };
  split: { syncDrag: boolean; fixed: boolean; splitPct: number };
  overlay: { opacity: number };
  selection: { h3: string | null };
  showDelta: boolean;
};

type MapState = {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  darkMode: boolean;
  resolution: H3Resolution;
  setResolution: (value: H3Resolution) => void;
  modelId: string;
  setModelId: (value: string) => void;
  forecastIndex: number;
  setForecastIndex: (value: number | ((prev: number) => number)) => void;
  lastWeekMode: "none" | "previous" | "selected" | "both";
  setLastWeekMode: (value: "none" | "previous" | "selected" | "both") => void;
  hotspotsEnabled: boolean;
  setHotspotsEnabled: (value: boolean) => void;
  hotspotMode: "modeled" | "custom";
  setHotspotMode: (value: "modeled" | "custom") => void;
  hotspotPercentile: number;
  setHotspotPercentile: (value: number) => void;
  layerMode: "observed" | "forecast";
  setLayerMode: (value: "observed" | "forecast") => void;
  ecotype: "srkw" | "transient" | "both";
  setEcotype: (value: "srkw" | "transient" | "both") => void;
  pointsVisible: boolean;
  setPointsVisible: (value: boolean) => void;
  compare: CompareSpec;
  setCompare: (value: CompareSpec | ((prev: CompareSpec) => CompareSpec)) => void;
};

const MapStateContext = createContext<MapState | null>(null);

const getSystemPrefersDark = () => {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false;
};

export function MapStateProvider({ children }: { children: ReactNode }) {
  const [themeMode, setThemeMode] = useState<ThemeMode>("dark");
  const [resolution, setResolution] = useState<H3Resolution>("H4");
  const [modelId, setModelId] = useState(appConfig.bestModelId);
  const [forecastIndex, setForecastIndex] = useState(-1);
  const [lastWeekMode, setLastWeekMode] = useState<
    "none" | "previous" | "selected" | "both"
  >("none");
  const [hotspotsEnabled, setHotspotsEnabled] = useState(false);
  const [hotspotMode, setHotspotMode] = useState<"modeled" | "custom">("modeled");
  const [hotspotPercentile, setHotspotPercentile] = useState(1);
  const [layerMode, setLayerMode] = useState<"observed" | "forecast">("forecast");
  const [ecotype, setEcotype] = useState<"srkw" | "transient" | "both">("srkw");
  const [pointsVisible, setPointsVisible] = useState(true);
  const [compare, setCompare] = useState<CompareSpec>({
    enabled: false,
    mode: "split",
    scaleMode: "shared",
    modelA: { model: appConfig.bestModelId, year: appConfig.forecastPeriod / 100 | 0, period: appConfig.forecastPeriod % 100 },
    modelB: { model: appConfig.bestModelId, year: appConfig.forecastPeriod / 100 | 0, period: appConfig.forecastPeriod % 100 },
    split: { syncDrag: true, fixed: true, splitPct: 50 },
    overlay: { opacity: 0.5 },
    selection: { h3: null },
    showDelta: true,
  });

  const darkMode = useMemo(() => {
    if (themeMode === "system") return getSystemPrefersDark();
    return themeMode === "dark";
  }, [themeMode]);

  const value = useMemo(
    () => ({
      themeMode,
      setThemeMode,
      darkMode,
      resolution,
      setResolution,
      modelId,
      setModelId,
      forecastIndex,
      setForecastIndex,
      lastWeekMode,
      setLastWeekMode,
      hotspotsEnabled,
      setHotspotsEnabled,
      hotspotMode,
      setHotspotMode,
      hotspotPercentile,
      setHotspotPercentile,
      layerMode,
      setLayerMode,
      ecotype,
      setEcotype,
      pointsVisible,
      setPointsVisible,
      compare,
      setCompare,
    }),
    [
      themeMode,
      darkMode,
      resolution,
      modelId,
      forecastIndex,
      lastWeekMode,
      hotspotsEnabled,
      hotspotMode,
      hotspotPercentile,
      layerMode,
      ecotype,
      pointsVisible,
      compare,
      setThemeMode,
      setResolution,
      setModelId,
      setForecastIndex,
      setLastWeekMode,
      setHotspotsEnabled,
      setHotspotMode,
      setHotspotPercentile,
      setLayerMode,
      setEcotype,
      setPointsVisible,
      setCompare,
    ]
  );

  return <MapStateContext.Provider value={value}>{children}</MapStateContext.Provider>;
}

export function useMapState() {
  const ctx = useContext(MapStateContext);
  if (!ctx) throw new Error("useMapState must be used within MapStateProvider");
  return ctx;
}
