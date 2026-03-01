# Development

This guide is for contributors who want to get OrcaCast running locally and make safe changes quickly.

## Prerequisites

### Frontend

- Node.js 20+ recommended
- npm 10+

### Python utilities

- Python 3.10+

Python is only required if you need the helper CLI or explainability artifact builder.

## First 15 Minutes

### 1. Install dependencies

```bash
npm install
```

### 2. Start the app

```bash
npm run dev
```

The Vite dev server runs with `base: "/"`, so local paths match production more closely than a GitHub Pages-style subpath app.

### 3. Sanity check the app

Visit these routes:

- `/`
- `/about`
- `/data`
- `/explainability`

The map route is the critical runtime check because it exercises metadata, period loading, grid loading, forecast loading, and map rendering.

## Main Commands

### Run

```bash
npm run dev
```

### Lint

```bash
npm run lint
```

### Test

```bash
npm run test
```

Current tests run through `scripts/run-tests.ts` using Node’s TypeScript stripping mode. This is intentionally lightweight, not a full browser E2E setup.

### Typecheck

```bash
npm run typecheck
```

### Build

```bash
npm run build
```

### Preview production output

```bash
npm run preview
```

### Analyze

```bash
npm run analyze
```

Today this is an alias for the production build. Use it when you want the final chunk split and gzip-size output from Vite.

### Data validate

```bash
npm run data:validate
```

Today this runs `scripts/check_artifacts.sh`, which checks for forbidden tracked artifacts in git. It is not a full semantic dataset validator, but it is part of the repo hygiene workflow.

## Python Tooling

### Create and activate an environment

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -e .
```

### Explore the CLI

```bash
python -m src.cli --help
python -m src.cli explainability build --help
```

### Optional Makefile aliases

```bash
make py-install
make py-cli-help
make py-exp-help
```

## Useful Debug Modes

### Perf debug

Add `?debugPerf=1` to the URL:

```text
http://localhost:5173/?debugPerf=1
```

This logs:

- fetch counts
- layer rebuild counts
- render counts for key map components

### Map debug

The map runtime also supports a local debug flag through local storage:

```js
localStorage.setItem("orcacast.debug.map", "true");
```

Reload after setting it.

## Important Source Files

If you only have 30 minutes, start here:

- `src/main.tsx`
- `src/App.tsx`
- `src/pages/MapPage/MapPage.tsx`
- `src/pages/MapPage/useMapPageController.ts`
- `src/components/ForecastMap/ForecastMap.tsx`
- `src/data/fetchClient.ts`
- `src/config/dataPaths.ts`

## Styling

The app stylesheet has been split into:

- `src/styles/base.css`
- `src/styles/layout.css`
- `src/styles/map.css`
- `src/styles/components.css`

Start there instead of editing a monolithic global file.

## Data Expectations

The app assumes `public/data` is populated. For the runtime map route, the minimum useful set is:

- `public/data/meta.json` or `public/data/version.json`
- `public/data/periods.json`
- `public/data/grids/H4.geojson`, `H5.geojson`, `H6.geojson`
- `public/data/forecasts/latest/weekly/*.json`

If these are missing or invalid, the app now shows a structured failure UI instead of a blank screen.

## Typical Local Workflow

1. `npm run dev`
2. make your change
3. `npm run lint`
4. `npm run test`
5. `npm run typecheck`
6. `npm run data:validate`
7. `npm run build`

## Common Pitfalls

- Do not change file naming conventions in `public/data` casually. Path builders are centralized in `src/config/dataPaths.ts`.
- A broken `meta.json` or `periods.json` now fails fast, by design.
- Compare mode and explainability flows load additional static data that the map route alone does not cover.
- Cloudflare Pages uses `npm clean-install`, so `package.json` and `package-lock.json` must stay in sync.
