import type { FeatureCollection } from "geojson";
import { GRID_PATH, getForecastPath } from "../config/dataPaths";
import type { H3Resolution } from "../config/dataPaths";
import { fetchJson } from "./fetchClient";
import { getDataVersionToken } from "./meta";
import { forecastPayloadSchema, parseWithSchema } from "./validation";

type ForecastPayload = {
  target_start?: string;
  target_end?: string;
  values: Record<string, number>;
};

const gridCache = new Map<H3Resolution, FeatureCollection>();
const forecastCache = new Map<string, ForecastPayload>();
const forecastRawCache = new Map<string, ForecastPayloadRaw>();

export async function loadGrid(resolution: H3Resolution): Promise<FeatureCollection> {
  const cached = gridCache.get(resolution);
  if (cached) return structuredClone(cached);
  const url = GRID_PATH[resolution];
  const { data } = await fetchJson<FeatureCollection>(url, {
    cache: "force-cache",
    cacheToken: getDataVersionToken(),
  });
  gridCache.set(resolution, data);
  return structuredClone(data);
}

type ForecastPayloadRaw = {
  target_start?: string;
  target_end?: string;
  values?: Record<string, number>;
  model?: string;
  models?: Array<{ id?: string; model?: string; values: Record<string, number> }>;
  valuesByModel?: Record<string, Record<string, number>>;
};

async function loadForecastRaw(url: string): Promise<ForecastPayloadRaw> {
  const cached = forecastRawCache.get(url);
  if (cached) return cached;
  const raw = parseWithSchema(
    forecastPayloadSchema,
    (await fetchJson<unknown>(url, { cache: "force-cache", cacheToken: getDataVersionToken() })).data,
    url,
    "Forecast payload"
  );
  forecastRawCache.set(url, raw);
  return raw;
}

type ModelValuesEntry = {
  id?: string;
  values: Record<string, number>;
};

function collectModelEntries(raw: ForecastPayloadRaw): ModelValuesEntry[] {
  if (raw.models && raw.models.length > 0) {
    return raw.models.map((entry) => ({
      id: entry.id ?? entry.model,
      values: entry.values ?? {},
    }));
  }
  if (raw.valuesByModel) {
    return Object.entries(raw.valuesByModel).map(([id, values]) => ({
      id,
      values: values ?? {},
    }));
  }
  return [];
}

function buildConsensusMean(entries: ModelValuesEntry[]): Record<string, number> {
  const modelCount = entries.length;
  if (modelCount === 0) return {};
  const keys = new Set<string>();
  entries.forEach((entry) => {
    Object.keys(entry.values ?? {}).forEach((key) => keys.add(key));
  });
  const result: Record<string, number> = {};
  keys.forEach((key) => {
    let sum = 0;
    for (const entry of entries) {
      const value = Number(entry.values?.[key] ?? 0);
      if (Number.isFinite(value)) sum += value;
    }
    result[key] = sum / modelCount;
  });
  return result;
}

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
  const raw = await loadForecastRaw(url);
  const values =
    opts.modelId === "consensus"
      ? buildConsensusMean(collectModelEntries(raw))
      : resolveModelValues(raw, opts.modelId);
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
  const raw = await loadForecastRaw(url);
  let ids: string[] = [];
  let modelCount = 0;
  if (raw.models && raw.models.length > 0) {
    ids = raw.models
      .map((entry) => entry.id ?? entry.model)
      .filter((id): id is string => typeof id === "string" && id.length > 0);
    modelCount = raw.models.length;
  } else if (raw.valuesByModel) {
    ids = Object.keys(raw.valuesByModel);
    modelCount = ids.length;
  } else if (raw.model) {
    ids = [raw.model];
    modelCount = 1;
  }
  if (modelCount > 1) ids.push("consensus");
  return Array.from(new Set(ids));
}

export function attachProbabilities(
  fc: FeatureCollection,
  values: Record<string, number>,
  key = "h3",
  outKey = "prob"
): FeatureCollection {
  return {
    ...fc,
    features: (fc.features ?? []).map((feature) => {
      const props = { ...((feature.properties ?? {}) as Record<string, unknown>) };
      const id = String(props[key] ?? "");
      const raw = values[id];
      const prob = Number.isFinite(raw) ? Number(raw) : 0;
      props[outKey] = prob;
      return {
        ...feature,
        properties: props,
      };
    }),
  };
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
