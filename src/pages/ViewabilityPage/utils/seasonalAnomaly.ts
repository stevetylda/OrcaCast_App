export function dayOfYear(dateString: string): number {
  const date = new Date(`${dateString}T00:00:00Z`);
  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.floor((date.getTime() - start.getTime()) / 86_400_000) + 1;
}

export function mean(values: number[]): number {
  return values.length === 0
    ? 0
    : values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function buildSeasonalMeanByDoy<T>(
  points: T[],
  getDate: (point: T) => string | null | undefined,
  getValue: (point: T) => number | null | undefined,
): Map<number, number> {
  const valuesByDoy = new Map<number, number[]>();

  for (const point of points) {
    const date = getDate(point);
    const value = getValue(point);

    if (!date || !Number.isFinite(value)) continue;

    const doy = dayOfYear(date);
    const values = valuesByDoy.get(doy) ?? [];
    values.push(value as number);
    valuesByDoy.set(doy, values);
  }

  return new Map(
    Array.from(valuesByDoy.entries()).map(([doy, values]) => [doy, mean(values)]),
  );
}
