from pathlib import Path

import geopandas as gpd
from shapely.geometry import Polygon

from src.io.load_kde_geojson import load_kde_bands_geojson
from src.visualization.geo_prune import prune_tiny_islands


FIXTURES = Path(__file__).parent / "fixtures"


def test_load_kde_bands_geojson():
    gdf = load_kde_bands_geojson(str(FIXTURES / "kde_bands_sample.geojson"))
    assert not gdf.empty
    assert "band_index" in gdf.columns
    assert "color" in gdf.columns
    assert gdf.geometry.notna().all()


def test_prune_tiny_islands_keeps_largest_per_band():
    gdf = load_kde_bands_geojson(str(FIXTURES / "kde_bands_sample.geojson"))
    pruned = prune_tiny_islands(gdf, area_min_km2=5.0, keep_largest_per_band=True, hole_area_min_km2=None)
    assert not pruned.empty
    assert set(pruned["band_index"].tolist()) == {0, 1}
    assert pruned.geometry.is_valid.all()


def test_prune_small_holes():
    exterior = [(-123.0, 47.0), (-122.7, 47.0), (-122.7, 47.3), (-123.0, 47.3), (-123.0, 47.0)]
    tiny_hole = [(-122.9, 47.1), (-122.8995, 47.1), (-122.8995, 47.1005), (-122.9, 47.1005), (-122.9, 47.1)]
    geom = Polygon(exterior, [tiny_hole])
    gdf = gpd.GeoDataFrame(
        [{"band_index": 2, "color": "rgba(0,0,0,0.5)"}],
        geometry=[geom],
        crs="EPSG:4326",
    )
    pruned = prune_tiny_islands(gdf, area_min_km2=0.1, keep_largest_per_band=True, hole_area_min_km2=2.0)
    assert not pruned.empty
    assert pruned.geometry.iloc[0].interiors == ()
