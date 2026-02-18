import React from "react";
import ReactDOM from "react-dom/client";
import maplibregl from "maplibre-gl";
import { Protocol } from "pmtiles";
import App from "./App";
import "driver.js/dist/driver.css";

const PMTILES_PROTOCOL_KEY = "__ORCACAST_PMTILES_PROTOCOL__";

if (!(window as Record<string, unknown>)[PMTILES_PROTOCOL_KEY]) {
  const protocol = new Protocol();
  maplibregl.addProtocol("pmtiles", protocol.tile);
  (window as Record<string, unknown>)[PMTILES_PROTOCOL_KEY] = protocol;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
