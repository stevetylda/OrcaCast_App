# Deployment

This document captures the current deployment assumptions for OrcaCast on Cloudflare Pages.

## Production Model

OrcaCast is deployed as a static site:

- build tool: Vite
- app output: `dist/`
- runtime data backend: static files under `public/data/`
- host target: Cloudflare Pages

There is no application server in front of the browser runtime.

## Cloudflare Pages Assumptions

### Build environment

Current assumptions based on the repository and recent deployment logs:

- Node.js 22.x is acceptable
- npm 10.x is used
- Cloudflare runs `npm clean-install --progress=false`
- build command should be:

```bash
npm run build
```

- publish directory should be:

```text
dist
```

### SPA routing

The app uses `BrowserRouter`, so production hosting must serve `index.html` for deep links such as:

- `/about`
- `/data`
- `/explainability`
- `/models`

If Cloudflare Pages is not already configured to do SPA fallback, route refreshes on deep links will fail.

## Environment Variables

### Used by the frontend build

- `VITE_BUILD_ID`

This is optional but recommended. It is used as a stable build/version token and appears in the runtime UI.

### Recommended values

- `VITE_BUILD_ID`: a git SHA, release id, or timestamped build identifier

Example:

```text
VITE_BUILD_ID=2026-03-01-358b697
```

## Data Update Model

Data updates are static file deployments, not API mutations.

### What usually changes together

When shipping a new data refresh, update these together:

1. `public/data/meta.json`
2. `public/data/periods.json`
3. new or updated files under:
   - `public/data/forecasts/latest/weekly/`
   - `public/data/forecasts/latest/actuals/`
   - `public/data/forecasts/latest/shap/`
   - `public/data/forecasts/latest/weekly_blurred/`
   - `public/data/last_week_sightings/`
   - `public/data/explainability/` if explainability artifacts changed

### Why `meta.json` matters

The frontend uses the metadata version/build token for cache-busting. If data changes but `meta.json` does not, users can see stale content because URLs remain cacheable.

## Deployment Checklist

Before pushing a production deploy:

1. `npm install`
2. `npm run lint`
3. `npm run test`
4. `npm run typecheck`
5. `npm run data:validate`
6. `npm run build`
7. Verify `package-lock.json` matches `package.json`
8. Confirm `public/data/meta.json` changed if data changed

## Cloudflare Failure Modes To Expect

### `npm error Invalid Version:`

This almost always means lockfile/package metadata is malformed or out of sync. Because Cloudflare uses `npm clean-install`, local `npm run build` success is not enough.

Check:

- `package.json`
- `package-lock.json`
- nested lockfile package entries for malformed `version` records

### App builds but route refreshes 404

This indicates missing SPA fallback behavior for `BrowserRouter`.

### App loads but map shows failure UI

This indicates one of the required static data files is missing, invalid JSON, or failing schema validation. The new failure UI will show:

- URL
- optional HTTP status
- hidden details

## How Data Updates Work Operationally

### Small content update

1. Replace or add files under `public/data`
2. Update `public/data/meta.json`
3. Build and deploy

### Explainability artifact refresh

1. Generate artifacts with the Python CLI
2. Write them under `public/data/explainability/<run_id>/<model_id>/<target>/`
3. Update `public/data/explainability/index.json`
4. Update `public/data/meta.json`
5. Build and deploy

### Forecast refresh

1. Add new weekly forecast files
2. Add matching actual files if compare mode expects them
3. Update `periods.json`
4. Update `meta.json`
5. Build and deploy

## Contributor Notes

If you are new to the repo, read these in order:

1. `docs/DEVELOPMENT.md`
2. `docs/DATA_LAYOUT.md`
3. `docs/ARCHITECTURE.md`
4. this file
