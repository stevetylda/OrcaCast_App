export type CoverageRow = {
  source: string;
  availabilityByYear: Record<number, boolean>;
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

export const coverageRows: CoverageRow[] = [
  { source: "Acartia", availabilityByYear: availabilityFromRanges([[2019, 2026]]) },
  { source: "The Whale Museum", availabilityByYear: availabilityFromRanges([[1980, 2024]]) },
  { source: "iNaturalist", availabilityByYear: availabilityFromRanges([[2005, 2026]]) },
  { source: "SST + anomalies", availabilityByYear: availabilityFromRanges([]) },
  { source: "Chlorophyll proxy", availabilityByYear: availabilityFromRanges([]) },
  { source: "Salinity", availabilityByYear: availabilityFromRanges([]) },
  { source: "Currents (surface)", availabilityByYear: availabilityFromRanges([]) },
  { source: "Upwelling / wind stress", availabilityByYear: availabilityFromRanges([]) },
  { source: "Marine heatwave indicators", availabilityByYear: availabilityFromRanges([]) },
  { source: "Surface weather", availabilityByYear: availabilityFromRanges([]) },
  { source: "Tides", availabilityByYear: availabilityFromRanges([]) },
  { source: "Chinook run timing proxies", availabilityByYear: availabilityFromRanges([]) },
  { source: "Catch cards / creel signals", availabilityByYear: availabilityFromRanges([]) },
  { source: "River discharge proxies", availabilityByYear: availabilityFromRanges([]) },
  { source: "Fishery Calendar", availabilityByYear: availabilityFromRanges([]) },
  { source: "AIS", availabilityByYear: availabilityFromRanges([[2021, 2024]]) },
  { source: "Population", availabilityByYear: availabilityFromRanges([]) },
  { source: "Points of Interest", availabilityByYear: availabilityFromRanges([]) },
  { source: "Google Trends", availabilityByYear: availabilityFromRanges([]) },
];
