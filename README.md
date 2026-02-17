# OrcaCast App

OrcaCast is a static React + TypeScript web app for exploring weekly orca sighting forecast surfaces in the Pacific Northwest.

It combines:
- H3 grid-based forecast layers (`H4`, `H5`, `H6`)
- Last-week sightings overlays
- Optional blurred KDE contour overlays
- Map tools (hotspots, POIs, timeseries, guided tour)
- Supporting pages (`About`, `Data`, `Models`, `Explainability`, `Settings`)

## Tech Stack

- React 18
- TypeScript
- Vite (via `rolldown-vite`)
- MapLibre GL
- deck.gl
- React Router
- Driver.js (guided product tour)

## Quick Start

### Prerequisites

- Node.js 18+ (Node 20 recommended)
- npm

### Install and run

```bash
npm install
npm run dev
```

Open the printed local URL (typically `http://localhost:5173`).

### Build and preview

```bash
npm run build
npm run preview
```

### Lint

```bash
npm run lint
```

## Project Scripts

- `npm run dev`: start local dev server
- `npm run build`: type-check and build production bundle into `dist/`
- `npm run preview`: preview the production build locally
- `npm run lint`: run ESLint

## High-Level Architecture

- `src/App.tsx`
  - Declares app routes and wraps providers (`MapStateProvider`, `MenuProvider`)
- `src/pages/MapPage.tsx`
  - Orchestrates map-level UI state, period/model loading, and modal/tool interactions
- `src/components/ForecastMap.tsx`
  - Owns MapLibre/deck.gl lifecycle and all map rendering behavior
- `src/data/*.ts`
  - Client-side data loaders and lightweight caching for grids, forecasts, periods, and KDE bands
- `src/map/*.ts`
  - Color-scale logic and MapLibre layer wiring

## Routes

Configured in `src/App.tsx`:

- `/` map
- `/about`
- `/models`
- `/explainability`
- `/data`
- `/settings`

`/performance` exists as a page file but is currently not routed.

## Data Layout and Contracts

All runtime data is served from `public/data`.

### Required files

- `public/data/periods.json`
  - Array of `{ "year": number, "stat_week": number, "label"?: string }`
- `public/data/grids/H4.geojson`, `H5.geojson`, `H6.geojson`
  - GeoJSON feature collections keyed by H3 cell id (property `h3`)
- `public/data/forecasts/latest/weekly/<year>_<week>_<Hn>.json`
  - Forecast payload for each period + resolution
- `public/data/last_week_sightings/last_week_sightings_<year>-W<week>.geojson`
  - Optional sightings overlay data for selected periods
- `public/data/activity/activity_by_decade_week_SRKW_<Hn>.json`
  - Timeseries modal data
- `public/data/places_of_interest.json`
  - POI markers used by the map tools

### Forecast payload shapes supported

The loader supports several formats in forecast files:

- Single model:
  - `{ "values": { "<h3>": number, ... } }`
- Multi-model list:
  - `{ "models": [{ "id": "...", "values": { ... } }, ...] }`
- Multi-model map:
  - `{ "valuesByModel": { "<modelId>": { ... } } }`

If multiple models are present, a synthetic `consensus` option is exposed in the UI and computed as mean per H3 cell.

### KDE overlay files

By default, blurred contours are loaded from:

- `public/data/forecasts/latest/weekly_blurred/<year>_<week>_<Hn>_CONTOUR.geojson`

This is configured in `src/config/appConfig.ts`.

## Configuration

### `src/config/appConfig.ts`

Primary runtime toggles:

- default forecast period
- default/best model id (`bestModelId`)
- KDE folder/run id and geometry-pruning thresholds

### `src/config/dataPaths.ts`

Defines data path helpers for:

- grid GeoJSON
- forecast JSON
- KDE contour GeoJSON

### `vite.config.ts`

Currently builds/serves with `base: "/"`.  
If deploying under a subpath, update this value accordingly.

## Key UX Behaviors

- Forecast period list comes from `public/data/periods.json`.
- Selected map state is kept in-memory via `MapStateContext`.
- First-time welcome modal state uses `localStorage` key `orcacast.welcome.seen`.
- Guided tour is implemented with Driver.js (`src/tour/startMapTour.ts`).
- Map attribution text is managed in `src/config/attribution.ts`.

## Development Notes

- The app is fully static; no server-side runtime is required.
- `src/features/models` and parts of `src/features/analysis` are currently UI-first/prototype-oriented (includes dummy/mock content).
- Some files contain commented legacy code blocks; active implementations are further down in those files.

## Optional Python Utilities

Two helper modules exist for GeoJSON/KDE preprocessing:

- `src/io/load_kde_geojson.py`
- `src/visualization/geo_prune.py`

Explainability artifact builder CLI:

- `python3 -m src.cli explainability build --run-id ... --model-id ... --target ... --sample-n 50000 --top-k-interactions 50`

These are not required to run the frontend app, but can be used in preprocessing workflows.

## Deployment (Cloudflare Pages)

- Build command: `npm run build`
- Output directory: `dist`
- Node version: 18+

Since this is a static SPA, deployment is straightforward once `dist/` is generated.

## Troubleshooting

- Blank map or missing overlays:
  - Verify required `public/data` files exist for selected period/resolution.
- Forecast selector shows periods but no data:
  - Check matching forecast files for every `<year>_<week>_<Hn>` entry in `periods.json`.
- KDE toggle shows warning:
  - Expected when contour file for selected period/resolution is not present.
