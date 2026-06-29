import { useEffect, useState } from "react";
import type { ViewabilityScoreType, ViewabilitySourceFeatureCollection, ViewabilityTargetFeatureCollection } from "../../../data/viewabilityTypes";
import { loadViewabilitySourceCells, loadViewabilityTargetCells } from "../../../data/viewabilityIO";

export const EMPTY_SOURCE_CELLS: ViewabilitySourceFeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

export function useViewabilityCells(args: {
  selectedDateOrPeriod: string;
  scoreType: ViewabilityScoreType;
  needsSourceCells: boolean;
  onError: (message: string) => void;
}) {
  const { selectedDateOrPeriod, scoreType, needsSourceCells, onError } = args;
  const [targetCells, setTargetCells] = useState<ViewabilityTargetFeatureCollection | null>(null);
  const [sourceCells, setSourceCells] = useState<ViewabilitySourceFeatureCollection | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      loadViewabilityTargetCells(selectedDateOrPeriod, scoreType),
      needsSourceCells
        ? loadViewabilitySourceCells(selectedDateOrPeriod, scoreType)
        : Promise.resolve(EMPTY_SOURCE_CELLS),
    ])
      .then(([targets, sources]) => {
        if (cancelled) return;
        setTargetCells(targets);
        setSourceCells(sources);
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        onError(reason instanceof Error ? reason.message : "Viewability data failed to load.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [needsSourceCells, onError, scoreType, selectedDateOrPeriod]);

  return {
    targetCells,
    sourceCells: needsSourceCells ? sourceCells : EMPTY_SOURCE_CELLS,
    loading,
  };
}
