import type { H3Resolution } from "../config/dataPaths";

export type ExpectedCountPoint = {
  year: number;
  stat_week: number;
  expected_count: number;
  lower_ci?: number;
  upper_ci?: number;
  typical_error?: number;
};

type ExpectedCountPayload = {
  rows?: Array<{
    year?: number;
    stat_week?: number;
    period?: number;
    expected_count?: number;
    lower_ci?: number;
    upper_ci?: number;
    typical_error?: number;
  }>;
};

export type ActualActivityPoint = {
  year: number;
  stat_week: number;
  actual_count: number;
};

type ActualActivityPayload = {
  rows?: Array<{
    year?: number;
    stat_week?: number;
    period?: number;
    actual_count?: number;
  }>;
};

const cache = new Map<H3Resolution, ExpectedCountPoint[]>();
const actualCache = new Map<H3Resolution, ActualActivityPoint[]>();

function withBase(path: string): string {
  const base = import.meta.env.BASE_URL || "/";
  const trimmed = path.startsWith("/") ? path.slice(1) : path;
  return `${base}${trimmed}`;
}

function buildUrlCandidates(url: string): string[] {
  const candidates = new Set<string>();
  const base = import.meta.env.BASE_URL || "/";
  const basePrefix = base.endsWith("/") ? base.slice(0, -1) : base;
  if (url.startsWith("http://") || url.startsWith("https://")) {
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

export async function loadExpectedCountSeries(
  resolution: H3Resolution
): Promise<ExpectedCountPoint[]> {
  const cached = cache.get(resolution);
  if (cached) return cached;

  const preferredUrl = withBase(`data/expected_count/${resolution}_EXPECTED_ACTIVITY.json`);
  const fallbackUrl = withBase(`data/expected_count/${resolution}.json`);

  let payload: ExpectedCountPayload;
  try {
    payload = await fetchJson<ExpectedCountPayload>(preferredUrl);
  } catch {
    payload = await fetchJson<ExpectedCountPayload>(fallbackUrl);
  }

  const rows = Array.isArray(payload.rows) ? payload.rows : [];

  const parsed = rows
    .map((row) => {
      const year = Number(row.year);
      const statWeek = Number(row.stat_week ?? row.period);
      const expectedCount = Number(row.expected_count);
      if (!Number.isFinite(year) || !Number.isFinite(statWeek) || !Number.isFinite(expectedCount)) {
        return null;
      }
      const point: ExpectedCountPoint = {
        year,
        stat_week: statWeek,
        expected_count: expectedCount,
      };
      const lowerCi = Number(row.lower_ci);
      if (Number.isFinite(lowerCi)) point.lower_ci = lowerCi;
      const upperCi = Number(row.upper_ci);
      if (Number.isFinite(upperCi)) point.upper_ci = upperCi;
      const typicalError = Number(row.typical_error);
      if (Number.isFinite(typicalError)) point.typical_error = typicalError;
      return point;
    })
    .filter((row): row is ExpectedCountPoint => row !== null)
    .sort((a, b) => (a.year - b.year) || (a.stat_week - b.stat_week));

  cache.set(resolution, parsed);
  return parsed;
}

export async function loadActualActivitySeries(
  resolution: H3Resolution
): Promise<ActualActivityPoint[]> {
  const cached = actualCache.get(resolution);
  if (cached) return cached;

  const preferredUrl = withBase(`data/expected_count/${resolution}_ACTUAL_ACTIVITY.json`);
  const fallbackUrl = withBase(`data/expected_count/${resolution}_ACTUAL.json`);

  let payload: ActualActivityPayload;
  try {
    payload = await fetchJson<ActualActivityPayload>(preferredUrl);
  } catch {
    payload = await fetchJson<ActualActivityPayload>(fallbackUrl);
  }

  const rows = Array.isArray(payload.rows) ? payload.rows : [];
  const parsed = rows
    .map((row) => {
      const year = Number(row.year);
      const statWeek = Number(row.stat_week ?? row.period);
      const actualCount = Number(row.actual_count);
      if (!Number.isFinite(year) || !Number.isFinite(statWeek) || !Number.isFinite(actualCount)) {
        return null;
      }
      return {
        year,
        stat_week: statWeek,
        actual_count: actualCount,
      };
    })
    .filter((row): row is ActualActivityPoint => row !== null)
    .sort((a, b) => (a.year - b.year) || (a.stat_week - b.stat_week));

  actualCache.set(resolution, parsed);
  return parsed;
}
