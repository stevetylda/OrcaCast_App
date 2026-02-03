// import { useEffect, useMemo, useRef, useState } from "react";
// import maplibregl, { Map as MapLibreMap } from "maplibre-gl";
// import type { FeatureCollection } from "geojson";
// import { GeoJsonLayer } from "@deck.gl/layers";
// import { MapboxOverlay } from "@deck.gl/mapbox";
// import "maplibre-gl/dist/maplibre-gl.css";
// import { appConfig } from "../config/appConfig";
// import type { H3Resolution } from "../config/dataPaths";
// import { getKdeBandsPathForPeriod } from "../config/dataPaths";
// import { attachProbabilities, loadForecast, loadGrid } from "../data/forecastIO";
// import { buildKdeBandsCacheKey, loadKdeBandsGeojson } from "../data/kdeBandsIO";
// import { addGridOverlay, setGridVisibility, setHotspotVisibility } from "../map/gridOverlay";
// import {
//   buildAutoColorExprFromValues,
//   buildFillExprFromScale,
//   buildHotspotOnlyExpr,
//   ZERO_COLOR,
// } from "../map/colorScale";
// import type { HeatScale } from "../map/colorScale";
// import { isoWeekFromDate } from "../core/time/forecastPeriodToIsoWeek";
// import { ProbabilityLegend } from "./ProbabilityLegend";
// import type { DataDrivenPropertyValueSpecification } from "maplibre-gl";

// type FillColorSpec = DataDrivenPropertyValueSpecification<string>;

// type LastWeekMode = "none" | "previous" | "selected" | "both";

// type Props = {
//   darkMode: boolean;
//   resolution: H3Resolution;
//   showLastWeek: boolean;
//   lastWeekMode: LastWeekMode;
//   selectedWeek: number;
//   selectedWeekYear: number;
//   timeseriesOpen: boolean;
//   forecastPath?: string;
//   fallbackForecastPath?: string;
// };


// const PALETTE = [
//   "#123BFF",
//   "#1B74FF",
//   "#1AA8FF",
//   "#14D3FF",
//   "#00F5FF",
//   "#00FFC6",
//   "#00FFF0",
//   "#E8FFFD",
// ];

// const VOYAGER_STYLE = "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";
// const DARK_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

// const DEFAULT_CENTER: [number, number] = [-122.6, 47.6];
// const DEFAULT_ZOOM = 7;

// const LAST_WEEK_SOURCE_ID = "last-week-sightings";
// const LAST_WEEK_LAYER_ID = "last-week-sightings-circle";
// const LAST_WEEK_HALO_ID = "last-week-sightings-halo";
// const LAST_WEEK_RING_ID = "last-week-sightings-ring";
// const LAST_WEEK_WHITE_ID = "last-week-sightings-white";

// export function ForecastMap({
//   darkMode,
//   resolution,
//   showLastWeek,
//   lastWeekMode,
//   selectedWeek,
//   selectedWeekYear,
//   timeseriesOpen,
//   forecastPath,
//   fallbackForecastPath,
// }: Props) {
//   const containerRef = useRef<HTMLDivElement | null>(null);
//   const mapRef = useRef<MapLibreMap | null>(null);
//   const styleUrl = useMemo(() => (darkMode ? DARK_STYLE : VOYAGER_STYLE), [darkMode]);
//   const overlayRef = useRef<FeatureCollection | null>(null);
//   const fillExprRef = useRef<FillColorSpec | null>(null);
//   const hotspotThresholdRef = useRef<number | undefined>(undefined);
//   const [legendSpec, setLegendSpec] = useState<HeatScale | null>(null);
//   const [legendOpen, setLegendOpen] = useState(true);
//   const [hotspotsOnly, setHotspotsOnly] = useState(false);
//   const [showKdeContours, setShowKdeContours] = useState(false);
//   const [kdeBands, setKdeBands] = useState<FeatureCollection | null>(null);
//   const [kdeWarning, setKdeWarning] = useState<string | null>(null);
//   const [mapReady, setMapReady] = useState(false);
//   const legendSpecRef = useRef<HeatScale | null>(null);
//   const hotspotsOnlyRef = useRef(false);
//   const showKdeContoursRef = useRef(false);
//   const showLastWeekRef = useRef(false);
//   const lastWeekKeyRef = useRef<string | null>(null);
//   const lastWeekModeRef = useRef(lastWeekMode);
//   const selectedWeekRef = useRef(selectedWeek);
//   const selectedWeekYearRef = useRef(selectedWeekYear);
//   const styleUrlRef = useRef(styleUrl);
//   const lastWeekDataRef = useRef<Record<string, FeatureCollection | null>>({});
//   const lastWeekPopupRef = useRef<maplibregl.Popup | null>(null);
//   const deckOverlayRef = useRef<MapboxOverlay | null>(null);

//   useEffect(() => {
//     styleUrlRef.current = styleUrl;
//   }, [styleUrl]);

//   useEffect(() => {
//     legendSpecRef.current = legendSpec;
//   }, [legendSpec]);

//   useEffect(() => {
//     hotspotsOnlyRef.current = hotspotsOnly;
//   }, [hotspotsOnly]);

//   useEffect(() => {
//     showKdeContoursRef.current = showKdeContours;
//   }, [showKdeContours]);

//   useEffect(() => {
//     if (showKdeContours) return;
//     setKdeBands(null);
//     setKdeWarning(null);
//   }, [showKdeContours]);

//   useEffect(() => {
//     showLastWeekRef.current = showLastWeek;
//   }, [showLastWeek]);

//   useEffect(() => {
//     lastWeekModeRef.current = lastWeekMode;
//   }, [lastWeekMode]);

//   useEffect(() => {
//     selectedWeekRef.current = selectedWeek;
//     selectedWeekYearRef.current = selectedWeekYear;
//   }, [selectedWeek, selectedWeekYear]);

//   const applyLastWeekFromCache = (map: MapLibreMap) => {
//     if (!showLastWeekRef.current) return;
//     const key = lastWeekKeyRef.current;
//     if (!key) return;
//     const raw = lastWeekDataRef.current[key];
//     if (!raw) return;
//     const previous = getPreviousWeek(selectedWeekYearRef.current, selectedWeekRef.current);
//     const tagged = tagSightings(
//       raw,
//       lastWeekModeRef.current,
//       { year: selectedWeekYearRef.current, week: selectedWeekRef.current },
//       previous
//     );
//     if ((tagged.features ?? []).length === 0) return;
//     ensureLastWeekLayer(map, tagged);
//     moveLastWeekToTop(map);
//   };

//   useEffect(() => {
//     if (!containerRef.current || mapRef.current) return;

//     // const map = new maplibregl.Map({
//     //   container: containerRef.current,
//     //   style: styleUrl,
//     //   center: DEFAULT_CENTER,
//     //   zoom: DEFAULT_ZOOM,
//     //   attributionControl: false,
//     //   preserveDrawingBuffer: false,
//     //   // @ts-expect-error: not in older typings
//     //   cooperativeGestures: false,
//     // });

//     // Some MapLibre options exist at runtime but aren't present in the published TS types.
//   type MapOptionsPatched = maplibregl.MapOptions & {
//     preserveDrawingBuffer?: boolean;
//     cooperativeGestures?: boolean;
//   };

//   const mapOptions: MapOptionsPatched = {
//     container: containerRef.current,
//     style: styleUrl,
//     center: DEFAULT_CENTER,
//     zoom: DEFAULT_ZOOM,
//     attributionControl: false,
//     preserveDrawingBuffer: false,
//     cooperativeGestures: false,
//   };

//   const map = new maplibregl.Map(mapOptions);


//     map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-right");

//     // map.on("error", (e: any) => {
//     map.on("error", (e: { error?: unknown }) => {
//       // eslint-disable-next-line no-console
//       console.error("[MapLibre] error:", e?.error || e);
//     });

//     lastWeekPopupRef.current = new maplibregl.Popup({
//       closeButton: false,
//       closeOnClick: false,
//       offset: 10,
//     });

//     const canvas = map.getCanvas();
//     const onContextLost = (event: Event) => {
//       event.preventDefault();
//       // eslint-disable-next-line no-console
//       console.warn("[MapLibre] WebGL context lost");
//     };
//     const onContextRestored = () => {
//       // eslint-disable-next-line no-console
//       console.warn("[MapLibre] WebGL context restored");
//       if (!mapRef.current) return;
//       const nextStyle = styleUrlRef.current;
//       const center = mapRef.current.getCenter();
//       const zoom = mapRef.current.getZoom();
//       const bearing = mapRef.current.getBearing();
//       const pitch = mapRef.current.getPitch();
//       mapRef.current.setStyle(nextStyle);
//       mapRef.current.once("styledata", () => {
//         if (!mapRef.current) return;
//         try {
//           mapRef.current.jumpTo({ center, zoom, bearing, pitch });
//         } catch {
//           // no-op
//         }
//         mapRef.current.resize();
//         renderForecastLayer(mapRef.current);
//         applyLastWeekFromCache(mapRef.current);
//       });
//     };
//     canvas.addEventListener("webglcontextlost", onContextLost, false);
//     canvas.addEventListener("webglcontextrestored", onContextRestored, false);

//     map.once("load", () => {
//       setMapReady(true);
//     });

//     mapRef.current = map;
//     const deckOverlay = new MapboxOverlay({ interleaved: true, layers: [] });
//     map.addControl(deckOverlay);
//     deckOverlayRef.current = deckOverlay;

//     return () => {
//       canvas.removeEventListener("webglcontextlost", onContextLost);
//       canvas.removeEventListener("webglcontextrestored", onContextRestored);
//       if (deckOverlayRef.current) {
//         map.removeControl(deckOverlayRef.current);
//         deckOverlayRef.current = null;
//       }
//       map.remove();
//       mapRef.current = null;
//     };
//   }, []);

//   const renderForecastLayer = (map: MapLibreMap) => {
//     if (!overlayRef.current) return;
//     const scale = legendSpecRef.current;
//     const threshold = scale?.hotspotThreshold ?? hotspotThresholdRef.current;
//     const hotspots = hotspotsOnlyRef.current;
//     const fillExpr: FillColorSpec | undefined =
//       hotspots && threshold !== undefined
//         ? (buildHotspotOnlyExpr(threshold) as unknown as FillColorSpec)
//         : scale
//           ? (buildFillExprFromScale(scale) as unknown as FillColorSpec)
//           : fillExprRef.current ?? undefined;

//     if (fillExpr) {
//       fillExprRef.current = fillExpr;
//     }

//     addGridOverlay(map, overlayRef.current, fillExpr, threshold, hotspots);

//     const showGrid = !showKdeContoursRef.current;
//     setGridVisibility(map, showGrid);
//     setHotspotVisibility(map, showGrid && hotspots);
//     moveLastWeekToTop(map);
//   };

//   useEffect(() => {
//     const map = mapRef.current;
//     if (!map || !mapReady) return;

//     const currentStyle = map.getStyle();
//     const currentName = currentStyle?.name ?? "";
//     const wantsDark = styleUrl.includes("dark-matter");
//     const isDarkNow = currentName.toLowerCase().includes("dark");

//     if ((wantsDark && isDarkNow) || (!wantsDark && !isDarkNow)) return;

//     const center = map.getCenter();
//     const zoom = map.getZoom();
//     const bearing = map.getBearing();
//     const pitch = map.getPitch();

//     map.setStyle(styleUrl);

//     map.once("styledata", () => {
//       try {
//         map.jumpTo({ center, zoom, bearing, pitch });
//       } catch {
//         // no-op
//       }
//       map.resize();
//       renderForecastLayer(map);
//       applyLastWeekFromCache(map);
//     });
//   }, [styleUrl, showLastWeek]);

//   const getIsoWeekYearFromDate = (date: Date) => {
//     const temp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
//     const dayNum = temp.getUTCDay() || 7;
//     temp.setUTCDate(temp.getUTCDate() + 4 - dayNum);
//     return temp.getUTCFullYear();
//   };

//   const getPreviousWeek = (year: number, week: number) => {
//     if (week > 1) {
//       return { year, week: week - 1 };
//     }
//     const dec28 = new Date(Date.UTC(year - 1, 11, 28));
//     return { year: year - 1, week: isoWeekFromDate(dec28) };
//   };

//   const buildLastWeekUrl = (key: string) => {
//     const base = import.meta.env.BASE_URL || "/";
//     const cleanBase = base.endsWith("/") ? base : `${base}/`;
//     return `${cleanBase}data/last_week_sightings/last_week_sightings_${key}.geojson`;
//   };

//   const tagSightings = (
//     data: FeatureCollection,
//     mode: "previous" | "selected" | "both",
//     selected: { year: number; week: number },
//     previous: { year: number; week: number }
//   ) => {
//     const parseNum = (value: unknown): number => {
//       if (typeof value === "number") return value;
//       if (typeof value === "string") {
//         const cleaned = value.trim().replace(/[^0-9]/g, "");
//         return cleaned.length ? Number(cleaned) : Number.NaN;
//       }
//       return Number.NaN;
//     };
//     const rows = (data.features ?? []).map((feature) => {
//       const props = (feature.properties ?? {}) as Record<string, unknown>;
//       const year = parseNum(props.YEAR ?? props.year ?? props.Year);
//       const week = parseNum(
//         props.WEEK ??
//           props.week ??
//           props.Week ??
//           props.STAT_WEEK ??
//           props.stat_week ??
//           props.Stat_Week
//       );
//       return { feature, props, year, week };
//     });
//     // eslint-disable-next-line no-console
//     console.debug("[Sightings] sample rows", rows.slice(0, 5).map((r) => ({ year: r.year, week: r.week })));
//     // eslint-disable-next-line no-console
//     console.debug("[Sightings] first props", rows[0]?.props ?? null);

//     const counts = rows.reduce(
//       (acc, row) => {
//         if (Number.isFinite(row.year) && Number.isFinite(row.week)) {
//           if (row.year === selected.year && row.week === selected.week) acc.selected += 1;
//           if (row.year === previous.year && row.week === previous.week) acc.previous += 1;
//         }
//         return acc;
//       },
//       { selected: 0, previous: 0 }
//     );
//     // eslint-disable-next-line no-console
//     console.debug("[Sightings] classify", {
//       selected,
//       previous,
//       mode,
//       counts,
//       total: rows.length,
//     });

//     return {
//       ...data,
//       features: rows.flatMap((row) => {
//         let sightingMode: "previous" | "selected" | null = null;
//         if (Number.isFinite(row.week)) {
//           if (Number.isFinite(row.year)) {
//             if (row.year === previous.year && row.week === previous.week) sightingMode = "previous";
//             if (row.year === selected.year && row.week === selected.week) sightingMode = "selected";
//           } else {
//             if (row.week === previous.week) sightingMode = "previous";
//             if (row.week === selected.week) sightingMode = "selected";
//           }
//         } else {
//           sightingMode = mode === "previous" ? "previous" : "selected";
//         }
//         if (!sightingMode) return [];
//         if (mode === "previous" && sightingMode !== "previous") return [];
//         if (mode === "selected" && sightingMode !== "selected") return [];
//         return [
//           {
//             ...row.feature,
//             properties: {
//               ...row.props,
//               sightingMode,
//             },
//           },
//         ];
//       }),
//     };
//   };

//   useEffect(() => {
//     const map = mapRef.current;
//     if (!map) return;

//     let cancelled = false;

//     const loadOverlay = async () => {
//       try {
//         const grid = await loadGrid(resolution);
//         let values: Record<string, number> = {};

//         try {
//           let forecast;
//           if (forecastPath) {
//             try {
//               forecast = await loadForecast(resolution, { kind: "explicit", explicitPath: forecastPath });
//             } catch (err) {
//               if (fallbackForecastPath && fallbackForecastPath !== forecastPath) {
//                 // eslint-disable-next-line no-console
//                 console.warn("[Forecast] explicit path failed, falling back to latest period", err);
//                 forecast = await loadForecast(resolution, { kind: "explicit", explicitPath: fallbackForecastPath });
//               } else {
//                 throw err;
//               }
//             }
//           } else if (fallbackForecastPath) {
//             forecast = await loadForecast(resolution, { kind: "explicit", explicitPath: fallbackForecastPath });
//           }
//           values = forecast?.values ?? {};
//         } catch (err) {
//           // eslint-disable-next-line no-console
//           console.warn("[Forecast] failed to load, rendering empty layer", err);
//         }

//         if (cancelled) return;
//         const joined = attachProbabilities(grid, values);
//         const { fillColorExpr, scale } = buildAutoColorExprFromValues(values, PALETTE);
//         const valueList = Object.values(values)
//           .map((v) => Number(v))
//           .filter((v) => Number.isFinite(v));
//         hotspotThresholdRef.current =
//           valueList.length > 0 ? Math.max(...valueList) : undefined;
//         overlayRef.current = joined;
//         fillExprRef.current = fillColorExpr as unknown as FillColorSpec;
//         if (scale?.hotspotThreshold !== undefined) {
//           hotspotThresholdRef.current = scale.hotspotThreshold;
//         }
//         legendSpecRef.current = scale;
//         setLegendSpec(scale);
//         if (!scale) {
//           setLegendOpen(false);
//         }

//         if (map.isStyleLoaded()) {
//           renderForecastLayer(map);
//           moveLastWeekToTop(map);
//         } else {
//           map.once("styledata", () => {
//             if (!overlayRef.current) return;
//             renderForecastLayer(map);
//             moveLastWeekToTop(map);
//           });
//         }
//       } catch (err) {
//         // eslint-disable-next-line no-console
//         console.warn("[Forecast] failed to load grid", err);
//       }
//     };

//     loadOverlay();

//     return () => {
//       cancelled = true;
//     };
//   }, [resolution, mapReady, forecastPath]);

//   useEffect(() => {
//     const map = mapRef.current;
//     if (!map) return;

//     const applyVisibility = (visible: boolean) => {
//       const visibility = visible ? "visible" : "none";
//       if (map.getLayer(LAST_WEEK_LAYER_ID)) {
//         map.setLayoutProperty(LAST_WEEK_LAYER_ID, "visibility", visibility);
//       }
//       if (map.getLayer(LAST_WEEK_HALO_ID)) {
//         map.setLayoutProperty(LAST_WEEK_HALO_ID, "visibility", visibility);
//       }
//       if (map.getLayer(LAST_WEEK_RING_ID)) {
//         map.setLayoutProperty(LAST_WEEK_RING_ID, "visibility", visibility);
//       }
//       if (map.getLayer(LAST_WEEK_WHITE_ID)) {
//         map.setLayoutProperty(LAST_WEEK_WHITE_ID, "visibility", visibility);
//       }
//     };

//     if (!showLastWeek) {
//       applyVisibility(false);
//       return;
//     }

//     const attach = (data: FeatureCollection) => {
//       ensureLastWeekLayer(map, data);
//       applyVisibility(true);
//     };

//     if (!Number.isFinite(selectedWeekYear) || !Number.isFinite(selectedWeek) || selectedWeek <= 0) {
//       applyVisibility(false);
//       return;
//     }

//     const previous = getPreviousWeek(selectedWeekYear, selectedWeek);
//     const key = `${selectedWeekYear}-W${selectedWeek}`;
//     lastWeekKeyRef.current = key;
//     ensureLastWeekLayer(map, { type: "FeatureCollection", features: [] });
//     applyVisibility(false);

//     const applyTagged = (raw: FeatureCollection | null) => {
//       if (!raw) {
//         applyVisibility(false);
//         return;
//       }
//       const tagged = tagSightings(
//         raw,
//         lastWeekMode,
//         { year: selectedWeekYear, week: selectedWeek },
//         previous
//       );
//       if ((tagged.features ?? []).length === 0) {
//         applyVisibility(false);
//         return;
//       }
//       attach(tagged);
//     };

//     if (key in lastWeekDataRef.current) {
//       applyTagged(lastWeekDataRef.current[key] ?? null);
//       return;
//     }

//     let active = true;
//     const load = async () => {
//       try {
//         const url = `${buildLastWeekUrl(key)}?v=${Date.now()}`;
//         const res = await fetch(url, { cache: "no-store" });
//         if (res.status === 404 || res.status === 204) {
//           lastWeekDataRef.current[key] = null;
//           if (active) applyVisibility(false);
//           return;
//         }
//         if (!res.ok) throw new Error(`Failed to fetch last week sightings: ${res.status}`);
//         const text = await res.text();
//         const trimmed = text.trim();
//         if (trimmed.startsWith("<") || trimmed.length === 0) {
//           lastWeekDataRef.current[key] = null;
//           if (active) applyVisibility(false);
//           return;
//         }
//         const data = JSON.parse(trimmed) as FeatureCollection;
//         // eslint-disable-next-line no-console
//         console.debug("[Sightings] loaded", {
//           url,
//           first: data.features?.[0]?.properties ?? null,
//         });
//         lastWeekDataRef.current[key] = data;
//         if (!active) return;
//         if (!map.isStyleLoaded()) {
//           map.once("styledata", () => {
//             if (active) applyTagged(data);
//           });
//         } else {
//           applyTagged(data);
//         }
//       } catch (err) {
//         // eslint-disable-next-line no-console
//         console.warn("[Sightings] failed to load last week sightings", err);
//       }
//     };

//     load();
//     return () => {
//       active = false;
//     };
//   }, [showLastWeek, lastWeekMode, selectedWeek, selectedWeekYear]);

//   useEffect(() => {
//     const map = mapRef.current;
//     const el = containerRef.current;
//     if (!map || !el) return;

//     const ro = new ResizeObserver(() => {
//       map.resize();
//     });
//     ro.observe(el);

//     return () => ro.disconnect();
//   }, []);

//   useEffect(() => {
//     const map = mapRef.current;
//     if (!map) return;
//     const raf = window.requestAnimationFrame(() => {
//       map.resize();
//       map.triggerRepaint();
//     });
//     const t1 = window.setTimeout(() => {
//       map.resize();
//       map.triggerRepaint();
//     }, 80);
//     const t2 = window.setTimeout(() => {
//       map.resize();
//       map.triggerRepaint();
//     }, 240);
//     const t3 = window.setTimeout(() => {
//       if (!map.isStyleLoaded()) {
//         const nextStyle = styleUrlRef.current;
//         const center = map.getCenter();
//         const zoom = map.getZoom();
//         const bearing = map.getBearing();
//         const pitch = map.getPitch();
//         map.setStyle(nextStyle);
//         map.once("styledata", () => {
//           try {
//             map.jumpTo({ center, zoom, bearing, pitch });
//           } catch {
//             // no-op
//           }
//           map.resize();
//           renderForecastLayer(map);
//           applyLastWeekFromCache(map);
//         });
//       }
//     }, 420);
//     return () => {
//       window.cancelAnimationFrame(raf);
//       window.clearTimeout(t1);
//       window.clearTimeout(t2);
//       window.clearTimeout(t3);
//     };
//   }, [timeseriesOpen]);

//   useEffect(() => {
//     const map = mapRef.current;
//     if (!map) return;
//     const id = window.setTimeout(() => {
//       map.resize();
//       map.triggerRepaint();
//     }, 50);
//     return () => window.clearTimeout(id);
//   }, [legendSpec]);

//   type MapMouseEventWithFeatures = maplibregl.MapMouseEvent & {
//     features?: Array<{ properties?: { datetime?: string } }>;
//   };


//   useEffect(() => {
//     const map = mapRef.current;
//     if (!map || !lastWeekPopupRef.current) return;

//     const popup = lastWeekPopupRef.current;
//     // const onMove = (e: maplibregl.MapMouseEvent & maplibregl.EventData) => {
//       const onMove = (e: MapMouseEventWithFeatures) => {
//       const feature = e.features?.[0] as { properties?: { datetime?: string } } | undefined;
//       const datetime = feature?.properties?.datetime;
//       if (!datetime) return;
//       popup.setLngLat(e.lngLat).setHTML(`<div style=\"font-size:12px;\">${datetime}</div>`).addTo(map);
//     };
//     const onLeave = () => popup.remove();

//     map.on("mousemove", LAST_WEEK_LAYER_ID, onMove);
//     map.on("mouseleave", LAST_WEEK_LAYER_ID, onLeave);

//     return () => {
//       map.off("mousemove", LAST_WEEK_LAYER_ID, onMove);
//       map.off("mouseleave", LAST_WEEK_LAYER_ID, onLeave);
//       popup.remove();
//     };
//   }, []);

//   useEffect(() => {
//     const map = mapRef.current;
//     // no sparkle animation timer
//     if (!map || !overlayRef.current) return;
//     if (!map.isStyleLoaded()) {
//       map.once("styledata", () => {
//         if (!mapRef.current || !overlayRef.current || !legendSpec) return;
//         renderForecastLayer(mapRef.current);
//         moveLastWeekToTop(mapRef.current);
//       });
//       return;
//     }
//     renderForecastLayer(map);
//     moveLastWeekToTop(map);
//   }, [hotspotsOnly, legendSpec]);

//   useEffect(() => {
//     const map = mapRef.current;
//     if (!map || !mapReady) return;
//     const showGrid = !showKdeContours;
//     setGridVisibility(map, showGrid);
//     setHotspotVisibility(map, showGrid && hotspotsOnly);
//   }, [showKdeContours, hotspotsOnly, mapReady]);

//   useEffect(() => {
//     const map = mapRef.current;
//     if (!map || !showKdeContours) return;
//     if (!Number.isFinite(selectedWeekYear) || !Number.isFinite(selectedWeek) || selectedWeek <= 0) {
//       setKdeWarning("No blurred KDE GeoJSON available for this period.");
//       setKdeBands(null);
//       return;
//     }

//     let active = true;
//     const runId = appConfig.kdeBandsRunId;
//     const areaMinKm2 = appConfig.kdeBandsAreaMinKm2;
//     const holeMinKm2 = appConfig.kdeBandsHoleMinKm2;
//     const path = getKdeBandsPathForPeriod(
//       resolution,
//       selectedWeekYear,
//       selectedWeek,
//       runId,
//       appConfig.kdeBandsFolder
//     );
//     const cacheKey = buildKdeBandsCacheKey({
//       runId,
//       folder: appConfig.kdeBandsFolder,
//       resolution,
//       year: selectedWeekYear,
//       statWeek: selectedWeek,
//       areaMinKm2,
//       holeMinKm2,
//     });

//     loadKdeBandsGeojson(path, cacheKey)
//       .then((data) => {
//         if (!active) return;
//         setKdeBands(data);
//         setKdeWarning(null);
//       })
//       .catch(() => {
//         if (!active) return;
//         setKdeBands(null);
//         setKdeWarning("No blurred KDE GeoJSON available for this period.");
//       });

//     return () => {
//       active = false;
//     };
//   }, [showKdeContours, selectedWeekYear, selectedWeek, resolution]);

//   useEffect(() => {
//     const overlay = deckOverlayRef.current;
//     if (!overlay) return;
//     if (!showKdeContours || !kdeBands) {
//       overlay.setProps({ layers: [] });
//       return;
//     }
//     const layer = new GeoJsonLayer({
//       id: "kde-bands",
//       data: kdeBands,
//       filled: true,
//       stroked: true,
//       opacity: 0.8,
//       lineWidthMinPixels: 0.2,
//       getFillColor: (feature) => rgbaStringToArray(getKdeBandColor(feature, legendSpec)) ?? [0, 0, 0, 0],
//       getLineColor: (feature) => rgbaStringToArray(getKdeBandColor(feature, legendSpec)) ?? [0, 0, 0, 0],
//       getLineWidth: 0.4,
//       pickable: false,
//       parameters: { depthTest: false },
//     });
//     overlay.setProps({ layers: [layer] });
//   }, [showKdeContours, kdeBands, legendSpec]);


//   return (
//     <>
//       <div ref={containerRef} className="map" />
//       {legendSpec && (
//         <div className="map__cornerRightBottom">
//           <button
//             className={
//               showKdeContours
//                 ? "iconBtn legendClusterBtn legendKde legendKde--active"
//                 : "iconBtn legendClusterBtn legendKde"
//             }
//             onClick={() => setShowKdeContours((v) => !v)}
//             aria-label="Blurred (precomputed)"
//           >
//             <span className="material-symbols-rounded">blur_on</span>
//           </button>
//           <button
//             className={
//               hotspotsOnly
//                 ? "iconBtn legendClusterBtn legendHotspots legendHotspots--active"
//                 : "iconBtn legendClusterBtn legendHotspots"
//             }
//             onClick={() =>
//               setHotspotsOnly((v) => {
//                 const next = !v;
//                 if (next) setShowKdeContours(false);
//                 return next;
//               })
//             }
//             aria-label="Toggle hotspots"
//           >
//             <span className="material-symbols-rounded">local_fire_department</span>
//           </button>
//           <button
//             className="iconBtn legendClusterBtn"
//             onClick={() => setLegendOpen((v) => !v)}
//             aria-label={legendOpen ? "Hide legend" : "Show legend"}
//           >
//             <span className="material-symbols-rounded">legend_toggle</span>
//           </button>
//         </div>
//       )}
//       {legendSpec && legendOpen && <ProbabilityLegend scale={legendSpec} />}
//       {kdeWarning && (
//         <div className="map__kdeWarning" role="status" aria-live="polite">
//           <span className="material-symbols-rounded" aria-hidden="true">
//             warning
//           </span>
//           <span>{kdeWarning}</span>
//         </div>
//       )}
//     </>
//   );
// }

// function getKdeBandColor(
//   feature: { properties?: Record<string, unknown> },
//   scale: HeatScale | null
// ): string {
//   if (!feature?.properties) return "";
//   const { properties } = feature;
//   const label = typeof properties.label === "string" ? properties.label.toLowerCase() : "";
//   const level = Number(properties.level);
//   const bin = Number(properties.bin ?? properties.band_index);
//   if (
//     label.includes("no probability") ||
//     (Number.isFinite(level) && level <= 0) ||
//     (Number.isFinite(bin) && bin < 0)
//   ) {
//     return ZERO_COLOR;
//   }
//   if (scale && scale.binColorsRgba.length > 0) {
//     if (label) {
//       const labelIndex = scale.labels.findIndex(
//         (entry) => entry.toLowerCase() === label
//       );
//       if (labelIndex > 0) {
//         const swatch = scale.binColorsRgba[labelIndex - 1];
//         if (typeof swatch === "string") {
//           return swatch;
//         }
//       }
//     }
//     if (Number.isFinite(bin)) {
//       const idx = Math.max(0, Math.min(scale.binColorsRgba.length - 1, Math.floor(bin)));
//       const swatch = scale.binColorsRgba[idx];
//       if (typeof swatch === "string") {
//         return swatch;
//       }
//     }
//   }
//   const value = properties.color ?? properties.fill;
//   return typeof value === "string" ? value : "";
// }

// function rgbaStringToArray(value: string): [number, number, number, number] | null {
//   const match = value.match(/rgba?\(([^)]+)\)/i);
//   if (!match) return null;
//   const parts = match[1].split(",").map((part) => Number(part.trim()));
//   if (parts.length < 3) return null;
//   const [r, g, b] = parts;
//   const a = parts.length >= 4 ? parts[3] : 1;
//   if (![r, g, b, a].every((v) => Number.isFinite(v))) return null;
//   return [Math.round(r), Math.round(g), Math.round(b), Math.round(a * 255)];
// }

// function ensureLastWeekLayer(map: MapLibreMap, data: FeatureCollection) {
//   if (map.getSource(LAST_WEEK_SOURCE_ID)) {
//     const source = map.getSource(LAST_WEEK_SOURCE_ID) as maplibregl.GeoJSONSource;
//     source.setData(data);
//   } else {
//     map.addSource(LAST_WEEK_SOURCE_ID, { type: "geojson", data });
//   }

//   if (!map.getLayer(LAST_WEEK_HALO_ID)) {
//     map.addLayer({
//       id: LAST_WEEK_HALO_ID,
//       type: "circle",
//       source: LAST_WEEK_SOURCE_ID,
//       paint: {
//         "circle-color": "rgba(0,255,240,0.18)",
//         "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 2.8, 8, 4, 11, 5],
//         "circle-blur": 0.9,
//         "circle-opacity": 0.65,
//       },
//     });
//   }

//   if (map.getLayer(LAST_WEEK_RING_ID)) {
//     map.setPaintProperty(LAST_WEEK_RING_ID, "circle-stroke-color", [
//       "match",
//       ["get", "sightingMode"],
//       "previous",
//       "#FF3B5C",
//       "selected",
//       "#7CFF6B",
//       "#FF3B5C",
//     ]);
//     map.setPaintProperty(LAST_WEEK_RING_ID, "circle-radius", [
//       "interpolate",
//       ["linear"],
//       ["zoom"],
//       5,
//       2.6,
//       8,
//       3.6,
//       11,
//       4.6,
//     ]);
//     map.setPaintProperty(LAST_WEEK_RING_ID, "circle-stroke-width", 2.2);
//   } else {
//     map.addLayer({
//       id: LAST_WEEK_RING_ID,
//       type: "circle",
//       source: LAST_WEEK_SOURCE_ID,
//       paint: {
//         "circle-color": "rgba(0,0,0,0)",
//         "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 2.6, 8, 3.6, 11, 4.6],
//         "circle-stroke-width": 2.2,
//         "circle-stroke-color": [
//           "match",
//           ["get", "sightingMode"],
//           "previous",
//           "#FF3B5C",
//           "selected",
//           "#7CFF6B",
//           "#FF3B5C",
//         ],
//         "circle-opacity": 0.9,
//       },
//     });
//   }

//   if (map.getLayer(LAST_WEEK_WHITE_ID)) {
//     map.setPaintProperty(LAST_WEEK_WHITE_ID, "circle-radius", [
//       "interpolate",
//       ["linear"],
//       ["zoom"],
//       5,
//       3.1,
//       8,
//       4.2,
//       11,
//       5.4,
//     ]);
//     map.setPaintProperty(LAST_WEEK_WHITE_ID, "circle-stroke-width", 1.2);
//   } else {
//     map.addLayer({
//       id: LAST_WEEK_WHITE_ID,
//       type: "circle",
//       source: LAST_WEEK_SOURCE_ID,
//       paint: {
//         "circle-color": "rgba(0,0,0,0)",
//         "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 3.1, 8, 4.2, 11, 5.4],
//         "circle-stroke-width": 1.2,
//         "circle-stroke-color": "rgba(255,255,255,0.9)",
//         "circle-opacity": 0.9,
//       },
//     });
//   }

//   if (!map.getLayer(LAST_WEEK_LAYER_ID)) {
//     map.addLayer({
//       id: LAST_WEEK_LAYER_ID,
//       type: "circle",
//       source: LAST_WEEK_SOURCE_ID,
//       paint: {
//         "circle-color": "rgba(255,255,255,0.98)",
//         "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 1.2, 8, 1.9, 11, 2.8],
//         "circle-stroke-color": "#06184a",
//         "circle-stroke-width": 1.4,
//         "circle-opacity": 0.95,
//       },
//     });
//   }

//   moveLastWeekToTop(map);
// }

// function moveLastWeekToTop(map: MapLibreMap) {
//   if (map.getLayer(LAST_WEEK_HALO_ID)) {
//     map.moveLayer(LAST_WEEK_HALO_ID);
//   }
//   if (map.getLayer(LAST_WEEK_WHITE_ID)) {
//     map.moveLayer(LAST_WEEK_WHITE_ID);
//   }
//   if (map.getLayer(LAST_WEEK_RING_ID)) {
//     map.moveLayer(LAST_WEEK_RING_ID);
//   }
//   if (map.getLayer(LAST_WEEK_LAYER_ID)) {
//     map.moveLayer(LAST_WEEK_LAYER_ID);
//   }
// }

import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { Map as MapLibreMap } from "maplibre-gl";
import type { FeatureCollection } from "geojson";
import { GeoJsonLayer } from "@deck.gl/layers";
import { MapboxOverlay } from "@deck.gl/mapbox";
import "maplibre-gl/dist/maplibre-gl.css";
import { appConfig } from "../config/appConfig";
import type { H3Resolution } from "../config/dataPaths";
import { getKdeBandsPathForPeriod } from "../config/dataPaths";
import { attachProbabilities, loadForecast, loadGrid } from "../data/forecastIO";
import { buildKdeBandsCacheKey, loadKdeBandsGeojson } from "../data/kdeBandsIO";
import {
  addGridOverlay,
  setGridBaseVisibility,
  setGridVisibility,
  setHotspotVisibility,
} from "../map/gridOverlay";
import {
  buildAutoColorExprFromValues,
  buildFillExprFromScale,
  buildHotspotOnlyExpr,
  ZERO_COLOR,
} from "../map/colorScale";
import type { HeatScale } from "../map/colorScale";
import { isoWeekFromDate } from "../core/time/forecastPeriodToIsoWeek";
import { ProbabilityLegend } from "./ProbabilityLegend";
import type { DataDrivenPropertyValueSpecification } from "maplibre-gl";

type FillColorSpec = DataDrivenPropertyValueSpecification<string>;
type LastWeekMode = "none" | "previous" | "selected" | "both";

type Props = {
  darkMode: boolean;
  resolution: H3Resolution;
  showLastWeek: boolean;
  lastWeekMode: LastWeekMode;
  selectedWeek: number;
  selectedWeekYear: number;
  timeseriesOpen: boolean;
  forecastPath?: string;
  fallbackForecastPath?: string;
};

const PALETTE = [
  "#123BFF",
  "#1B74FF",
  "#1AA8FF",
  "#14D3FF",
  "#00F5FF",
  "#00FFC6",
  "#00FFF0",
  "#E8FFFD",
];

const VOYAGER_STYLE = "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";
const DARK_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

const DEFAULT_CENTER: [number, number] = [-122.6, 47.6];
const DEFAULT_ZOOM = 7;

const LAST_WEEK_SOURCE_ID = "last-week-sightings";
const LAST_WEEK_LAYER_ID = "last-week-sightings-circle";
const LAST_WEEK_HALO_ID = "last-week-sightings-halo";
const LAST_WEEK_RING_ID = "last-week-sightings-ring";
const LAST_WEEK_WHITE_ID = "last-week-sightings-white";

export function ForecastMap({
  darkMode,
  resolution,
  showLastWeek,
  lastWeekMode,
  selectedWeek,
  selectedWeekYear,
  timeseriesOpen,
  forecastPath,
  fallbackForecastPath,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const styleUrl = useMemo(() => (darkMode ? DARK_STYLE : VOYAGER_STYLE), [darkMode]);
  const overlayRef = useRef<FeatureCollection | null>(null);
  const fillExprRef = useRef<FillColorSpec | null>(null);
  const hotspotThresholdRef = useRef<number | undefined>(undefined);
  const shimmerThresholdRef = useRef<number | undefined>(undefined);
  const [legendSpec, setLegendSpec] = useState<HeatScale | null>(null);
  const [legendOpen, setLegendOpen] = useState(true);
  const [hotspotsOnly, setHotspotsOnly] = useState(false);
  const [showKdeContours, setShowKdeContours] = useState(false);
  const [kdeBands, setKdeBands] = useState<FeatureCollection | null>(null);
  const [kdeWarning, setKdeWarning] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const legendSpecRef = useRef<HeatScale | null>(null);
  const hotspotsOnlyRef = useRef(false);
  const showKdeContoursRef = useRef(false);
  const showLastWeekRef = useRef(false);
  const lastWeekKeyRef = useRef<string | null>(null);
  const lastWeekModeRef = useRef<LastWeekMode>(lastWeekMode);
  const selectedWeekRef = useRef(selectedWeek);
  const selectedWeekYearRef = useRef(selectedWeekYear);
  const styleUrlRef = useRef(styleUrl);
  const lastWeekDataRef = useRef<Record<string, FeatureCollection | null>>({});
  const lastWeekPopupRef = useRef<maplibregl.Popup | null>(null);
  const deckOverlayRef = useRef<MapboxOverlay | null>(null);
  const DEBUG_MAP =
    import.meta.env.DEV &&
    typeof window !== "undefined" &&
    ((window as { __ORCACAST_DEBUG_MAP?: boolean }).__ORCACAST_DEBUG_MAP === true ||
      window.localStorage?.getItem("orcacast.debug.map") === "true");

  const logMapDebug = (label: string) => {
    if (!DEBUG_MAP) return;
    const el = containerRef.current;
    if (!el) {
      // eslint-disable-next-line no-console
      console.info("[MapDebug]", label, { container: "missing" });
      return;
    }
    const rect = el.getBoundingClientRect();
    const hasCanvas = !!el.querySelector("canvas");
    const styleLoaded = mapRef.current?.isStyleLoaded();
    // eslint-disable-next-line no-console
    console.info("[MapDebug]", label, { rect, hasCanvas, styleLoaded });
  };

  useEffect(() => {
    styleUrlRef.current = styleUrl;
  }, [styleUrl]);

  useEffect(() => {
    legendSpecRef.current = legendSpec;
  }, [legendSpec]);

  useEffect(() => {
    hotspotsOnlyRef.current = hotspotsOnly;
  }, [hotspotsOnly]);

  useEffect(() => {
    showKdeContoursRef.current = showKdeContours;
  }, [showKdeContours]);

  useEffect(() => {
    if (showKdeContours) return;
    setKdeBands(null);
    setKdeWarning(null);
  }, [showKdeContours]);

  useEffect(() => {
    showLastWeekRef.current = showLastWeek;
  }, [showLastWeek]);

  useEffect(() => {
    lastWeekModeRef.current = lastWeekMode;
  }, [lastWeekMode]);

  useEffect(() => {
    selectedWeekRef.current = selectedWeek;
    selectedWeekYearRef.current = selectedWeekYear;
  }, [selectedWeek, selectedWeekYear]);

  const applyLastWeekFromCache = (map: MapLibreMap) => {
    if (!showLastWeekRef.current) return;
    const key = lastWeekKeyRef.current;
    if (!key) return;

    const raw = lastWeekDataRef.current[key];
    if (!raw) return;

    const previous = getPreviousWeek(selectedWeekYearRef.current, selectedWeekRef.current);
    const tagged = tagSightings(
      raw,
      lastWeekModeRef.current,
      { year: selectedWeekYearRef.current, week: selectedWeekRef.current },
      previous
    );

    if ((tagged.features ?? []).length === 0) return;
    ensureLastWeekLayer(map, tagged);
    moveLastWeekToTop(map);
  };

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    logMapDebug("before-init");

    // Some MapLibre options exist at runtime but aren't present in the published TS types.
    type MapOptionsPatched = maplibregl.MapOptions & {
      preserveDrawingBuffer?: boolean;
      cooperativeGestures?: boolean;
    };

    const mapOptions: MapOptionsPatched = {
      container: containerRef.current,
      style: styleUrl,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      attributionControl: false,
      preserveDrawingBuffer: false,
      cooperativeGestures: false,
    };

    const map = new maplibregl.Map(mapOptions);

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");

    map.on("error", (e: { error?: unknown }) => {
      // eslint-disable-next-line no-console
      console.error("[MapLibre] error:", e?.error || e);
    });

    lastWeekPopupRef.current = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 10,
    });

    const canvas = map.getCanvas();
    const onContextLost = (event: Event) => {
      event.preventDefault();
      // eslint-disable-next-line no-console
      console.warn("[MapLibre] WebGL context lost");
    };
    const onContextRestored = () => {
      // eslint-disable-next-line no-console
      console.warn("[MapLibre] WebGL context restored");
      if (!mapRef.current) return;

      const nextStyle = styleUrlRef.current;
      const center = mapRef.current.getCenter();
      const zoom = mapRef.current.getZoom();
      const bearing = mapRef.current.getBearing();
      const pitch = mapRef.current.getPitch();

      mapRef.current.setStyle(nextStyle);
      mapRef.current.once("styledata", () => {
        if (!mapRef.current) return;
        try {
          mapRef.current.jumpTo({ center, zoom, bearing, pitch });
        } catch {
          // no-op
        }
        mapRef.current.resize();
        renderForecastLayer(mapRef.current);
        applyLastWeekFromCache(mapRef.current);
      });
    };

    canvas.addEventListener("webglcontextlost", onContextLost, false);
    canvas.addEventListener("webglcontextrestored", onContextRestored, false);

    map.once("load", () => {
      map.resize();
      logMapDebug("load");
      setMapReady(true);
    });

    mapRef.current = map;
    if (import.meta.env.DEV && typeof window !== "undefined") {
      (window as { __ORCACAST_MAP?: MapLibreMap }).__ORCACAST_MAP = map;
    }
    logMapDebug("after-init");

    // Lazy-loaded CSS + flex/grid layouts can report 0px initially; schedule a few resizes.
    const raf = window.requestAnimationFrame(() => map.resize());
    const t1 = window.setTimeout(() => map.resize(), 50);
    const t2 = window.setTimeout(() => map.resize(), 250);
    const t3 = window.setTimeout(() => {
      if (!DEBUG_MAP) return;
      // eslint-disable-next-line no-console
      console.info("[MapDebug] style status", {
        styleLoaded: map.isStyleLoaded(),
        styleName: map.getStyle()?.name ?? null,
      });
    }, 1000);

    if (DEBUG_MAP) {
      map.once("styledata", () => logMapDebug("styledata"));
      map.once("sourcedata", () => logMapDebug("sourcedata"));
      map.once("render", () => logMapDebug("render"));
    }

    const deckOverlay = new MapboxOverlay({ interleaved: true, layers: [] });
    map.addControl(deckOverlay);
    deckOverlayRef.current = deckOverlay;

    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      if (import.meta.env.DEV && typeof window !== "undefined") {
        const win = window as { __ORCACAST_MAP?: MapLibreMap };
        if (win.__ORCACAST_MAP === map) delete win.__ORCACAST_MAP;
      }
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", onContextRestored);
      if (deckOverlayRef.current) {
        map.removeControl(deckOverlayRef.current);
        deckOverlayRef.current = null;
      }
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const renderForecastLayer = (map: MapLibreMap) => {
    if (!overlayRef.current) return;

    const scale = legendSpecRef.current;
    const threshold = scale?.hotspotThreshold ?? hotspotThresholdRef.current;
    const hotspots = hotspotsOnlyRef.current;

    const fillExpr: FillColorSpec | undefined =
      hotspots && threshold !== undefined
        ? (buildHotspotOnlyExpr(threshold) as unknown as FillColorSpec)
        : scale
          ? (buildFillExprFromScale(scale) as unknown as FillColorSpec)
          : fillExprRef.current ?? undefined;

    if (fillExpr) {
      fillExprRef.current = fillExpr;
    }

    addGridOverlay(map, overlayRef.current, fillExpr, threshold, hotspots, shimmerThresholdRef.current);

    if (showKdeContoursRef.current) {
      setGridVisibility(map, false);
    } else if (hotspots) {
      setGridBaseVisibility(map, false);
      setHotspotVisibility(map, true);
    } else {
      setGridVisibility(map, true);
      setHotspotVisibility(map, false);
    }
    moveLastWeekToTop(map);
  };

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    let rafId = 0;
    let lastTick = 0;
    const shimmerId = "grid-shimmer-fill";
    const peakId = "grid-peak-shine";

    const tick = (time: number) => {
      if (time - lastTick > 120) {
        lastTick = time;
        const t = time / 1000;
        const shimmerOpacity = 0.16 + 0.06 * Math.sin(t * 0.6);
        const glowOpacity = 0.5 + 0.12 * Math.sin(t * 0.5 + 0.8);
        const hideGrid = showKdeContoursRef.current || hotspotsOnlyRef.current;
        if (map.getLayer(shimmerId)) {
          map.setPaintProperty(shimmerId, "fill-opacity", hideGrid ? 0 : shimmerOpacity);
          map.setPaintProperty(
            shimmerId,
            "fill-color",
            `rgba(140,255,245,${0.28 + 0.08 * Math.sin(t * 0.35)})`
          );
        }
        if (map.getLayer(peakId)) {
          map.setPaintProperty(peakId, "line-opacity", hideGrid ? 0 : glowOpacity);
        }
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [mapReady, resolution, forecastPath]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const currentStyle = map.getStyle();
    const currentName = currentStyle?.name ?? "";
    const wantsDark = styleUrl.includes("dark-matter");
    const isDarkNow = currentName.toLowerCase().includes("dark");

    if ((wantsDark && isDarkNow) || (!wantsDark && !isDarkNow)) return;

    const center = map.getCenter();
    const zoom = map.getZoom();
    const bearing = map.getBearing();
    const pitch = map.getPitch();

    map.setStyle(styleUrl);

    map.once("styledata", () => {
      try {
        map.jumpTo({ center, zoom, bearing, pitch });
      } catch {
        // no-op
      }
      map.resize();
      renderForecastLayer(map);
      applyLastWeekFromCache(map);
    });
  }, [styleUrl, showLastWeek]);

  const getPreviousWeek = (year: number, week: number) => {
    if (week > 1) {
      return { year, week: week - 1 };
    }
    const dec28 = new Date(Date.UTC(year - 1, 11, 28));
    return { year: year - 1, week: isoWeekFromDate(dec28) };
  };

  const buildLastWeekUrl = (key: string) => {
    const base = import.meta.env.BASE_URL || "/";
    const cleanBase = base.endsWith("/") ? base : `${base}/`;
    return `${cleanBase}data/last_week_sightings/last_week_sightings_${key}.geojson`;
  };

  const tagSightings = (
    data: FeatureCollection,
    mode: LastWeekMode,
    selected: { year: number; week: number },
    previous: { year: number; week: number }
  ): FeatureCollection => {
    // ✅ "none" means show nothing
    if (mode === "none") {
      return { ...data, features: [] };
    }

    const parseNum = (value: unknown): number => {
      if (typeof value === "number") return value;
      if (typeof value === "string") {
        const cleaned = value.trim().replace(/[^0-9]/g, "");
        return cleaned.length ? Number(cleaned) : Number.NaN;
      }
      return Number.NaN;
    };

    const rows = (data.features ?? []).map((feature) => {
      const props = (feature.properties ?? {}) as Record<string, unknown>;
      const year = parseNum(props.YEAR ?? props.year ?? props.Year);
      const week = parseNum(
        props.WEEK ??
          props.week ??
          props.Week ??
          props.STAT_WEEK ??
          props.stat_week ??
          props.Stat_Week
      );
      return { feature, props, year, week };
    });

    // eslint-disable-next-line no-console
    console.debug(
      "[Sightings] sample rows",
      rows.slice(0, 5).map((r) => ({ year: r.year, week: r.week }))
    );
    // eslint-disable-next-line no-console
    console.debug("[Sightings] first props", rows[0]?.props ?? null);

    const counts = rows.reduce(
      (acc, row) => {
        if (Number.isFinite(row.year) && Number.isFinite(row.week)) {
          if (row.year === selected.year && row.week === selected.week) acc.selected += 1;
          if (row.year === previous.year && row.week === previous.week) acc.previous += 1;
        }
        return acc;
      },
      { selected: 0, previous: 0 }
    );

    // eslint-disable-next-line no-console
    console.debug("[Sightings] classify", {
      selected,
      previous,
      mode,
      counts,
      total: rows.length,
    });

    return {
      ...data,
      features: rows.flatMap((row) => {
        let sightingMode: "previous" | "selected" | null = null;

        if (Number.isFinite(row.week)) {
          if (Number.isFinite(row.year)) {
            if (row.year === previous.year && row.week === previous.week) sightingMode = "previous";
            if (row.year === selected.year && row.week === selected.week) sightingMode = "selected";
          } else {
            if (row.week === previous.week) sightingMode = "previous";
            if (row.week === selected.week) sightingMode = "selected";
          }
        } else {
          sightingMode = mode === "previous" ? "previous" : "selected";
        }

        if (!sightingMode) return [];
        if (mode === "previous" && sightingMode !== "previous") return [];
        if (mode === "selected" && sightingMode !== "selected") return [];

        return [
          {
            ...row.feature,
            properties: {
              ...row.props,
              sightingMode,
            },
          },
        ];
      }),
    };
  };

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    let cancelled = false;

    const loadOverlay = async () => {
      try {
        const grid = await loadGrid(resolution);
        let values: Record<string, number> = {};

        try {
          let forecast;
          if (forecastPath) {
            try {
              forecast = await loadForecast(resolution, { kind: "explicit", explicitPath: forecastPath });
            } catch (err) {
              if (fallbackForecastPath && fallbackForecastPath !== forecastPath) {
                // eslint-disable-next-line no-console
                console.warn("[Forecast] explicit path failed, falling back to latest period", err);
                forecast = await loadForecast(resolution, { kind: "explicit", explicitPath: fallbackForecastPath });
              } else {
                throw err;
              }
            }
          } else if (fallbackForecastPath) {
            forecast = await loadForecast(resolution, { kind: "explicit", explicitPath: fallbackForecastPath });
          }
          values = forecast?.values ?? {};
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn("[Forecast] failed to load, rendering empty layer", err);
        }

        if (cancelled) return;

        const joined = attachProbabilities(grid, values);
        const { fillColorExpr, scale } = buildAutoColorExprFromValues(values, PALETTE);
        const valueList = Object.values(values)
          .map((v) => Number(v))
          .filter((v) => Number.isFinite(v) && v > 0)
          .sort((a, b) => a - b);

        hotspotThresholdRef.current = valueList.length > 0 ? Math.max(...valueList) : undefined;
        if (valueList.length > 0) {
          const idx = Math.max(0, Math.floor(valueList.length * 0.95) - 1);
          shimmerThresholdRef.current = valueList[idx];
        } else {
          shimmerThresholdRef.current = undefined;
        }
        overlayRef.current = joined;
        fillExprRef.current = fillColorExpr as unknown as FillColorSpec;

        if (scale?.hotspotThreshold !== undefined) {
          hotspotThresholdRef.current = scale.hotspotThreshold;
        }
        legendSpecRef.current = scale;
        setLegendSpec(scale);

        if (!scale) {
          setLegendOpen(false);
        }

        if (map.isStyleLoaded()) {
          renderForecastLayer(map);
          moveLastWeekToTop(map);
        } else {
          map.once("styledata", () => {
            if (!overlayRef.current) return;
            renderForecastLayer(map);
            moveLastWeekToTop(map);
          });
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("[Forecast] failed to load grid", err);
      }
    };

    loadOverlay();

    return () => {
      cancelled = true;
    };
  }, [resolution, mapReady, forecastPath]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const applyVisibility = (visible: boolean) => {
      const visibility = visible ? "visible" : "none";
      if (map.getLayer(LAST_WEEK_LAYER_ID)) {
        map.setLayoutProperty(LAST_WEEK_LAYER_ID, "visibility", visibility);
      }
      if (map.getLayer(LAST_WEEK_HALO_ID)) {
        map.setLayoutProperty(LAST_WEEK_HALO_ID, "visibility", visibility);
      }
      if (map.getLayer(LAST_WEEK_RING_ID)) {
        map.setLayoutProperty(LAST_WEEK_RING_ID, "visibility", visibility);
      }
      if (map.getLayer(LAST_WEEK_WHITE_ID)) {
        map.setLayoutProperty(LAST_WEEK_WHITE_ID, "visibility", visibility);
      }
    };

    if (!showLastWeek) {
      applyVisibility(false);
      return;
    }

    // ✅ explicit "none" => hide and bail early
    if (lastWeekMode === "none") {
      applyVisibility(false);
      return;
    }

    const attach = (data: FeatureCollection) => {
      ensureLastWeekLayer(map, data);
      applyVisibility(true);
    };

    if (!Number.isFinite(selectedWeekYear) || !Number.isFinite(selectedWeek) || selectedWeek <= 0) {
      applyVisibility(false);
      return;
    }

    const previous = getPreviousWeek(selectedWeekYear, selectedWeek);
    const key = `${selectedWeekYear}-W${selectedWeek}`;
    lastWeekKeyRef.current = key;

    ensureLastWeekLayer(map, { type: "FeatureCollection", features: [] });
    applyVisibility(false);

    const applyTagged = (raw: FeatureCollection | null) => {
      if (!raw) {
        applyVisibility(false);
        return;
      }
      const tagged = tagSightings(
        raw,
        lastWeekMode,
        { year: selectedWeekYear, week: selectedWeek },
        previous
      );
      if ((tagged.features ?? []).length === 0) {
        applyVisibility(false);
        return;
      }
      attach(tagged);
    };

    if (key in lastWeekDataRef.current) {
      applyTagged(lastWeekDataRef.current[key] ?? null);
      return;
    }

    let active = true;

    const load = async () => {
      try {
        const url = `${buildLastWeekUrl(key)}?v=${Date.now()}`;
        const res = await fetch(url, { cache: "no-store" });

        if (res.status === 404 || res.status === 204) {
          lastWeekDataRef.current[key] = null;
          if (active) applyVisibility(false);
          return;
        }
        if (!res.ok) throw new Error(`Failed to fetch last week sightings: ${res.status}`);

        const text = await res.text();
        const trimmed = text.trim();

        if (trimmed.startsWith("<") || trimmed.length === 0) {
          lastWeekDataRef.current[key] = null;
          if (active) applyVisibility(false);
          return;
        }

        const data = JSON.parse(trimmed) as FeatureCollection;

        // eslint-disable-next-line no-console
        console.debug("[Sightings] loaded", {
          url,
          first: data.features?.[0]?.properties ?? null,
        });

        lastWeekDataRef.current[key] = data;
        if (!active) return;

        if (!map.isStyleLoaded()) {
          map.once("styledata", () => {
            if (active) applyTagged(data);
          });
        } else {
          applyTagged(data);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("[Sightings] failed to load last week sightings", err);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [showLastWeek, lastWeekMode, selectedWeek, selectedWeekYear]);

  useEffect(() => {
    const map = mapRef.current;
    const el = containerRef.current;
    if (!map || !el) return;

    const ro = new ResizeObserver(() => {
      map.resize();
    });
    ro.observe(el);

    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const raf = window.requestAnimationFrame(() => {
      map.resize();
      map.triggerRepaint();
    });
    const t1 = window.setTimeout(() => {
      map.resize();
      map.triggerRepaint();
    }, 80);
    const t2 = window.setTimeout(() => {
      map.resize();
      map.triggerRepaint();
    }, 240);
    const t3 = window.setTimeout(() => {
      if (!map.isStyleLoaded()) {
        const nextStyle = styleUrlRef.current;
        const center = map.getCenter();
        const zoom = map.getZoom();
        const bearing = map.getBearing();
        const pitch = map.getPitch();
        map.setStyle(nextStyle);
        map.once("styledata", () => {
          try {
            map.jumpTo({ center, zoom, bearing, pitch });
          } catch {
            // no-op
          }
          map.resize();
          renderForecastLayer(map);
          applyLastWeekFromCache(map);
        });
      }
    }, 420);

    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [timeseriesOpen]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const id = window.setTimeout(() => {
      map.resize();
      map.triggerRepaint();
    }, 50);
    return () => window.clearTimeout(id);
  }, [legendSpec]);

  type MapMouseEventWithFeatures = maplibregl.MapMouseEvent & {
    features?: Array<{ properties?: { datetime?: string } }>;
  };

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !lastWeekPopupRef.current) return;

    const popup = lastWeekPopupRef.current;
    const onMove = (e: MapMouseEventWithFeatures) => {
      const feature = e.features?.[0] as { properties?: { datetime?: string } } | undefined;
      const datetime = feature?.properties?.datetime;
      if (!datetime) return;
      popup
        .setLngLat(e.lngLat)
        .setHTML(`<div style="font-size:12px;">${datetime}</div>`)
        .addTo(map);
    };
    const onLeave = () => popup.remove();

    map.on("mousemove", LAST_WEEK_LAYER_ID, onMove);
    map.on("mouseleave", LAST_WEEK_LAYER_ID, onLeave);

    return () => {
      map.off("mousemove", LAST_WEEK_LAYER_ID, onMove);
      map.off("mouseleave", LAST_WEEK_LAYER_ID, onLeave);
      popup.remove();
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !overlayRef.current) return;

    if (!map.isStyleLoaded()) {
      map.once("styledata", () => {
        if (!mapRef.current || !overlayRef.current || !legendSpec) return;
        renderForecastLayer(mapRef.current);
        moveLastWeekToTop(mapRef.current);
      });
      return;
    }

    renderForecastLayer(map);
    moveLastWeekToTop(map);
  }, [hotspotsOnly, legendSpec]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (showKdeContours) {
      setGridVisibility(map, false);
    } else if (hotspotsOnly) {
      setGridBaseVisibility(map, false);
      setHotspotVisibility(map, true);
    } else {
      setGridVisibility(map, true);
      setHotspotVisibility(map, false);
    }
  }, [showKdeContours, hotspotsOnly, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !showKdeContours) return;

    if (!Number.isFinite(selectedWeekYear) || !Number.isFinite(selectedWeek) || selectedWeek <= 0) {
      setKdeWarning("No blurred KDE GeoJSON available for this period.");
      setKdeBands(null);
      return;
    }

    let active = true;

    const runId = appConfig.kdeBandsRunId;
    const areaMinKm2 = appConfig.kdeBandsAreaMinKm2;
    const holeMinKm2 = appConfig.kdeBandsHoleMinKm2;

    const path = getKdeBandsPathForPeriod(
      resolution,
      selectedWeekYear,
      selectedWeek,
      runId,
      appConfig.kdeBandsFolder
    );

    const cacheKey = buildKdeBandsCacheKey({
      runId,
      folder: appConfig.kdeBandsFolder,
      resolution,
      year: selectedWeekYear,
      statWeek: selectedWeek,
      areaMinKm2,
      holeMinKm2,
    });

    loadKdeBandsGeojson(path, cacheKey)
      .then((data) => {
        if (!active) return;
        setKdeBands(data);
        setKdeWarning(null);
      })
      .catch(() => {
        if (!active) return;
        setKdeBands(null);
        setKdeWarning("No blurred KDE GeoJSON available for this period.");
      });

    return () => {
      active = false;
    };
  }, [showKdeContours, selectedWeekYear, selectedWeek, resolution]);

  useEffect(() => {
    const overlay = deckOverlayRef.current;
    if (!overlay) return;

    if (!showKdeContours || !kdeBands) {
      overlay.setProps({ layers: [] });
      return;
    }

    const layer = new GeoJsonLayer({
      id: "kde-bands",
      data: kdeBands,
      filled: true,
      stroked: true,
      opacity: 0.8,
      lineWidthMinPixels: 0.2,
      getFillColor: (feature) => rgbaStringToArray(getKdeBandColor(feature, legendSpec)) ?? [0, 0, 0, 0],
      getLineColor: (feature) => rgbaStringToArray(getKdeBandColor(feature, legendSpec)) ?? [0, 0, 0, 0],
      getLineWidth: 0.4,
      pickable: false,
      parameters: { depthTest: false },
    });

    overlay.setProps({ layers: [layer] });
  }, [showKdeContours, kdeBands, legendSpec]);

  return (
    <div className="mapStage">
      <div ref={containerRef} className="map" />
      {legendSpec && (
        <div className="map__cornerRightBottom">
          <button
            className={
              showKdeContours
                ? "iconBtn legendClusterBtn legendKde legendKde--active"
                : "iconBtn legendClusterBtn legendKde"
            }
            onClick={() => setShowKdeContours((v) => !v)}
            aria-label="Blurred (precomputed)"
          >
            <span className="material-symbols-rounded">blur_on</span>
          </button>
          <button
            className={
              hotspotsOnly
                ? "iconBtn legendClusterBtn legendHotspots legendHotspots--active"
                : "iconBtn legendClusterBtn legendHotspots"
            }
            onClick={() =>
              setHotspotsOnly((v) => {
                const next = !v;
                if (next) setShowKdeContours(false);
                return next;
              })
            }
            aria-label="Toggle hotspots"
          >
            <span className="material-symbols-rounded">local_fire_department</span>
          </button>
          <button
            className="iconBtn legendClusterBtn"
            onClick={() => setLegendOpen((v) => !v)}
            aria-label={legendOpen ? "Hide legend" : "Show legend"}
          >
            <span className="material-symbols-rounded">legend_toggle</span>
          </button>
        </div>
      )}
      {legendSpec && legendOpen && <ProbabilityLegend scale={legendSpec} />}
      {kdeWarning && (
        <div className="map__kdeWarning" role="status" aria-live="polite">
          <span className="material-symbols-rounded" aria-hidden="true">
            warning
          </span>
          <span>{kdeWarning}</span>
        </div>
      )}
    </div>
  );
}

function getKdeBandColor(
  feature: { properties?: Record<string, unknown> },
  scale: HeatScale | null
): string {
  if (!feature?.properties) return "";
  const { properties } = feature;
  const label = typeof properties.label === "string" ? properties.label.toLowerCase() : "";
  const level = Number(properties.level);
  const bin = Number(properties.bin ?? properties.band_index);
  if (
    label.includes("no probability") ||
    (Number.isFinite(level) && level <= 0) ||
    (Number.isFinite(bin) && bin < 0)
  ) {
    return ZERO_COLOR;
  }
  if (scale && scale.binColorsRgba.length > 0) {
    if (label) {
      const labelIndex = scale.labels.findIndex((entry) => entry.toLowerCase() === label);
      if (labelIndex > 0) {
        const swatch = scale.binColorsRgba[labelIndex - 1];
        if (typeof swatch === "string") {
          return swatch;
        }
      }
    }
    if (Number.isFinite(bin)) {
      const idx = Math.max(0, Math.min(scale.binColorsRgba.length - 1, Math.floor(bin)));
      const swatch = scale.binColorsRgba[idx];
      if (typeof swatch === "string") {
        return swatch;
      }
    }
  }
  const value = properties.color ?? properties.fill;
  return typeof value === "string" ? value : "";
}

function rgbaStringToArray(value: string): [number, number, number, number] | null {
  const match = value.match(/rgba?\(([^)]+)\)/i);
  if (!match) return null;
  const parts = match[1].split(",").map((part) => Number(part.trim()));
  if (parts.length < 3) return null;
  const [r, g, b] = parts;
  const a = parts.length >= 4 ? parts[3] : 1;
  if (![r, g, b, a].every((v) => Number.isFinite(v))) return null;
  return [Math.round(r), Math.round(g), Math.round(b), Math.round(a * 255)];
}

function ensureLastWeekLayer(map: MapLibreMap, data: FeatureCollection) {
  if (map.getSource(LAST_WEEK_SOURCE_ID)) {
    const source = map.getSource(LAST_WEEK_SOURCE_ID) as maplibregl.GeoJSONSource;
    source.setData(data);
  } else {
    map.addSource(LAST_WEEK_SOURCE_ID, { type: "geojson", data });
  }

  if (!map.getLayer(LAST_WEEK_HALO_ID)) {
    map.addLayer({
      id: LAST_WEEK_HALO_ID,
      type: "circle",
      source: LAST_WEEK_SOURCE_ID,
      paint: {
        "circle-color": "rgba(0,255,240,0.18)",
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 2.8, 8, 4, 11, 5],
        "circle-blur": 0.9,
        "circle-opacity": 0.65,
      },
    });
  }

  if (map.getLayer(LAST_WEEK_RING_ID)) {
    map.setPaintProperty(LAST_WEEK_RING_ID, "circle-stroke-color", [
      "match",
      ["get", "sightingMode"],
      "previous",
      "#FF3B5C",
      "selected",
      "#7CFF6B",
      "#FF3B5C",
    ]);
    map.setPaintProperty(LAST_WEEK_RING_ID, "circle-radius", [
      "interpolate",
      ["linear"],
      ["zoom"],
      5,
      2.6,
      8,
      3.6,
      11,
      4.6,
    ]);
    map.setPaintProperty(LAST_WEEK_RING_ID, "circle-stroke-width", 2.2);
  } else {
    map.addLayer({
      id: LAST_WEEK_RING_ID,
      type: "circle",
      source: LAST_WEEK_SOURCE_ID,
      paint: {
        "circle-color": "rgba(0,0,0,0)",
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 2.6, 8, 3.6, 11, 4.6],
        "circle-stroke-width": 2.2,
        "circle-stroke-color": [
          "match",
          ["get", "sightingMode"],
          "previous",
          "#FF3B5C",
          "selected",
          "#7CFF6B",
          "#FF3B5C",
        ],
        "circle-opacity": 0.9,
      },
    });
  }

  if (map.getLayer(LAST_WEEK_WHITE_ID)) {
    map.setPaintProperty(LAST_WEEK_WHITE_ID, "circle-radius", [
      "interpolate",
      ["linear"],
      ["zoom"],
      5,
      3.1,
      8,
      4.2,
      11,
      5.4,
    ]);
    map.setPaintProperty(LAST_WEEK_WHITE_ID, "circle-stroke-width", 1.2);
  } else {
    map.addLayer({
      id: LAST_WEEK_WHITE_ID,
      type: "circle",
      source: LAST_WEEK_SOURCE_ID,
      paint: {
        "circle-color": "rgba(0,0,0,0)",
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 3.1, 8, 4.2, 11, 5.4],
        "circle-stroke-width": 1.2,
        "circle-stroke-color": "rgba(255,255,255,0.9)",
        "circle-opacity": 0.9,
      },
    });
  }

  if (!map.getLayer(LAST_WEEK_LAYER_ID)) {
    map.addLayer({
      id: LAST_WEEK_LAYER_ID,
      type: "circle",
      source: LAST_WEEK_SOURCE_ID,
      paint: {
        "circle-color": "rgba(255,255,255,0.98)",
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 1.2, 8, 1.9, 11, 2.8],
        "circle-stroke-color": "#06184a",
        "circle-stroke-width": 1.4,
        "circle-opacity": 0.95,
      },
    });
  }

  moveLastWeekToTop(map);
}

function moveLastWeekToTop(map: MapLibreMap) {
  if (map.getLayer(LAST_WEEK_HALO_ID)) {
    map.moveLayer(LAST_WEEK_HALO_ID);
  }
  if (map.getLayer(LAST_WEEK_WHITE_ID)) {
    map.moveLayer(LAST_WEEK_WHITE_ID);
  }
  if (map.getLayer(LAST_WEEK_RING_ID)) {
    map.moveLayer(LAST_WEEK_RING_ID);
  }
  if (map.getLayer(LAST_WEEK_LAYER_ID)) {
    map.moveLayer(LAST_WEEK_LAYER_ID);
  }
}
