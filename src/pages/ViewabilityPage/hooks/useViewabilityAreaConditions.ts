import { useEffect, useState } from "react";
import type { ViewabilityAreaConditionPoint } from "../../../data/viewabilityTypes";
import { loadViewabilityAreaConditions } from "../../../data/viewabilityIO";

export function useViewabilityAreaConditions(enabled: boolean, onError: (message: string) => void) {
  const [areaConditions, setAreaConditions] = useState<ViewabilityAreaConditionPoint[]>([]);
  const [areaConditionsLoaded, setAreaConditionsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!enabled || areaConditionsLoaded) {
      return;
    }

    loadViewabilityAreaConditions()
      .then((points) => {
        if (!cancelled) {
          setAreaConditions(points);
          setAreaConditionsLoaded(true);
        }
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setAreaConditions([]);
          onError(reason instanceof Error ? reason.message : "Area condition data failed to load.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [areaConditionsLoaded, enabled, onError]);

  return areaConditions;
}
