import type { FeatureCollection } from "geojson";
import { GRID_PATH, getForecastPath } from "../config/dataPaths";
import type { H3Resolution } from "../config/dataPaths";

type ForecastPayload = {
  target_start?: string;
  target_end?: string;
  values: Record<string, number>;
};

const gridCache = new Map<H3Resolution, FeatureCollection>();
const forecastCache = new Map<string, ForecastPayload>();

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
      const res = await fetch(candidate, { cache: "force-cache" });
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

export async function loadGrid(resolution: H3Resolution): Promise<FeatureCollection> {
  const cached = gridCache.get(resolution);
  if (cached) return cached;
  const url = GRID_PATH[resolution];
  const data = await fetchJson<FeatureCollection>(url);
  gridCache.set(resolution, data);
  return data;
}

type ForecastPayloadRaw = {
  target_start?: string;
  target_end?: string;
  values?: Record<string, number>;
  model?: string;
  models?: Array<{ id?: string; model?: string; values: Record<string, number> }>;
  valuesByModel?: Record<string, Record<string, number>>;
};

function resolveModelValues(raw: ForecastPayloadRaw, modelId?: string) {
  if (raw.models && raw.models.length > 0) {
    if (modelId) {
      const match = raw.models.find((entry) => entry.id === modelId || entry.model === modelId);
      if (match) return match.values;
    }
    return raw.models[0].values;
  }
  if (raw.valuesByModel) {
    if (modelId && raw.valuesByModel[modelId]) return raw.valuesByModel[modelId];
    const firstKey = Object.keys(raw.valuesByModel)[0];
    if (firstKey) return raw.valuesByModel[firstKey];
  }
  return raw.values ?? {};
}

export async function loadForecast(
  resolution: H3Resolution,
  opts: { kind?: "latest" | "explicit"; explicitPath?: string; modelId?: string } = {}
): Promise<ForecastPayload> {
  const url = getForecastPath(resolution, opts);
  const cacheKey = `${resolution}|${url}|${opts.modelId ?? ""}`;
  const cached = forecastCache.get(cacheKey);
  if (cached) return cached;
  const raw = await fetchJson<ForecastPayloadRaw>(url);
  const values = resolveModelValues(raw, opts.modelId);
  const data: ForecastPayload = {
    target_start: raw.target_start,
    target_end: raw.target_end,
    values,
  };
  forecastCache.set(cacheKey, data);
  return data;
}

export async function loadForecastModelIds(
  resolution: H3Resolution,
  opts: { kind?: "latest" | "explicit"; explicitPath?: string } = {}
): Promise<string[]> {
  const url = getForecastPath(resolution, opts);
  const raw = await fetchJson<ForecastPayloadRaw>(url);
  if (raw.models && raw.models.length > 0) {
    return raw.models
      .map((entry) => entry.id ?? entry.model)
      .filter((id): id is string => typeof id === "string" && id.length > 0);
  }
  if (raw.valuesByModel) return Object.keys(raw.valuesByModel);
  if (raw.model) return [raw.model];
  return [];
}

export function attachProbabilities(
  fc: FeatureCollection,
  values: Record<string, number>,
  key = "h3",
  outKey = "prob"
): FeatureCollection {
  for (const feature of fc.features) {
    const props = (feature.properties ??= {} as Record<string, unknown>);
    const id = String((props as Record<string, unknown>)[key] ?? "");
    const raw = values[id];
    const prob = Number.isFinite(raw) ? Number(raw) : 0;
    (props as Record<string, unknown>)[outKey] = prob;
  }
  return fc;
}

export function countNonZero(fc: FeatureCollection, key = "prob"): number {
  let count = 0;
  for (const feature of fc.features) {
    const props = feature.properties as Record<string, unknown> | null;
    const value = props ? Number(props[key]) : 0;
    if (value > 0) count += 1;
  }
  return count;
}
