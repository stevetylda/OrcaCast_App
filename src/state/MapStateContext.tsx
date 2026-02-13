import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { H3Resolution } from "../config/dataPaths";
import { appConfig } from "../config/appConfig";
import { DEFAULT_COMPARE_SETTINGS, type CompareSettings, type CompareViewMode } from "./compareStore";

type ThemeMode = "light" | "dark" | "system";

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
  compareEnabled: boolean;
  setCompareEnabled: (value: boolean) => void;
  compareSettings: CompareSettings;
  setCompareSettings: (value: CompareSettings | ((prev: CompareSettings) => CompareSettings)) => void;
  compareMode: CompareViewMode;
  setCompareMode: (value: CompareViewMode) => void;
  selectedCompareH3: string | null;
  setSelectedCompareH3: (value: string | null) => void;
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
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [compareSettings, setCompareSettings] = useState<CompareSettings>(DEFAULT_COMPARE_SETTINGS);
  const [compareMode, setCompareMode] = useState<CompareViewMode>("split");
  const [selectedCompareH3, setSelectedCompareH3] = useState<string | null>(null);

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
      compareEnabled,
      setCompareEnabled,
      compareSettings,
      setCompareSettings,
      compareMode,
      setCompareMode,
      selectedCompareH3,
      setSelectedCompareH3,
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
      compareEnabled,
      compareSettings,
      compareMode,
      selectedCompareH3,
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
      setCompareEnabled,
      setCompareSettings,
      setCompareMode,
      setSelectedCompareH3,
    ]
  );

  return <MapStateContext.Provider value={value}>{children}</MapStateContext.Provider>;
}

export function useMapState() {
  const ctx = useContext(MapStateContext);
  if (!ctx) throw new Error("useMapState must be used within MapStateProvider");
  return ctx;
}
