# Architecture

This document is the shortest path to understanding how OrcaCast works as a static frontend application.

## System Shape

OrcaCast is a browser-only React + TypeScript SPA. There is no production API server. Runtime data is fetched directly from static files under `public/data`.

High-level flow:

1. `src/main.tsx` primes metadata from `public/data/meta.json` or `public/data/version.json`.
2. `src/App.tsx` mounts providers and route definitions.
3. `src/pages/MapPage/MapPage.tsx` is the main interactive route.
4. `src/pages/MapPage/useMapPageController.ts` coordinates period/model selection, compare state, and derived map inputs.
5. `src/components/ForecastMap/ForecastMap.tsx` owns MapLibre + deck.gl integration, layer updates, hover/click behavior, and overlays.
6. `src/data/*` loaders fetch and validate static JSON/GEOJSON payloads.

## Entry Points

- `src/main.tsx`: bootstrap, metadata validation, top-level startup error UI.
- `src/App.tsx`: global providers, route shell, lazy-loaded pages.
- `src/pages/MapPage/MapPage.tsx`: map route wrapper with error boundary.

## Major Frontend Modules

### App shell and state

- `src/state/MapStateContext.tsx`: shared map UI state such as resolution, compare mode, selected model, theme, and hotspot controls.
- `src/state/MenuContext.tsx`: side drawer open/close state.
- `src/components/AppHeader.tsx`, `src/components/AppFooter.tsx`, `src/components/SideDrawer.tsx`: app chrome shared by the map route.

### Map page

- `src/pages/MapPage/useMapPageController.ts`: derives the full map page state model from context + loaded data.
- `src/pages/MapPage/MapPageLayout.tsx`: turns controller state into rendered UI and compare-mode layouts.
- `src/components/ForecastMap/ForecastMap.tsx`: imperative map rendering layer.
- `src/components/ForecastMap/useForecastData.ts`: grid + forecast join/load lifecycle.
- `src/components/ForecastMap/MapInteractions.ts`: hover, click, sparkline popup, and cell selection logic.

### Data access

- `src/data/fetchClient.ts`: shared fetch client with timeout, retry, cache token support, and structured `DataLoadError`.
- `src/data/periods.ts`: loads and validates `periods.json`.
- `src/data/meta.ts`: loads and validates `meta.json` / `version.json`.
- `src/data/forecastIO.ts`: loads grids and weekly forecast/actual payloads.
- `src/data/expectedCount.ts`: loads expected and actual activity time-series helpers.
- `src/data/kdeBandsIO.ts`: loads blurred contour GeoJSON when enabled.

### Map rendering helpers

- `src/map/gridOverlay.ts`: MapLibre source/layer creation and updates for the H3 grid.
- `src/components/ForecastMap/buildLayers.ts`: basemap tuning, last-week overlay helpers, and layer build signatures used for performance stability.
- `src/map/colorScale.ts`: probability color ramps and legend specs.
- `src/map/deltaMap.ts`: compare-mode delta calculations.
- `src/map/sourceBackend.ts`: resolves preferred source/fallback source behavior for overlay data.

### Explainability

- `src/pages/ExplainabilityPage.tsx`: explainability route container.
- `src/features/explainability/data.ts`: static artifact loader for explainability bundles.
- `src/features/explainability/types.ts`: frontend contracts for explainability data.
- `src/explainability/builder.py`: Python-side artifact generator used outside the runtime app.

## Data Flow

### Core map flow

1. `useMapPageController()` calls `loadPeriods()`.
2. The selected period/resolution/model produce forecast and actual file paths via `src/config/dataPaths.ts`.
3. `ForecastMap` calls `useForecastData()`.
4. `useForecastData()` loads:
   - grid geometry from `public/data/grids/H4.geojson`, `H5.geojson`, or `H6.geojson`
   - forecast or actual values from `public/data/forecasts/latest/...`
5. The loader joins probability values onto the H3 grid feature collection.
6. `ForecastMap` pushes the data into MapLibre/deck.gl layers.

### Compare mode

Compare mode does not create a different data backend. It loads multiple forecast/actual payloads from the same static directories and computes a derived delta surface in memory.

### Error handling

- Fetch failures and schema validation failures are normalized into `DataLoadError`.
- `MapPageFailureState` shows the failing URL, optional HTTP status, and hidden details.
- `MapPageErrorBoundary` catches render-time exceptions separately from fetch/data failures.

## Performance Notes

The current map path is optimized to avoid rebuilding all layers on every interaction:

- large overlay data stays in refs instead of React state where practical
- hover updates are throttled to `requestAnimationFrame`
- grid/deck layer rebuilds are signature-gated
- `?debugPerf=1` logs fetch counts, render counts, and layer rebuild counts

## Configuration Surface

- `src/config/appConfig.ts`: best/default model id and KDE overlay settings.
- `src/config/dataPaths.ts`: all major public data path conventions.
- `src/config/mapLayers.ts`: last-week sightings source preferences and vector-tile fallback config.
- `vite.config.ts`: Vite base path `/`, chunk splitting, production bundling shape.

## Python Utilities

The Python utilities are not part of the production runtime, but they matter for data preparation and explainability:

- `src/cli/__main__.py`: CLI entrypoint
- `src/explainability/builder.py`: builds explainability artifact bundles consumed from `public/data/explainability`
- `src/io/` and `src/visualization/`: helper modules for preprocessing and geometry cleanup

Run them through the packaging entrypoint described in [DEVELOPMENT.md](./DEVELOPMENT.md).
