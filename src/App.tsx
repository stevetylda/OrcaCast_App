import React from "react";
import { MapContainer, TileLayer, GeoJSON as GeoJSONLayer } from "react-leaflet";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import type { Layer } from "leaflet";

type ForecastProps = { prob?: number; label?: string };
type ForecastFC = FeatureCollection<Geometry, ForecastProps>;

export default function App() {
  const [name, setName] = React.useState("sample");
  const [data, setData] = React.useState<ForecastFC | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      setErr(null);
      setData(null);
      try {
        const res = await fetch(`/forecasts/${name}.geojson`, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status} loading forecast`);
        setData((await res.json()) as ForecastFC);
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : String(e));
      }
    })();
  }, [name]);

  const center: [number, number] = [47.6, -122.35];

  return (
    <div style={{ display: "grid", gridTemplateRows: "auto 1fr", height: "100vh" }}>
      <header style={{ padding: 12, display: "flex", gap: 12, alignItems: "center" }}>
        <strong>Orca Forecast Viewer</strong>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          Forecast:
          <select value={name} onChange={(e) => setName(e.target.value)}>
            <option value="sample">sample</option>
          </select>
        </label>
        {err && <span style={{ color: "crimson" }}>Error: {err}</span>}
      </header>

      <MapContainer center={center} zoom={9} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution

