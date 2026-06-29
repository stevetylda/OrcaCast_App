import type { MutableRefObject } from "react";

type PoiItem = { type: string; name: string; latitude: number; longitude: number };

export async function loadPoiData(
  loadedRef: MutableRefObject<boolean>,
  dataRef: MutableRefObject<PoiItem[] | null>
) {
  if (loadedRef.current && dataRef.current) return dataRef.current;
  const base = import.meta.env.BASE_URL || "/";
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  const candidates = Array.from(new Set([
    `${normalizedBase}data/places_of_interest.json`,
    "/data/places_of_interest.json",
    "data/places_of_interest.json",
  ]));
  let lastError: Error | null = null;

  for (const url of candidates) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        lastError = new Error(`Failed to load POI data from ${url}: ${response.status}`);
        continue;
      }
      const payload = (await response.json()) as
        | { items?: PoiItem[] }
        | PoiItem[]
        | { features?: Array<{ properties?: Record<string, unknown>; geometry?: { coordinates?: [number, number] } }> };

      const items = Array.isArray(payload)
        ? payload.map((entry) => ({
            type: String((entry as { type?: string }).type ?? ""),
            name: String((entry as { name?: string }).name ?? "POI"),
            latitude: Number((entry as { latitude?: number }).latitude),
            longitude: Number((entry as { longitude?: number }).longitude),
          }))
        : "items" in payload && Array.isArray(payload.items)
          ? payload.items.map((entry) => ({
              type: String(entry.type ?? ""),
              name: String(entry.name ?? "POI"),
              latitude: Number(entry.latitude),
              longitude: Number(entry.longitude),
            }))
          : "features" in payload && Array.isArray(payload.features)
            ? payload.features.map((feature) => {
                const props = feature.properties ?? {};
                const coordinates = feature.geometry?.coordinates ?? [Number.NaN, Number.NaN];
                return {
                  type: String(props.type ?? props.category ?? ""),
                  name: String(props.name ?? "POI"),
                  latitude: Number(coordinates[1]),
                  longitude: Number(coordinates[0]),
                };
              })
            : [];

      loadedRef.current = true;
      dataRef.current = items;
      return items;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError ?? new Error("Failed to load POI data");
}
