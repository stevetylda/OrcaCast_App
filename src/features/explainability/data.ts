import type {
  ExplainabilityFeature,
  ExplainabilityIndex,
  ExplainabilityMeta,
  GlobalImportanceRow,
  InteractionRankingRow,
  InteractionSampleRow,
  ShapSampleRow,
} from "./types";
import { fetchJson as fetchJsonWithClient } from "../../data/fetchClient";
import { getDataVersionToken } from "../../data/meta";

const cache = new Map<string, Promise<unknown>>();

function withBase(path: string): string {
  const base = import.meta.env.BASE_URL || "/";
  const clean = path.startsWith("/") ? path.slice(1) : path;
  return `${base}${clean}`;
}

async function fetchJson<T>(path: string): Promise<T> {
  const url = withBase(path);
  if (!cache.has(url)) {
    cache.set(
      url,
      fetchJsonClient<T>(path).catch((error) => {
          cache.delete(url);
          throw error;
        })
    );
  }
  return cache.get(url) as Promise<T>;
}

async function fetchJsonClient<T>(path: string): Promise<T> {
  const { data } = await fetchJsonWithClient<T>(path, {
    cache: "force-cache",
    cacheToken: getDataVersionToken(),
  });
  return data;
}

export function explainabilityArtifactBase(runId: string, modelId: string, target: string): string {
  return `data/explainability/${runId}/${modelId}/${target}`;
}

export async function loadExplainabilityIndex(): Promise<ExplainabilityIndex> {
  return fetchJson<ExplainabilityIndex>("data/explainability/index.json");
}

export async function loadExplainabilityMeta(
  runId: string,
  modelId: string,
  target: string
): Promise<ExplainabilityMeta> {
  return fetchJson<ExplainabilityMeta>(`${explainabilityArtifactBase(runId, modelId, target)}/meta.json`);
}

export async function loadExplainabilityFeatures(
  runId: string,
  modelId: string,
  target: string
): Promise<ExplainabilityFeature[]> {
  return fetchJson<ExplainabilityFeature[]>(`${explainabilityArtifactBase(runId, modelId, target)}/features.json`);
}

export async function loadExplainabilitySamples(
  runId: string,
  modelId: string,
  target: string
): Promise<ShapSampleRow[]> {
  return fetchJson<ShapSampleRow[]>(`${explainabilityArtifactBase(runId, modelId, target)}/shap_samples.json`);
}

export async function loadGlobalImportance(
  runId: string,
  modelId: string,
  target: string
): Promise<GlobalImportanceRow[]> {
  return fetchJson<GlobalImportanceRow[]>(`${explainabilityArtifactBase(runId, modelId, target)}/global_importance.json`);
}

export async function loadInteractionRanking(
  runId: string,
  modelId: string,
  target: string
): Promise<InteractionRankingRow[]> {
  return fetchJson<InteractionRankingRow[]>(`${explainabilityArtifactBase(runId, modelId, target)}/interaction_ranking.json`);
}

export async function loadInteractionSamples(
  runId: string,
  modelId: string,
  target: string
): Promise<InteractionSampleRow[]> {
  return fetchJson<InteractionSampleRow[]>(`${explainabilityArtifactBase(runId, modelId, target)}/interaction_samples.json`);
}
