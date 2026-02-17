# Vector tiles in OrcaCast

## What is migrated

- `last-week-sightings` now supports `source_kind=vector_tiles` first, with GeoJSON fallback.
- Expected tile location: `public/tiles/last_week_sightings/{z}/{x}/{y}.pbf`.
- Source layer name: `last_week_sightings`.

## Build tiles

Prerequisites:
- `tippecanoe`
- `tile-join`

Example (merge weekly files first, then tile):

```bash
python scripts/tiles/build_vector_tiles.py \
  --input public/data/last_week_sightings/all_last_week_sightings.geojson \
  --name last_week_sightings \
  --layer last_week_sightings \
  --minzoom 0 \
  --maxzoom 11
```

Output:
- `public/tiles/last_week_sightings/{z}/{x}/{y}.pbf`

## App source backend behavior

Layer config schema (`src/config/mapLayers.ts`):
- `id`, `type`, `source_kind`, `source_url`, `source_layer`, `minzoom`, `maxzoom`
- fallback fields: `fallback_source_kind`, `fallback_source_url`, `fallback_source_layer`

Runtime resolution:
1. App checks the preferred source URL.
2. If missing/unavailable, app falls back to GeoJSON and logs a warning.

## Updating tiles

1. Regenerate from latest source GeoJSON.
2. Replace folder under `public/tiles/last_week_sightings/`.
3. Validate local run (`npm run dev`) and map filtering by selected/previous week.

## Guardrails

- Runtime data budget warning for oversized GeoJSON payloads (`src/data/forecastIO.ts`).
- Build-time checker:

```bash
python scripts/tiles/check_large_assets.py --max-mb 8
```

Use `--warn-only` for non-blocking mode.
