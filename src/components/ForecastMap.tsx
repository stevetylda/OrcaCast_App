import React, { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { Map as MapLibreMap } from "maplibre-gl";
import type { FeatureCollection } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";
import type { H3Resolution } from "../config/dataPaths";
import { attachProbabilities, loadForecast, loadGrid } from "../data/forecastIO";
import { addGridOverlay, setHotspotVisibility } from "../map/gridOverlay";
import {
  buildAutoColorExprFromValues,
  buildFillExprFromScale,
  buildHotspotOnlyExpr,
} from "../map/colorScale";
import type { HeatScale } from "../map/colorScale";
import { ProbabilityLegend } from "./ProbabilityLegend";

type Props = {
  darkMode: boolean;
  resolution: H3Resolution;
  showLastWeek: boolean;
  timeseriesOpen: boolean;
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

export function ForecastMap({ darkMode, resolution, showLastWeek, timeseriesOpen }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const styleUrl = useMemo(() => (darkMode ? DARK_STYLE : VOYAGER_STYLE), [darkMode]);
  const overlayRef = useRef<FeatureCollection | null>(null);
  const fillExprRef = useRef<unknown[] | null>(null);
  const hotspotThresholdRef = useRef<number | undefined>(undefined);
  const [legendSpec, setLegendSpec] = useState<HeatScale | null>(null);
  const [legendOpen, setLegendOpen] = useState(true);
  const [hotspotsOnly, setHotspotsOnly] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const legendSpecRef = useRef<HeatScale | null>(null);
  const hotspotsOnlyRef = useRef(false);
  const showLastWeekRef = useRef(false);
  const styleUrlRef = useRef(styleUrl);
  const lastWeekDataRef = useRef<FeatureCollection | null>(null);
  const lastWeekPopupRef = useRef<maplibregl.Popup | null>(null);

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
    showLastWeekRef.current = showLastWeek;
  }, [showLastWeek]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: styleUrl,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      attributionControl: false,
      preserveDrawingBuffer: false,
      // @ts-expect-error: not in older typings
      cooperativeGestures: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-right");

    map.on("error", (e: any) => {
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
        if (showLastWeekRef.current && lastWeekDataRef.current) {
          ensureLastWeekLayer(mapRef.current, lastWeekDataRef.current);
          moveLastWeekToTop(mapRef.current);
        }
      });
    };
    canvas.addEventListener("webglcontextlost", onContextLost, false);
    canvas.addEventListener("webglcontextrestored", onContextRestored, false);

    map.once("load", () => {
      setMapReady(true);
    });

    mapRef.current = map;

    return () => {
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", onContextRestored);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const renderForecastLayer = (map: MapLibreMap) => {
    if (!overlayRef.current) return;
    const scale = legendSpecRef.current;
    const threshold = scale?.hotspotThreshold;
    const hotspots = scale ? hotspotsOnlyRef.current : false;
    const fillExpr = scale
      ? hotspots && threshold !== undefined
        ? buildHotspotOnlyExpr(scale, threshold)
        : buildFillExprFromScale(scale)
      : fillExprRef.current ?? undefined;
    if (fillExpr) {
      fillExprRef.current = fillExpr;
    }
    addGridOverlay(map, overlayRef.current, fillExpr, threshold, hotspots);
    if (scale) {
      setHotspotVisibility(map, hotspots);
    }
    moveLastWeekToTop(map);
  };

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
      if (showLastWeek && lastWeekDataRef.current) {
        ensureLastWeekLayer(map, lastWeekDataRef.current);
        moveLastWeekToTop(map);
      }
    });
  }, [styleUrl, showLastWeek]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    let cancelled = false;

    const loadOverlay = async () => {
      try {
        const grid = await loadGrid(resolution);
        let values: Record<string, number> = {};

        try {
          const forecast = await loadForecast(resolution, { kind: "latest" });
          values = forecast.values ?? {};
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn("[Forecast] failed to load, rendering empty layer", err);
        }

        if (cancelled) return;
        const joined = attachProbabilities(grid, values);
        const { fillColorExpr, scale } = buildAutoColorExprFromValues(values, PALETTE);
        overlayRef.current = joined;
        fillExprRef.current = fillColorExpr;
        hotspotThresholdRef.current = scale?.hotspotThreshold;
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
  }, [resolution, mapReady]);

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
    };

    if (!showLastWeek) {
      applyVisibility(false);
      return;
    }

    const attach = (data: FeatureCollection) => {
      ensureLastWeekLayer(map, data);
      applyVisibility(true);
    };

    if (lastWeekDataRef.current) {
      attach(lastWeekDataRef.current);
      return;
    }

    const load = async () => {
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}data/last_week_sightings.geojson`, {
          cache: "force-cache",
        });
        if (!res.ok) throw new Error(`Failed to fetch last week sightings: ${res.status}`);
        const data = (await res.json()) as FeatureCollection;
        lastWeekDataRef.current = data;
        if (!map.isStyleLoaded()) {
          map.once("styledata", () => {
            if (lastWeekDataRef.current) attach(lastWeekDataRef.current);
          });
        } else {
          attach(data);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("[Sightings] failed to load last week sightings", err);
      }
    };

    load();
  }, [showLastWeek]);

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
          if (showLastWeekRef.current && lastWeekDataRef.current) {
            ensureLastWeekLayer(map, lastWeekDataRef.current);
            moveLastWeekToTop(map);
          }
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

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !lastWeekPopupRef.current) return;

    const popup = lastWeekPopupRef.current;
    const onMove = (e: maplibregl.MapMouseEvent & maplibregl.EventData) => {
      const feature = e.features?.[0] as { properties?: { datetime?: string } } | undefined;
      const datetime = feature?.properties?.datetime;
      if (!datetime) return;
      popup.setLngLat(e.lngLat).setHTML(`<div style=\"font-size:12px;\">${datetime}</div>`).addTo(map);
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
    // no sparkle animation timer
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


  return (
    <>
      <div ref={containerRef} className="map" />
      {legendSpec && (
        <div className="map__cornerRightBottom">
          <button
            className={
              hotspotsOnly
                ? "iconBtn legendClusterBtn legendHotspots legendHotspots--active"
                : "iconBtn legendClusterBtn legendHotspots"
            }
            onClick={() => setHotspotsOnly((v) => !v)}
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
    </>
  );
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
        "circle-color": "rgba(0,255,240,0.25)",
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 2.5, 8, 3.5, 11, 4.5],
        "circle-blur": 0.8,
        "circle-opacity": 0.7,
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
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 1.3, 8, 2, 11, 3],
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
  if (map.getLayer(LAST_WEEK_LAYER_ID)) {
    map.moveLayer(LAST_WEEK_LAYER_ID);
  }
}
