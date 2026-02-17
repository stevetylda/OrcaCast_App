import type { LayerSourceConfig, SourceKind } from "../config/mapLayers";

export type ResolvedLayerSource = {
  kind: SourceKind;
  url: string;
  sourceLayer?: string;
  isFallback: boolean;
};

const availabilityCache = new Map<string, boolean>();

function probeUrl(url: string): string {
  return url.replace("{z}", "0").replace("{x}", "0").replace("{y}", "0");
}

async function urlExists(url: string): Promise<boolean> {
  const target = probeUrl(url);
  if (availabilityCache.has(target)) return availabilityCache.get(target) ?? false;
  try {
    const res = await fetch(target, { method: "HEAD", cache: "no-store" });
    const ok = res.ok;
    availabilityCache.set(target, ok);
    return ok;
  } catch {
    availabilityCache.set(target, false);
    return false;
  }
}

export async function resolveLayerSource(config: LayerSourceConfig): Promise<ResolvedLayerSource> {
  const primaryExists = await urlExists(config.source_url);
  if (primaryExists) {
    return {
      kind: config.source_kind,
      url: config.source_url,
      sourceLayer: config.source_layer,
      isFallback: false,
    };
  }

  if (config.fallback_source_kind && config.fallback_source_url) {
    // eslint-disable-next-line no-console
    console.warn(`[MapData] Missing ${config.source_kind} source for ${config.id}; falling back to ${config.fallback_source_kind}.`);
    return {
      kind: config.fallback_source_kind,
      url: config.fallback_source_url,
      sourceLayer: config.fallback_source_layer,
      isFallback: true,
    };
  }

  return {
    kind: config.source_kind,
    url: config.source_url,
    sourceLayer: config.source_layer,
    isFallback: false,
  };
}

export function debounce<T extends (...args: never[]) => void>(fn: T, ms: number): T {
  let handle: number | null = null;
  return ((...args: Parameters<T>) => {
    if (handle !== null) {
      window.clearTimeout(handle);
    }
    handle = window.setTimeout(() => {
      fn(...args);
      handle = null;
    }, ms);
  }) as T;
}
