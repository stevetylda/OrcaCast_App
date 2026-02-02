# OrcaCast Map App

Static UI shell for the OrcaCast forecasting map (Vite + React + TypeScript + MapLibre).

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Preview build

```bash
npm run preview
```

## Deploy to Cloudflare Pages

- Build command: `npm run build`
- Output directory: `dist`
- Node version: 18

The app is fully static and requires no server-side code.

## UI Notes

## Navigation + Pages

- Routes are defined in `src/App.tsx`. Add a new page by creating a component in `src/pages` and registering a `<Route />` entry.
- Shared page chrome (menu + “Back to map”) lives in `src/components/PageShell.tsx`.
- Map UI state (resolution, forecast selection, view toggles) is preserved in-memory via `src/state/MapStateContext.tsx` so navigating away and back does not reset selections.

Attribution:
- MapLibre attribution control is disabled in `src/components/ForecastMap.tsx` (`attributionControl: false`).
- Attribution content is managed in `src/config/attribution.ts`.
- The hover popover is rendered by `src/components/AttributionHover.tsx` and styled in `src/styles.css`.
- Attribution copy is also shown in the info modal in `src/components/InfoModal.tsx`.
- Basemap sources are defined in `src/components/ForecastMap.tsx` (CARTO Voyager / Dark Matter URLs).

Info modal content:
- Edit the “About / Learn More” copy in `src/components/InfoModal.tsx`.
- The info button that opens the modal is in `src/components/AppHeader.tsx`.
