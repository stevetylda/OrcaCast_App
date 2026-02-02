from __future__ import annotations

import geopandas as gpd
from shapely.geometry import Polygon, MultiPolygon

try:
    from shapely.validation import make_valid as _make_valid
except Exception:  # pragma: no cover - shapely < 2.0
    _make_valid = None

EQUAL_AREA_CRS = "EPSG:6933"


def rgba_to_tuple(value: str) -> tuple[int, int, int, int] | None:
    if not value:
        return None
    raw = value.strip().lower()
    if not raw.startswith("rgb"):
        return None
    left = raw.find("(")
    right = raw.find(")")
    if left == -1 or right == -1:
        return None
    parts = [p.strip() for p in raw[left + 1 : right].split(",")]
    if len(parts) < 3:
        return None
    try:
        r = int(float(parts[0]))
        g = int(float(parts[1]))
        b = int(float(parts[2]))
        a = float(parts[3]) if len(parts) >= 4 else 1.0
    except ValueError:
        return None
    return (r, g, b, int(round(a * 255)))


def _ensure_crs(gdf: gpd.GeoDataFrame, crs: str = "EPSG:4326") -> gpd.GeoDataFrame:
    if gdf.crs is None:
        return gdf.set_crs(crs, allow_override=True)
    return gdf


def _safe_make_valid(geom):
    if geom is None:
        return None
    if _make_valid:
        return _make_valid(geom)
    try:
        return geom.buffer(0)
    except Exception:
        return geom


def _drop_small_holes(geom, hole_area_min_m2: float):
    if hole_area_min_m2 is None:
        return geom
    if isinstance(geom, Polygon):
        if not geom.interiors:
            return geom
        keep_interiors = []
        for ring in geom.interiors:
            ring_area = Polygon(ring).area
            if ring_area >= hole_area_min_m2:
                keep_interiors.append(ring)
        return Polygon(geom.exterior.coords, keep_interiors)
    if isinstance(geom, MultiPolygon):
        parts = [_drop_small_holes(p, hole_area_min_m2) for p in geom.geoms]
        return MultiPolygon([p for p in parts if p is not None])
    return geom


def _explode_parts(gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    return gdf.explode(index_parts=False, ignore_index=True)


def prune_tiny_islands(
    gdf: gpd.GeoDataFrame,
    *,
    area_min_km2: float = 2.0,
    keep_largest_per_band: bool = True,
    hole_area_min_km2: float | None = 1.0,
) -> gpd.GeoDataFrame:
    if gdf.empty:
        return gdf

    gdf = gdf.copy()
    gdf = _ensure_crs(gdf)
    gdf["geometry"] = gdf.geometry.apply(_safe_make_valid)
    gdf = gdf[gdf.geometry.notna()]

    gdf = _explode_parts(gdf)
    gdf_eq = gdf.to_crs(EQUAL_AREA_CRS)

    if hole_area_min_km2 is not None:
        hole_area_min_m2 = hole_area_min_km2 * 1_000_000.0
        gdf_eq["geometry"] = gdf_eq.geometry.apply(
            lambda geom: _drop_small_holes(geom, hole_area_min_m2)
        )

    gdf_eq["__area_km2"] = gdf_eq.geometry.area / 1_000_000.0

    if "band_index" in gdf_eq.columns:
        def _keep_rows(group: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
            keep = group[group["__area_km2"] >= area_min_km2]
            if keep_largest_per_band and keep.empty and not group.empty:
                keep = group.loc[[group["__area_km2"].idxmax()]]
            return keep

        gdf_eq = gdf_eq.groupby("band_index", group_keys=False).apply(_keep_rows)
    else:
        gdf_eq = gdf_eq[gdf_eq["__area_km2"] >= area_min_km2]

    if "band_index" in gdf_eq.columns and not gdf_eq.empty:
        agg_cols = {
            col: "first"
            for col in gdf_eq.columns
            if col not in ("geometry", "__area_km2")
        }
        gdf_eq = gdf_eq.dissolve(by="band_index", as_index=False, aggfunc=agg_cols)

    gdf_eq = gdf_eq.drop(columns=["__area_km2"], errors="ignore")
    gdf_out = gdf_eq.to_crs(gdf.crs)
    gdf_out["geometry"] = gdf_out.geometry.apply(_safe_make_valid)
    return gdf_out
