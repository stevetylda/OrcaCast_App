#!/usr/bin/env python3
"""Fail CI when raw GeoJSON assets exceed size budget."""

from __future__ import annotations

import argparse
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default="public/data")
    parser.add_argument("--max-mb", type=float, default=8.0)
    parser.add_argument("--warn-only", action="store_true")
    args = parser.parse_args()

    root = Path(args.root)
    threshold = int(args.max_mb * 1024 * 1024)
    offenders: list[tuple[str, float]] = []

    for path in sorted(root.rglob("*.geojson")):
        size = path.stat().st_size
        if size > threshold:
            offenders.append((str(path), size / (1024 * 1024)))

    if offenders:
        print(f"Found {len(offenders)} GeoJSON assets over {args.max_mb:.1f}MB:")
        for path, mb in offenders:
            print(f" - {path}: {mb:.2f}MB")
        print("Remediation: convert these to vector tiles with scripts/tiles/build_vector_tiles.py")
        return 0 if args.warn_only else 1

    print(f"No GeoJSON assets exceed {args.max_mb:.1f}MB in {root}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
