# Map data audit

## Inventory

| Layer / source | Source type | Approx size | Loaded from | Notes | Priority |
|---|---|---:|---|---|---|
| Forecast H3 grid (`data/grids/H4/H5/H6.geojson`) | GeoJSON | H4 0.6MB, H5 0.9MB, H6 2.1MB | `loadGrid()` in `src/data/forecastIO.ts` | Loaded into browser then joined with forecast values; drives most interactive fill/hover/click behavior. | P1 |
| Weekly forecast values (`data/forecasts/latest/weekly/*.json`) | JSON tables | ~36MB total (many period files) | `loadForecast()` in `src/data/forecastIO.ts` | Dynamic/user-driven by model and selected period; not map geometry. | P1 |
| Last-week sightings (`data/last_week_sightings/*.geojson`) | GeoJSON points | ~580KB total in repo | `ForecastMap` fetches per selected week | Frequent reload path on period changes; best initial vector-tile migration candidate. | P0 |
| KDE blurred contours (`data/forecasts/latest/weekly_blurred/*.geojson`) | GeoJSON polygons | ~112MB total | `loadKdeBandsGeojson()` in `src/data/kdeBandsIO.ts` | Optional overlay, large static artifacts per period. | P0 |
| Basemap style tiles | Raster/vector (remote) | n/a | External style URLs | Not app-hosted heavy assets. | P2 |

## Static vs dynamic categorization

- **Static geometry**: H3 grid boundaries and KDE contour geometry per period artifact.
- **Dynamic/user-driven**: forecast value files (`selectedWeek`, `modelId`) and last-week sightings selection mode (`previous/selected/both`).
- **Frequently reloaded**: sightings and forecast values on period/model changes.

## Migration recommendation

1. **P0**: Last-week sightings -> vector tiles (`public/tiles/last_week_sightings/{z}/{x}/{y}.pbf`) with week/year filtering in style filters.
2. **P0**: KDE contours -> vector tiles per period to avoid large GeoJSON parse spikes.
3. **P1**: H3 grid geometry -> vector tiles + runtime forecast value join strategy (feature-state or per-period tiled attributes).
