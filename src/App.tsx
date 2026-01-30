import React from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";

type ForecastFC = GeoJSON.FeatureCollection;

export default function App() {
  const [name, setName] = React.useState("sample");
  const [data, setData] = React.useState<ForecastFC | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  async function loadForecast(forecastName: string) {
    setErr(null);
    setData(null);
    try {
      // Start simple: fetch from /public/forecasts
      const res = await fetch(`/forecasts/${forecastName}.geojson`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status} loading forecast`);
      const json = (await res.json()) as ForecastFC;
      setData(json);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    }
  }

  React.useEffect(() => {
    loadForecast(name);
  }, [name]);

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

      <MapContainer center={[47.6, -122.35]} zoom={9} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          // OSM tiles: free + tokenless. (Consider rate limits if you go huge.)
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        {data && (
          <GeoJSON
            data={data as any}
            onEachFeature={(feature, layer) => {
              const p: any = feature.properties ?? {};
              layer.bindPopup(`${p.label ?? "cell"}<br/>prob=${p.prob ?? "?"}`);
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}

