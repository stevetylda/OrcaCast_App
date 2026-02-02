import type { Feature, FeatureCollection } from "geojson";

type KdeBandsFeature = Feature & {
  properties?: {
    band_index?: number;
    bin?: number;
    color?: string;
    fill?: string;
    [key: string]: unknown;
  };
};

const kdeBandsCache = new Map<string, FeatureCollection>();

function buildUrlCandidates(url: string): string[] {
  const candidates = new Set<string>();
  const base = import.meta.env.BASE_URL || "/";
  const basePrefix = base.endsWith("/") ? base.slice(0, -1) : base;
  if (url.startsWith("http") || url.startsWith("https")) {
    candidates.add(url);
  } else if (url.startsWith("/")) {
    candidates.add(`${window.location.origin}${url}`);
    candidates.add(`${basePrefix}${url}`);
    candidates.add(url);
  } else {
    try {
      candidates.add(new URL(url, window.location.href).toString());
    } catch {
      // no-op
    }
    candidates.add(`${base}${url}`);
    candidates.add(url);
  }
  return Array.from(candidates);
}

async function fetchJson<T>(url: string): Promise<T> {
  const candidates = buildUrlCandidates(url);
  let lastError: Error | null = null;

  for (const candidate of candidates) {
    try {
      const res = await fetch(candidate, { cache: "no-store" });
      if (!res.ok) {
        lastError = new Error(`Failed to fetch ${candidate}: ${res.status}`);
        continue;
      }
      const text = await res.text();
      const trimmed = text.trim();
      if (trimmed.startsWith("<")) {
        lastError = new Error(`Received HTML instead of JSON from ${candidate}`);
        continue;
      }
      return JSON.parse(text) as T;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw new Error(lastError ? lastError.message : `Failed to fetch ${url}`);
}

function getBandIndex(feature: Feature): number {
  const props = (feature as KdeBandsFeature).properties;
  const raw = props?.band_index ?? props?.bin;
  return Number(raw);
}

function sortBands(features: Feature[]): Feature[] {
  return [...features].sort((a, b) => {
    const ai = getBandIndex(a);
    const bi = getBandIndex(b);
    if (Number.isNaN(ai) && Number.isNaN(bi)) return 0;
    if (Number.isNaN(ai)) return 1;
    if (Number.isNaN(bi)) return -1;
    return ai - bi;
  });
}

export function buildKdeBandsCacheKey(params: {
  runId: string;
  resolution: string;
  year: number;
  statWeek: number;
  areaMinKm2: number;
  holeMinKm2: number | null;
  folder?: string;
}): string {
  return [
    params.runId,
    params.folder ?? "forecast_geojson/kde_bands",
    params.resolution,
    params.year,
    params.statWeek,
    "kde_geojson",
    `area:${params.areaMinKm2}`,
    `hole:${params.holeMinKm2 ?? "none"}`,
  ].join("|");
}

export async function loadKdeBandsGeojson(
  path: string,
  cacheKey: string
): Promise<FeatureCollection> {
  const cached = kdeBandsCache.get(cacheKey);
  if (cached) return cached;
  const data = await fetchJson<FeatureCollection>(path);
  const sorted: FeatureCollection = {
    ...data,
    features: Array.isArray(data.features) ? sortBands(data.features) : [],
  };
  kdeBandsCache.set(cacheKey, sorted);
  return sorted;
}
