export function isoWeekFromDate(date: Date): number {
  const temp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = temp.getUTCDay() || 7;
  temp.setUTCDate(temp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(temp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((temp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return weekNo;
}

export function forecastPeriodToIsoWeek(period: {
  mode: "single" | "range";
  date?: string;
  start?: string;
  end?: string;
}): number {
  const dateStr = period.mode === "single" ? period.date : period.start;
  if (!dateStr) return isoWeekFromDate(new Date());
  return isoWeekFromDate(new Date(dateStr));
}
