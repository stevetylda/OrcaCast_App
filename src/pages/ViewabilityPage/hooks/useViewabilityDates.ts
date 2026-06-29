import { useEffect, useState } from "react";
import { loadViewabilityDates } from "../../../data/viewabilityIO";

export function useViewabilityDates() {
  const [selectedDateOrPeriod, setSelectedDateOrPeriod] = useState("2026-05-04");
  const [availableDates, setAvailableDates] = useState<string[]>(["2026-05-04"]);

  useEffect(() => {
    let cancelled = false;
    loadViewabilityDates()
      .then((dates) => {
        if (cancelled) return;
        setAvailableDates(dates);
        setSelectedDateOrPeriod((current) => (dates.includes(current) ? current : dates.at(-1) ?? current));
      })
      .catch(() => {
        if (!cancelled) setAvailableDates(["2026-05-04"]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    selectedDateOrPeriod,
    setSelectedDateOrPeriod,
    availableDates,
  };
}
