// import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
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

// const VOYAGER_STYLE = "https://tiles.stadiamaps.com/styles/alidade_smooth.json";
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
//         const { fillColorExpr, scale } = buildAutoColorExprFromValues(values, PALETTE, normalizationValues);
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

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import maplibregl, { Map as MapLibreMap } from "maplibre-gl";
import type { FeatureCollection } from "geojson";
import { GeoJsonLayer } from "@deck.gl/layers";
import { MapboxOverlay } from "@deck.gl/mapbox";
import "maplibre-gl/dist/maplibre-gl.css";
import { appConfig } from "../config/appConfig";
import type { H3Resolution } from "../config/dataPaths";
import { getForecastPathForPeriod, getKdeBandsPathForPeriod } from "../config/dataPaths";
import { attachProbabilities, loadForecast, loadGrid } from "../data/forecastIO";
import { buildKdeBandsCacheKey, loadKdeBandsGeojson } from "../data/kdeBandsIO";
import type { Period } from "../data/periods";
import {
  addGridOverlay,
  setGridHoverCell,
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
import { isoWeekToDateRange } from "../core/time/forecastPeriodToIsoWeek";
import { ProbabilityLegend } from "./ProbabilityLegend";
import type { DataDrivenPropertyValueSpecification } from "maplibre-gl";

type FillColorSpec = DataDrivenPropertyValueSpecification<string>;
type LastWeekMode = "none" | "previous" | "selected" | "both";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatModelLabel(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function getFeatureCellId(feature: { properties?: Record<string, unknown> } | undefined): string {
  const props = feature?.properties as Record<string, unknown> | undefined;
  const cellIdRaw = props?.h3 ?? props?.H3 ?? props?.h3_id ?? props?.H3_ID ?? "";
  return String(cellIdRaw || "");
}

function buildSparklineSvg(
  values: number[],
  selectedIndex: number,
  periods: Period[],
  width = 270,
  height = 72
): string {
  const paddingX = 6;
  const paddingY = 6;
  const labelHeight = 12;
  const innerW = Math.max(1, width - paddingX * 2);
  const chartTop = paddingY;
  const chartBottom = height - paddingY - labelHeight;
  const innerH = Math.max(1, chartBottom - chartTop);
  const safeValues = values.map((v) => (Number.isFinite(v) ? v : 0));
  const max = safeValues.length ? Math.max(...safeValues) : 0;
  const min = safeValues.length ? Math.min(...safeValues) : 0;
  const range = max - min || 1;

  const step = safeValues.length > 1 ? innerW / (safeValues.length - 1) : 0;
  const points = safeValues.map((v, i) => {
    const x = paddingX + step * i;
    const t = (v - min) / range;
    const y = chartTop + innerH * (1 - t);
    return [x, y] as const;
  });

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const marker =
    selectedIndex >= 0 && selectedIndex < points.length
      ? points[selectedIndex]
      : null;

  const markerX =
    selectedIndex >= 0 && selectedIndex < points.length
      ? (paddingX + step * selectedIndex).toFixed(1)
      : null;

  const axisY = chartBottom + 3;
  const ticks: Array<{ x: number; label: string }> = [];
  let lastMonth = -1;
  let lastYear = -1;
  periods.forEach((period, i) => {
    const range = isoWeekToDateRange(period.year, period.stat_week);
    const date = new Date(`${range.start}T00:00:00Z`);
    const month = date.getUTCMonth();
    const year = date.getUTCFullYear();
    if (month !== lastMonth || year !== lastYear) {
      ticks.push({ x: paddingX + step * i, label: String(month + 1) });
      lastMonth = month;
      lastYear = year;
    }
  });

  return `
    <svg class="sparkPopup__chart" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="Probability sparkline">
      ${markerX ? `<line class="sparkPopup__current" x1="${markerX}" x2="${markerX}" y1="${chartTop}" y2="${chartBottom}" />` : ""}
      <path class="sparkPopup__line" d="${path}" />
      ${marker ? `<circle class="sparkPopup__dot" cx="${marker[0].toFixed(1)}" cy="${marker[1].toFixed(1)}" r="2.4" />` : ""}
      <line class="sparkPopup__axisLine" x1="${paddingX}" x2="${width - paddingX}" y1="${axisY}" y2="${axisY}" />
      ${ticks
        .map(
          (tick) => `
        <line class="sparkPopup__axisTick" x1="${tick.x.toFixed(1)}" x2="${tick.x.toFixed(1)}" y1="${axisY}" y2="${axisY + 3}" />
        <text class="sparkPopup__axisLabel" x="${tick.x.toFixed(1)}" y="${height - paddingY}" text-anchor="middle">${tick.label}</text>
      `.trim()
        )
        .join("")}
    </svg>
  `.trim();
}

type Props = {
  darkMode: boolean;
  resolution: H3Resolution;
  showLastWeek: boolean;
  lastWeekMode: LastWeekMode;
  poiFilters: { Park: boolean; Marina: boolean; Ferry: boolean };
  modelId: string;
  periods: Period[];
  selectedWeek: number;
  selectedWeekYear: number;
  timeseriesOpen: boolean;
  hotspotsEnabled: boolean;
  hotspotMode: "modeled" | "custom";
  hotspotPercentile: number;
  hotspotModeledCount: number | null;
  onHotspotsEnabledChange: (next: boolean) => void;
  onGridCellCount?: (count: number) => void;
  onGridCellSelect?: (selection: { h3: string; value: number; lngLat: { lng: number; lat: number } }) => void;
  onMapReady?: (map: MapLibreMap | null) => void;
  enableSparklinePopup?: boolean;
  normalizationValues?: Record<string, number>;
  className?: string;
  style?: CSSProperties;
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

const VOYAGER_STYLE = "https://tiles.stadiamaps.com/styles/alidade_smooth.json";
const DARK_STYLE = "https://tiles.stadiamaps.com/styles/alidade_smooth_dark.json";
const BASEMAP_TINT_SOURCE_ID = "orcacast-basemap-tint-source";
const BASEMAP_TINT_LAYER_ID = "orcacast-basemap-tint-layer";
const DARK_LABEL_OPACITY = 0.86;

function applyBasemapVisualTuning(map: MapLibreMap, isDarkBasemap: boolean) {
  const style = map.getStyle();
  const layers = style?.layers ?? [];
  if (layers.length === 0) return;

  if (isDarkBasemap) {
    const firstSymbolLayerId = layers.find((layer) => layer.type === "symbol")?.id;
    if (!map.getSource(BASEMAP_TINT_SOURCE_ID)) {
      map.addSource(BASEMAP_TINT_SOURCE_ID, {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "Polygon",
                coordinates: [
                  [
                    [-180, -85],
                    [180, -85],
                    [180, 85],
                    [-180, 85],
                    [-180, -85],
                  ],
                ],
              },
            },
          ],
        },
      });
    }
    if (!map.getLayer(BASEMAP_TINT_LAYER_ID)) {
      map.addLayer(
        {
          id: BASEMAP_TINT_LAYER_ID,
          type: "fill",
          source: BASEMAP_TINT_SOURCE_ID,
          paint: {
            "fill-color": "#3a4148",
            "fill-opacity": 0.14,
          },
        },
        firstSymbolLayerId
      );
    } else {
      map.setPaintProperty(BASEMAP_TINT_LAYER_ID, "fill-color", "#3a4148");
      map.setPaintProperty(BASEMAP_TINT_LAYER_ID, "fill-opacity", 0.14);
      if (firstSymbolLayerId) {
        map.moveLayer(BASEMAP_TINT_LAYER_ID, firstSymbolLayerId);
      }
    }
  } else {
    if (map.getLayer(BASEMAP_TINT_LAYER_ID)) {
      map.removeLayer(BASEMAP_TINT_LAYER_ID);
    }
    if (map.getSource(BASEMAP_TINT_SOURCE_ID)) {
      map.removeSource(BASEMAP_TINT_SOURCE_ID);
    }
  }

  layers.forEach((layer) => {
    if (layer.type === "symbol") {
      const layout = (layer as { layout?: Record<string, unknown> }).layout ?? {};
      const hasText = "text-field" in layout;
      const hasIcon = "icon-image" in layout;
      if (hasText) {
        map.setPaintProperty(layer.id, "text-opacity", isDarkBasemap ? DARK_LABEL_OPACITY : 1);
      }
      if (hasIcon) {
        map.setPaintProperty(layer.id, "icon-opacity", isDarkBasemap ? 0.92 : 1);
      }
      return;
    }

    if (layer.type === "raster") {
      map.setPaintProperty(layer.id, "raster-saturation", isDarkBasemap ? -0.2 : 0);
      map.setPaintProperty(layer.id, "raster-brightness-min", isDarkBasemap ? 0.02 : 0);
      map.setPaintProperty(layer.id, "raster-brightness-max", isDarkBasemap ? 0.92 : 1);
      map.setPaintProperty(layer.id, "raster-contrast", isDarkBasemap ? -0.06 : 0);
    }
  });
}

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
  poiFilters,
  modelId,
  periods,
  selectedWeek,
  selectedWeekYear,
  timeseriesOpen,
  hotspotsEnabled,
  hotspotMode,
  hotspotPercentile,
  hotspotModeledCount,
  onHotspotsEnabledChange,
  onGridCellCount,
  onGridCellSelect,
  onMapReady,
  enableSparklinePopup = true,
  normalizationValues,
  className,
  style,
  forecastPath,
  fallbackForecastPath,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const styleUrl = useMemo(() => (darkMode ? DARK_STYLE : VOYAGER_STYLE), [darkMode]);
  const gridBorderColor = useMemo(
    () => (darkMode ? "rgba(8,18,44,0.22)" : "rgba(20,42,78,0.16)"),
    [darkMode]
  );
  const overlayRef = useRef<FeatureCollection | null>(null);
  const fillExprRef = useRef<FillColorSpec | null>(null);
  const hotspotThresholdRef = useRef<number | undefined>(undefined);
  const modeledHotspotThresholdRef = useRef<number | undefined>(undefined);
  const modeledHotspotCountRef = useRef<number | null>(hotspotModeledCount);
  const valuesByCellRef = useRef<Record<string, number>>({});
  const sortedValuesDescRef = useRef<number[]>([]);
  const totalCellsRef = useRef(0);
  const shimmerThresholdRef = useRef<number | undefined>(undefined);
  const [legendSpec, setLegendSpec] = useState<HeatScale | null>(null);
  const [legendOpen, setLegendOpen] = useState(true);
  const [showKdeContours, setShowKdeContours] = useState(false);
  const [kdeBands, setKdeBands] = useState<FeatureCollection | null>(null);
  const [kdeWarning, setKdeWarning] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const legendSpecRef = useRef<HeatScale | null>(null);
  const poiMarkersRef = useRef<maplibregl.Marker[]>([]);
  const poiLoadedRef = useRef(false);
  const poiDataRef = useRef<
    | Array<{
        type: string;
        name: string;
        latitude: number;
        longitude: number;
      }>
    | null
  >(null);
  const hotspotsOnlyRef = useRef(false);
  const showKdeContoursRef = useRef(false);
  const hasForecastLegend = legendSpec !== null;
  const showLastWeekRef = useRef(false);
  const lastWeekKeyRef = useRef<string | null>(null);
  const lastWeekModeRef = useRef<LastWeekMode>(lastWeekMode);
  const selectedWeekRef = useRef(selectedWeek);
  const selectedWeekYearRef = useRef(selectedWeekYear);
  const styleUrlRef = useRef(styleUrl);
  const activeStyleUrlRef = useRef(styleUrl);
  const lastWeekDataRef = useRef<Record<string, FeatureCollection | null>>({});
  const lastWeekPopupRef = useRef<maplibregl.Popup | null>(null);
  const deckOverlayRef = useRef<MapboxOverlay | null>(null);
  const sparkPopupRef = useRef<maplibregl.Popup | null>(null);
  const sparkRequestIdRef = useRef(0);
  const hoveredCellRef = useRef<string | null>(null);
  const periodsRef = useRef<Period[]>(periods);
  const modelIdRef = useRef(modelId);
  const resolutionRef = useRef(resolution);
  const periodsSignatureRef = useRef("");
  const sparklineCacheRef = useRef<Map<string, number[]>>(new Map());
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

  const resolveHotspotThreshold = () => {
    const modeled = modeledHotspotThresholdRef.current ?? hotspotThresholdRef.current;
    if (hotspotMode !== "custom") {
      const values = sortedValuesDescRef.current;
      const modeledCount = modeledHotspotCountRef.current;
      if (values.length > 0 && modeledCount !== null && Number.isFinite(modeledCount) && modeledCount > 0) {
        const count = Math.max(1, Math.round(modeledCount));
        const idx = Math.max(0, Math.min(values.length - 1, count - 1));
        return values[idx] ?? modeled;
      }
      return modeled;
    }
    const values = sortedValuesDescRef.current;
    const total = totalCellsRef.current;
    if (values.length === 0 || total === 0) return modeled;
    const clamped = Math.min(Math.max(hotspotPercentile, 0), 100);
    const count = Math.max(1, Math.round((total * clamped) / 100));
    const idx = Math.max(0, Math.min(values.length - 1, count - 1));
    return values[idx] ?? modeled;
  };

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const showPoi = poiFilters.Park || poiFilters.Marina || poiFilters.Ferry;
    if (!showPoi) {
      poiMarkersRef.current.forEach((marker) => marker.remove());
      poiMarkersRef.current = [];
      return;
    }

    const loadPoi = async () => {
      if (poiLoadedRef.current && poiDataRef.current) return poiDataRef.current;
      const response = await fetch("/data/places_of_interest.json");
      if (!response.ok) throw new Error("Failed to load POI data");
      const payload = (await response.json()) as {
        items?: Array<{ type: string; name: string; latitude: number; longitude: number }>;
      };
      poiLoadedRef.current = true;
      poiDataRef.current = payload.items ?? [];
      return poiDataRef.current;
    };

    let cancelled = false;

    loadPoi()
      .then((items) => {
        if (cancelled || !map) return;
        poiMarkersRef.current.forEach((marker) => marker.remove());
        poiMarkersRef.current = [];

        const iconMap: Record<string, string> = {
          Park: "park",
          Marina: "sailing",
          Ferry: "directions_boat",
        };

        const markers = items
          .filter((poi) => {
            const key = poi.type as keyof typeof poiFilters;
            return poiFilters[key] ?? false;
          })
          .map((poi) => {
          const el = document.createElement("button");
          el.type = "button";
          el.className = "poiMarker";
          el.setAttribute("aria-label", poi.name);
          const icon = iconMap[poi.type] ?? "directions_boat";
          el.innerHTML = `<span class=\"material-symbols-rounded\">${icon}</span>`;

          const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: true }).setHTML(
            `<div class=\"poiPopup\">` +
              `<div class=\"poiPopup__title\">${poi.name}</div>` +
              `<div class=\"poiPopup__meta\">${poi.latitude.toFixed(4)}, ${poi.longitude.toFixed(4)}</div>` +
              `</div>`
          );

          return new maplibregl.Marker({ element: el, anchor: "bottom" })
            .setLngLat([poi.longitude, poi.latitude])
            .setPopup(popup)
            .addTo(map);
        });

        poiMarkersRef.current = markers;
      })
      .catch(() => {
        if (cancelled) return;
      });

    return () => {
      cancelled = true;
    };
  }, [poiFilters, mapReady]);

  useEffect(() => {
    hotspotsOnlyRef.current = hotspotsEnabled;
  }, [hotspotsEnabled]);

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
    periodsRef.current = periods;
    periodsSignatureRef.current = periods.map((p) => p.periodKey).join("|");
  }, [periods]);

  useEffect(() => {
    modelIdRef.current = modelId;
  }, [modelId]);

  useEffect(() => {
    resolutionRef.current = resolution;
  }, [resolution]);

  useEffect(() => {
    modeledHotspotCountRef.current = hotspotModeledCount;
  }, [hotspotModeledCount]);


  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    renderForecastLayer(map);
  }, [hotspotMode, hotspotPercentile, hotspotModeledCount, hotspotsEnabled, mapReady]);

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

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-left");

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
      activeStyleUrlRef.current = nextStyle;
      mapRef.current.once("styledata", () => {
        if (!mapRef.current) return;
        try {
          mapRef.current.jumpTo({ center, zoom, bearing, pitch });
        } catch {
          // no-op
        }
        applyBasemapVisualTuning(mapRef.current, styleUrlRef.current === DARK_STYLE);
        mapRef.current.resize();
        renderForecastLayer(mapRef.current);
        applyLastWeekFromCache(mapRef.current);
      });
    };

    canvas.addEventListener("webglcontextlost", onContextLost, false);
    canvas.addEventListener("webglcontextrestored", onContextRestored, false);

    const handleSparklineClick = (event: maplibregl.MapMouseEvent) => {
      const features = map.queryRenderedFeatures(event.point, { layers: ["grid-fill"] });
      const feature = features[0];
      if (!feature) return;
      const cellId = getFeatureCellId(feature as { properties?: Record<string, unknown> });
      if (!cellId) return;

      if (onGridCellSelect) {
        const value = Number(valuesByCellRef.current[cellId] ?? 0);
        onGridCellSelect({
          h3: cellId,
          value: Number.isFinite(value) ? value : 0,
          lngLat: { lng: event.lngLat.lng, lat: event.lngLat.lat },
        });
      }

      if (!enableSparklinePopup) return;

      const periodsList = periodsRef.current ?? [];
      if (periodsList.length === 0) return;

      const selectedIndex = periodsList.findIndex(
        (p) => p.year === selectedWeekYearRef.current && p.stat_week === selectedWeekRef.current
      );

      if (!sparkPopupRef.current) {
        sparkPopupRef.current = new maplibregl.Popup({
          closeButton: false,
          closeOnClick: true,
          offset: 10,
        });
      }

      const modelLabel = formatModelLabel(modelIdRef.current);
      const initialHtml = `
        <div class="sparkPopup">
          <div class="sparkPopup__title">Cell ${escapeHtml(cellId)}</div>
          <div class="sparkPopup__meta">Model: ${escapeHtml(modelLabel)}</div>
          <div class="sparkPopup__loading">Loading sparkline…</div>
        </div>
      `;

      sparkPopupRef.current.setLngLat(event.lngLat).setHTML(initialHtml).addTo(map);

      const requestId = (sparkRequestIdRef.current += 1);
      const cacheKey = [
        resolutionRef.current,
        modelIdRef.current,
        cellId,
        periodsSignatureRef.current,
      ].join("|");

      const cached = sparklineCacheRef.current.get(cacheKey);
      if (cached) {
        const svg = buildSparklineSvg(cached, selectedIndex, periodsList);
        const html = `
          <div class="sparkPopup">
            <div class="sparkPopup__title">Cell ${escapeHtml(cellId)}</div>
            <div class="sparkPopup__meta">Model: ${escapeHtml(modelLabel)}</div>
            ${svg}
          </div>
        `;
        sparkPopupRef.current.setHTML(html);
        return;
      }

      const fetchSeries = async () => {
        const values = await Promise.all(
          periodsList.map(async (period) => {
            const path = getForecastPathForPeriod(resolutionRef.current, period.fileId);
            try {
              const forecast = await loadForecast(resolutionRef.current, {
                kind: "explicit",
                explicitPath: path,
                modelId: modelIdRef.current,
              });
              const value = Number(forecast.values?.[cellId] ?? 0);
              return Number.isFinite(value) ? value : 0;
            } catch {
              return 0;
            }
          })
        );
        return values;
      };

      fetchSeries()
        .then((series) => {
          if (sparkRequestIdRef.current !== requestId) return;
          sparklineCacheRef.current.set(cacheKey, series);
          const svg = buildSparklineSvg(series, selectedIndex, periodsList);
          const html = `
            <div class="sparkPopup">
              <div class="sparkPopup__title">Cell ${escapeHtml(cellId)}</div>
              <div class="sparkPopup__meta">Model: ${escapeHtml(modelLabel)}</div>
              ${svg}
            </div>
          `;
          sparkPopupRef.current?.setHTML(html);
        })
        .catch(() => {
          if (sparkRequestIdRef.current !== requestId) return;
          const html = `
            <div class="sparkPopup">
              <div class="sparkPopup__title">Cell ${escapeHtml(cellId)}</div>
              <div class="sparkPopup__meta">Model: ${escapeHtml(modelLabel)}</div>
              <div class="sparkPopup__loading">Unable to load sparkline.</div>
            </div>
          `;
          sparkPopupRef.current?.setHTML(html);
        });
    };

    const handleMouseEnter = () => {
      map.getCanvas().style.cursor = "pointer";
    };
    const handleMouseMove = (event: maplibregl.MapMouseEvent) => {
      const features = map.queryRenderedFeatures(event.point, { layers: ["grid-fill"] });
      const cellId = getFeatureCellId(
        features[0] as { properties?: Record<string, unknown> } | undefined
      );
      if (!cellId || hoveredCellRef.current === cellId) return;
      hoveredCellRef.current = cellId;
      setGridHoverCell(map, cellId);
    };
    const handleMouseLeave = () => {
      hoveredCellRef.current = null;
      setGridHoverCell(map, null);
      map.getCanvas().style.cursor = "";
    };

    map.on("click", "grid-fill", handleSparklineClick);
    map.on("mouseenter", "grid-fill", handleMouseEnter);
    map.on("mousemove", "grid-fill", handleMouseMove);
    map.on("mouseleave", "grid-fill", handleMouseLeave);

    map.once("load", () => {
      applyBasemapVisualTuning(map, styleUrlRef.current === DARK_STYLE);
      map.resize();
      logMapDebug("load");
      setMapReady(true);
    });

    const handleStyleData = () => {
      if (!mapRef.current) return;
      applyBasemapVisualTuning(mapRef.current, styleUrlRef.current === DARK_STYLE);
    };
    map.on("styledata", handleStyleData);

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
      map.off("click", "grid-fill", handleSparklineClick);
      map.off("mouseenter", "grid-fill", handleMouseEnter);
      map.off("mousemove", "grid-fill", handleMouseMove);
      map.off("mouseleave", "grid-fill", handleMouseLeave);
      map.off("styledata", handleStyleData);
      if (sparkPopupRef.current) {
        sparkPopupRef.current.remove();
        sparkPopupRef.current = null;
      }
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
    const threshold = resolveHotspotThreshold();
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

    addGridOverlay(
      map,
      overlayRef.current,
      fillExpr,
      threshold,
      hotspots,
      shimmerThresholdRef.current,
      gridBorderColor
    );

    if (showKdeContoursRef.current) {
      setGridVisibility(map, false);
    } else if (hotspots) {
      setGridBaseVisibility(map, false);
      setHotspotVisibility(map, true);
    } else {
      setGridVisibility(map, true);
      setHotspotVisibility(map, false);
    }
    setGridHoverCell(map, hoveredCellRef.current);
    moveLastWeekToTop(map);
  };

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    let rafId = 0;
    let lastTick = 0;
    const shimmerId = "grid-shimmer-fill";
    const peakId = "grid-peak-shine";
    const hoverFillId = "grid-hover-fill";
    const hoverGlowId = "grid-hover-glow";
    const hoverCoreId = "grid-hover-core";

    const tick = (time: number) => {
      if (time - lastTick > 120) {
        lastTick = time;
        const t = time / 1000;
        const shimmerOpacity = 0.16 + 0.06 * Math.sin(t * 0.6);
        const glowOpacity = 0.5 + 0.12 * Math.sin(t * 0.5 + 0.8);
        const wandFillOpacity = 0.16 + 0.06 * Math.sin(t * 1.5 + 0.2);
        const wandGlowOpacity = 0.42 + 0.18 * Math.sin(t * 1.9);
        const wandCoreOpacity = 0.72 + 0.18 * Math.sin(t * 1.2 + 0.9);
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
        if (map.getLayer(hoverFillId)) {
          map.setPaintProperty(hoverFillId, "fill-opacity", hideGrid ? 0 : wandFillOpacity);
        }
        if (map.getLayer(hoverGlowId)) {
          map.setPaintProperty(hoverGlowId, "line-opacity", hideGrid ? 0 : wandGlowOpacity);
        }
        if (map.getLayer(hoverCoreId)) {
          map.setPaintProperty(hoverCoreId, "line-opacity", hideGrid ? 0 : wandCoreOpacity);
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

    if (activeStyleUrlRef.current === styleUrl) return;

    const center = map.getCenter();
    const zoom = map.getZoom();
    const bearing = map.getBearing();
    const pitch = map.getPitch();

    map.setStyle(styleUrl);
    activeStyleUrlRef.current = styleUrl;

    map.once("styledata", () => {
      try {
        map.jumpTo({ center, zoom, bearing, pitch });
      } catch {
        // no-op
      }
      applyBasemapVisualTuning(map, styleUrl === DARK_STYLE);
      map.resize();
      renderForecastLayer(map);
      applyLastWeekFromCache(map);
    });
  }, [styleUrl, mapReady]);

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
              forecast = await loadForecast(resolution, {
                kind: "explicit",
                explicitPath: forecastPath,
                modelId,
              });
            } catch (err) {
              if (fallbackForecastPath && fallbackForecastPath !== forecastPath) {
                // eslint-disable-next-line no-console
                console.warn("[Forecast] explicit path failed, falling back to latest period", err);
                forecast = await loadForecast(resolution, {
                  kind: "explicit",
                  explicitPath: fallbackForecastPath,
                  modelId,
                });
              } else {
                throw err;
              }
            }
          } else if (fallbackForecastPath) {
            forecast = await loadForecast(resolution, {
              kind: "explicit",
              explicitPath: fallbackForecastPath,
              modelId,
            });
          }
          values = forecast?.values ?? {};
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn("[Forecast] failed to load, rendering empty layer", err);
        }

        if (cancelled) return;

        const joined = attachProbabilities(grid, values);
        const { fillColorExpr, scale } = buildAutoColorExprFromValues(values, PALETTE, normalizationValues);
        const valueList = Object.values(values)
          .map((v) => Number(v))
          .filter((v) => Number.isFinite(v) && v > 0)
          .sort((a, b) => a - b);
        const featureValues = (joined.features ?? [])
          .map((feature) => Number((feature.properties as Record<string, unknown> | null)?.prob ?? 0))
          .filter((v) => Number.isFinite(v));
        sortedValuesDescRef.current = [...featureValues].sort((a, b) => b - a);
        totalCellsRef.current = featureValues.length;
        if (onGridCellCount) {
          onGridCellCount(featureValues.length);
        }

        valuesByCellRef.current = values;
        modeledHotspotThresholdRef.current =
          scale?.hotspotThreshold ?? (valueList.length > 0 ? Math.max(...valueList) : undefined);
        hotspotThresholdRef.current = modeledHotspotThresholdRef.current;
        if (valueList.length > 0) {
          const idx = Math.max(0, Math.floor(valueList.length * 0.95) - 1);
          shimmerThresholdRef.current = valueList[idx];
        } else {
          shimmerThresholdRef.current = undefined;
        }
        overlayRef.current = joined;
        fillExprRef.current = fillColorExpr as unknown as FillColorSpec;
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
  }, [resolution, mapReady, forecastPath, fallbackForecastPath, modelId, normalizationValues]);

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
  }, [hotspotsEnabled, legendSpec]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (!hasForecastLegend) {
      setGridVisibility(map, true);
      setHotspotVisibility(map, false);
      return;
    }
    if (showKdeContours) {
      setGridVisibility(map, false);
    } else if (hotspotsEnabled) {
      setGridBaseVisibility(map, false);
      setHotspotVisibility(map, true);
    } else {
      setGridVisibility(map, true);
      setHotspotVisibility(map, false);
    }
  }, [showKdeContours, hotspotsEnabled, mapReady, hasForecastLegend]);

  useEffect(() => {
    if (hasForecastLegend) return;
    if (showKdeContours) setShowKdeContours(false);
    if (hotspotsEnabled) onHotspotsEnabledChange(false);
  }, [hasForecastLegend, showKdeContours, hotspotsEnabled, onHotspotsEnabledChange]);

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

  useEffect(() => {
    onMapReady?.(mapRef.current);
    return () => onMapReady?.(null);
  }, [mapReady, onMapReady]);

  return (
    <div className={className ? `mapStage ${className}` : "mapStage"} style={style}>
      <div ref={containerRef} className="map" data-tour="map-canvas" />
      <div className="map__cornerRightBottom" data-tour="legend-controls">
        <button
          className={
            showKdeContours
              ? `iconBtn legendClusterBtn legendKde legendKde--active${!hasForecastLegend ? " legendClusterBtn--disabled" : ""}`
              : `iconBtn legendClusterBtn legendKde${!hasForecastLegend ? " legendClusterBtn--disabled" : ""}`
          }
          onClick={() => setShowKdeContours((v) => !v)}
          aria-label="Blurred (precomputed)"
          data-tour="kde"
          disabled={!hasForecastLegend}
        >
          <span className="material-symbols-rounded">blur_on</span>
        </button>
        <div className="legendClusterItem">
          {/* {hotspotsOnly && hotspotCount !== null && (
            <div
              className={`map__hotspotCount${
                hotspotToastVisible ? " map__hotspotCount--visible" : ""
              }`}
              role="status"
              aria-live="polite"
            >
              Hotspots: {hotspotCount.toLocaleString()} cells
            </div>
          )} */}
          <button
            className={
              hotspotsEnabled
                ? `iconBtn legendClusterBtn legendHotspots legendHotspots--active${!hasForecastLegend ? " legendClusterBtn--disabled" : ""}`
                : `iconBtn legendClusterBtn legendHotspots${!hasForecastLegend ? " legendClusterBtn--disabled" : ""}`
            }
            onClick={() => {
              const next = !hotspotsEnabled;
              if (next) setShowKdeContours(false);
              onHotspotsEnabledChange(next);
            }}
            aria-label="Toggle hotspots"
            data-tour="hotspots"
            disabled={!hasForecastLegend}
          >
            <span className="material-symbols-rounded">local_fire_department</span>
          </button>
        </div>
        <button
          className={`iconBtn legendClusterBtn${!hasForecastLegend ? " legendClusterBtn--disabled" : ""}`}
          onClick={() => setLegendOpen((v) => !v)}
          aria-label={legendOpen ? "Hide legend" : "Show legend"}
          data-tour="legend-toggle"
          disabled={!hasForecastLegend}
        >
          <span className="material-symbols-rounded">legend_toggle</span>
        </button>
      </div>
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
