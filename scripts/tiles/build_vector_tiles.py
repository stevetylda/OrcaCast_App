#!/usr/bin/env python3
"""Build vector tiles for OrcaCast static hosting.

Requires tippecanoe (https://github.com/felt/tippecanoe).
Outputs directory MVT tiles: public/tiles/<name>/{z}/{x}/{y}.pbf
"""

from __future__ import annotations

import argparse
import gzip
import shutil
import subprocess
from pathlib import Path


def run(cmd: list[str]) -> None:
    print("+", " ".join(cmd))
    subprocess.run(cmd, check=True)


def decompress_gzip_tiles(tile_dir: Path) -> int:
    changed = 0
    for tile in tile_dir.rglob("*.pbf"):
        data = tile.read_bytes()
        if len(data) < 2 or data[0] != 0x1F or data[1] != 0x8B:
            continue
        tile.write_bytes(gzip.decompress(data))
        changed += 1
    return changed


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, help="Input GeoJSON/GeoJSONSeq")
    parser.add_argument("--name", required=True, help="Output tile folder name")
    parser.add_argument("--layer", required=True, help="MVT source-layer name")
    parser.add_argument("--minzoom", type=int, default=0)
    parser.add_argument("--maxzoom", type=int, default=8)
    parser.add_argument("--output-root", default="public/tiles")
    parser.add_argument(
        "--pmtiles-out",
        default=None,
        help="Output PMTiles file path (default: <output-root>/<name>.pmtiles)",
    )
    parser.add_argument(
        "--explode-folder",
        action="store_true",
        help="Also export {z}/{x}/{y}.pbf folder tiles (legacy mode).",
    )
    args = parser.parse_args()

    tippecanoe = shutil.which("tippecanoe")
    if not tippecanoe:
        raise SystemExit("tippecanoe is required but not found in PATH")

    output_root = Path(args.output_root)
    output_root.mkdir(parents=True, exist_ok=True)
    mbtiles_path = output_root / f"{args.name}.mbtiles"
    tile_dir = output_root / args.name
    pmtiles_path = Path(args.pmtiles_out) if args.pmtiles_out else (output_root / f"{args.name}.pmtiles")

    if mbtiles_path.exists():
        mbtiles_path.unlink()
    if pmtiles_path.exists():
        pmtiles_path.unlink()
    if args.explode_folder and tile_dir.exists():
        shutil.rmtree(tile_dir)

    run(
        [
            tippecanoe,
            "-o",
            str(mbtiles_path),
            "-l",
            args.layer,
            "-Z",
            str(args.minzoom),
            "-z",
            str(args.maxzoom),
            "--no-tile-compression",
            "--drop-densest-as-needed",
            "--read-parallel",
            args.input,
        ]
    )

    pmtiles = shutil.which("pmtiles")
    if not pmtiles:
        raise SystemExit("pmtiles CLI is required but not found in PATH")
    run([pmtiles, "convert", str(mbtiles_path), str(pmtiles_path)])
    print(f"Built PMTiles: {pmtiles_path}")

    if args.explode_folder:
        tile_join = shutil.which("tile-join")
        if not tile_join:
            raise SystemExit("tile-join is required to explode mbtiles to folder tiles")
        run([tile_join, "-e", str(tile_dir), str(mbtiles_path)])
        decompressed = decompress_gzip_tiles(tile_dir)
        if decompressed:
            print(f"Decompressed {decompressed} gzipped tile payloads under {tile_dir}")
        print(f"Built tiles: {tile_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
