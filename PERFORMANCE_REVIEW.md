# Compare Mode + Map Performance Review

Date: 2026-02-16
Scope: compare mode rendering, map data fetch/decode paths, and high-frequency map state updates.

## Executive Summary
- The largest concrete performance hotspot was duplicate JSON fetch/parse work for forecast payloads used by compare mode model selectors and map rendering.
- I implemented behavior-neutral caching of raw forecast payloads and removed a redundant selected-period fetch in `MapPage` model-option loading.
- This should lower initial compare-mode load latency, lower repeated CPU JSON parse cost, and reduce unnecessary network/disk activity (especially when quickly switching periods/models/resolutions).

## High-confidence issues (likely real)

1. **Duplicate payload decoding in forecast I/O path**
   - `loadForecast()` and `loadForecastModelIds()` independently fetched and parsed the same file when both were called for the same path.
   - Compare mode and model-option initialization call these paths repeatedly across periods and candidate paths.
   - **Fix made:** Added shared `forecastRawCache` + `loadForecastRaw(url)` so both functions reuse decoded payloads.

2. **Redundant selected-period fetch in compare/model bootstrapping**
   - In `MapPage` model bootstrap effect, selected-period path did `loadForecast(...)` (existence check) and then `loadForecastModelIds(...)` for the same file.
   - This doubles work for the common path before any user interaction.
   - **Fix made:** Use only `loadForecastModelIds(...)` in that branch and set `hasForecastForSelectedPeriod=true` on success.

## Medium-confidence risks (data-regime dependent)

1. **Linear probing over `actualsPathCandidates` can still be expensive on cold start**
   - For sparse data or missing many periods, the loop probes several candidate files sequentially.
   - Current caching now prevents repeated decode for already-requested URLs, but first-run latency may still spike with many 404s.
   - Recommendation: cap probe depth or maintain a lightweight “latest available actuals period” index file.

2. **Multiple map instances in compare mode amplify styling/render work**
   - Dual-map and swipe modes render 2 `ForecastMap` instances simultaneously; each applies style tuning and overlays.
   - This is expected behavior, but on integrated GPUs it can increase heat.
   - Recommendation: consider an optional low-power mode that disables POI markers/sparkline hover and lowers label effects in compare mode.

## Low-confidence smells (worth checking)

1. **Verbose dev-only console logging in map lifecycle paths**
   - `console.info` in repeatedly hit code paths can create overhead/noise in dev profiling.
   - Not a production concern, but can obscure true hotspots.

2. **Compare-mode key remount strategy may over-remount maps**
   - Several map keys are broad and may force remounts more often than necessary.
   - This can be beneficial for correctness/state reset, so this is only a smell unless profiling confirms remount churn.

## Behavior / correctness impact of implemented changes
- The implemented changes are **behavior-neutral** for model outputs and map values.
- They only reduce duplicate fetch/parse work and remove one redundant selected-period read in model-option hydration.
- No forecasting math, temporal windowing, spatial joins, or evaluation logic changed.

## Files reviewed most directly
- `src/pages/MapPage.tsx`
- `src/components/ForecastMap.tsx`
- `src/components/Compare/DualMapCompare.tsx`
- `src/components/Compare/SingleSwipeMap.tsx`
- `src/components/Compare/SwipeCompareView.tsx`
- `src/data/forecastIO.ts`
- `src/state/MapStateContext.tsx`

## Files changed
- `src/data/forecastIO.ts`
- `src/pages/MapPage.tsx`

## Minimal canary check
1. `npm run build`
2. Open app and toggle compare mode on/off while switching periods and models; verify model selectors populate and maps render as before.
