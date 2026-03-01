# Data Layout

This document describes what lives under `public/data`, which files are required, and how OrcaCast names forecast artifacts.

## Key Rule

`public/data` is the runtime data backend. If a file is missing or malformed, the browser application fails at runtime because there is no API server to fill the gap.

## Directory Overview

### `public/data/meta.json`

Runtime metadata file. The frontend expects at least one version-like field:

- `data_version`
- `version`
- `build_id`
- `buildId`

Optional fields currently used:

- `generated_at`
- `active_explainability_context`

If `meta.json` is missing, the app will also try `public/data/version.json`.

### `public/data/periods.json`

Ordered list of available forecast periods.

Expected shape:

```json
[
  { "year": 2025, "stat_week": 34, "label": "2025-08-18 -> 2025-08-24" }
]
```

Important conventions:

- `year` is ISO week-year
- `stat_week` is ISO week number
- `label` is optional but recommended for readability

### `public/data/grids/`

Static H3 geometry used for map joins.

Required files:

- `grids/H4.geojson`
- `grids/H5.geojson`
- `grids/H6.geojson`

Each feature collection should expose an H3 cell id in `properties.h3` or one of the tolerated fallback property names used by the map.

### `public/data/forecasts/latest/weekly/`

Primary forecast payload directory.

Expected files:

- latest aliases:
  - `weekly/H4.json`
  - `weekly/H5.json`
  - `weekly/H6.json`
- explicit period files:
  - `weekly/<year>_<week>_H4.json`
  - `weekly/<year>_<week>_H5.json`
  - `weekly/<year>_<week>_H6.json`

Supported payload shapes:

1. Single-model:

```json
{
  "target_start": "2025-08-18",
  "target_end": "2025-08-24",
  "values": {
    "8928308280fffff": 0.018
  }
}
```

2. Multi-model list:

```json
{
  "models": [
    {
      "id": "best",
      "values": {
        "8928308280fffff": 0.018
      }
    }
  ]
}
```

3. Multi-model map:

```json
{
  "valuesByModel": {
    "best": {
      "8928308280fffff": 0.018
    }
  }
}
```

The frontend validates that at least one of `values`, `models`, or `valuesByModel` is present.

### `public/data/forecasts/latest/actuals/`

Actual observation-style payloads used in compare mode. These follow the same per-period naming pattern as weekly forecasts:

- `actuals/<year>_<week>_H4.json`
- `actuals/<year>_<week>_H5.json`
- `actuals/<year>_<week>_H6.json`

### `public/data/forecasts/latest/shap/`

Per-period explainability inputs used by some runtime map interactions and by the offline explainability tooling.

Naming pattern:

- local SHAP:
  - `<year>_<week>_<resolution>_<model_id>_shap.json`
- global SHAP:
  - `<year>_<week>_<resolution>_<model_id>_shap_global.json`

Examples:

- `2025_34_H4_composite_linear_logit_shap.json`
- `2025_34_H4_composite_linear_logit_shap_global.json`

### `public/data/forecasts/latest/weekly_blurred/`

Optional blurred contour GeoJSON artifacts for KDE-style overlays.

Naming pattern:

- `<year>_<week>_<resolution>_CONTOUR.geojson`

Example:

- `2025_34_H4_CONTOUR.geojson`

### `public/data/last_week_sightings/`

Last-week sightings overlay files used on the map.

Naming pattern:

- `last_week_sightings_<year>-W<week>.geojson`

Examples:

- `last_week_sightings_2025-W34.geojson`
- `last_week_sightings_2026-W02.geojson`

There is also an aggregate file:

- `all_last_week_sightings.geojson`

That aggregate is useful for preprocessing and vector-tile generation, not for normal runtime loading.

### `public/data/expected_count/`

Expected and actual activity summary tables used in UI summaries and some charts.

Expected files:

- `H4_EXPECTED_ACTIVITY.json`
- `H5_EXPECTED_ACTIVITY.json`
- `H6_EXPECTED_ACTIVITY.json`
- `H4_ACTUAL_ACTIVITY.json`
- `H5_ACTUAL_ACTIVITY.json`
- `H6_ACTUAL_ACTIVITY.json`

### `public/data/activity/`

Decade-week activity files used by the time-series modal.

Current pattern:

- `activity_by_decade_week_SRKW_H4.json`
- `activity_by_decade_week_SRKW_H5.json`
- `activity_by_decade_week_SRKW_H6.json`

### `public/data/explainability/`

Static explainability artifact bundles.

Top-level index:

- `public/data/explainability/index.json`

Bundle layout:

- `public/data/explainability/<run_id>/<model_id>/<target>/meta.json`
- `.../features.json`
- `.../shap_samples.json`
- `.../global_importance.json`
- `.../interaction_ranking.json`
- `.../interaction_samples.json`

### `public/data/places_of_interest.json`

Optional POI overlay dataset used for park/marina/ferry markers.

## Naming Conventions

### Resolutions

- `H4`
- `H5`
- `H6`

### Period file ids

Internal path builders normalize period identifiers to:

- `<year>_<week>`

Examples:

- `2025_1`
- `2025_34`
- `2026_8`

### Week overlay ids

Last-week sightings use:

- `<year>-W<week>`

Examples:

- `2025-W1`
- `2025-W34`

## Cache Token Behavior

The frontend appends a stable version token to many requests using the runtime metadata version/build id. That means data file contents can change without renaming every URL, as long as `meta.json` changes too.

## Contributor Checklist

Before changing data files:

1. Confirm `periods.json` matches the actual forecast files present on disk.
2. Keep H3 resolution naming exactly `H4`, `H5`, `H6`.
3. Update `meta.json` when shipping data changes so the cache token changes.
4. Preserve directory and filename conventions unless you also update `src/config/dataPaths.ts`.
5. Run `npm run data:validate` and `npm run build`.
