export type CoverageRow = {
  sourceType: string;
  source: string;
  description: string;
  availabilityByYear: Record<number, boolean>;
};

export type CoverageRangeRow = {
  sourceType: string;
  source: string;
  description: string;
  availabilityRanges: Array<[number, number]>;
};

export type StaticCoverageRow = {
  sourceType: string;
  source: string;
  description: string;
  available: boolean;
};

export const coverageYears = [
  ...Array.from({ length: 2026 - 1980 + 1 }, (_, index) => 1980 + index),
] as const;

function availabilityFromRanges(ranges: Array<[number, number]>): Record<number, boolean> {
  const map: Record<number, boolean> = {};
  coverageYears.forEach((year) => {
    map[year] = ranges.some(([start, end]) => year >= start && year <= end);
  });
  return map;
}

export const defaultCoverageRangeRows: CoverageRangeRow[] = [
  { sourceType: "Sightings", source: "Acartia", description: "Partner observation records collected from field reports and curated sightings submissions in the Pacific Northwest.", availabilityRanges: [[2019, 2026]] },
  { sourceType: "Sightings", source: "The Whale Museum", description: "Community and stewardship sightings compiled from museum-led reporting programs across the Salish Sea.", availabilityRanges: [[1980, 2024]] },
  { sourceType: "Sightings", source: "iNaturalist", description: "Public biodiversity observations collected through the iNaturalist platform and filtered for relevant whale reports.", availabilityRanges: [[2005, 2026]] },
  { sourceType: "Ocean State", source: "SST + anomalies", description: "Notional ocean temperature fields and anomaly layers collected from regional satellite and modeled sea-surface products.", availabilityRanges: [] },
  { sourceType: "Ocean State", source: "Chlorophyll proxy", description: "Notional chlorophyll concentration surfaces collected from ocean color products as a productivity proxy.", availabilityRanges: [] },
  { sourceType: "Ocean State", source: "Salinity", description: "Notional salinity estimates collected from regional ocean circulation and assimilation products.", availabilityRanges: [] },
  { sourceType: "Ocean State", source: "Currents (surface)", description: "Notional surface current fields collected from ocean circulation nowcasts and forecast models.", availabilityRanges: [] },
  { sourceType: "Ocean State", source: "Upwelling / wind stress", description: "Notional coastal wind stress and upwelling indicators collected from atmospheric and ocean forcing datasets.", availabilityRanges: [] },
  { sourceType: "Ocean State", source: "Marine heatwave indicators", description: "Notional marine heatwave metrics collected from long-baseline sea-surface temperature analyses.", availabilityRanges: [] },
  { sourceType: "Ocean State", source: "Surface weather", description: "Notional marine weather variables collected from operational weather analyses and coastal station products.", availabilityRanges: [] },
  { sourceType: "Ocean State", source: "Tides", description: "Notional tidal phase and range indicators collected from regional tide prediction and gauge products.", availabilityRanges: [] },
  { sourceType: "Prey Availability", source: "Chinook run timing proxies", description: "Notional run-timing indicators collected from salmon monitoring and seasonal migration summaries.", availabilityRanges: [] },
  { sourceType: "Prey Availability", source: "Catch cards / creel signals", description: "Notional recreational and harvest effort signals collected from fishery catch-card and creel reporting programs.", availabilityRanges: [] },
  { sourceType: "Prey Availability", source: "River discharge proxies", description: "Notional river flow proxies collected from hydrologic gauges to approximate salmon movement conditions.", availabilityRanges: [] },
  { sourceType: "Prey Availability", source: "Fishery Calendar", description: "Notional seasonal fishery timing information collected from management calendars and open-season notices.", availabilityRanges: [] },
  { sourceType: "Human Activity", source: "AIS", description: "Notional vessel activity tracks collected from Automatic Identification System broadcasts and aggregated into traffic indicators.", availabilityRanges: [[2021, 2024]] },
  { sourceType: "Human Activity", source: "Population", description: "Notional coastal population context collected from census-style demographic summaries and settlement inventories.", availabilityRanges: [] },
  { sourceType: "Human Activity", source: "Points of Interest", description: "Notional coastal access and attraction data collected from mapped places that may influence visitation and reporting effort.", availabilityRanges: [] },
  { sourceType: "Human Activity", source: "Google Trends", description: "Notional search-interest signals collected from public trends summaries as a proxy for attention and intent.", availabilityRanges: [] },
];

export const defaultStaticCoverageRows: StaticCoverageRow[] = [
  { sourceType: "Water", source: "Coastline boundaries", description: "Regional shoreline and coastline boundaries collected from reference geospatial layers to define the marine domain edge.", available: true },
  { sourceType: "Water", source: "Hydro polygons", description: "Hydrographic polygon layers collected from reference waterbody datasets to refine valid forecast water areas.", available: true },
  { sourceType: "Bathymetry", source: "GEBCO 10M", description: "Global bathymetry grid collected from GEBCO reference products to provide persistent seafloor context.", available: false },
];

export function buildCoverageRows(rows: CoverageRangeRow[]): CoverageRow[] {
  return rows.map((row) => ({
    sourceType: row.sourceType,
    source: row.source,
    description: row.description,
    availabilityByYear: availabilityFromRanges(row.availabilityRanges),
  }));
}

export const coverageRows: CoverageRow[] = buildCoverageRows(defaultCoverageRangeRows);
export const staticCoverageRows: StaticCoverageRow[] = defaultStaticCoverageRows;
