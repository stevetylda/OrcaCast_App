import type { Dispatch, RefObject, SetStateAction } from "react";
import type { AnalysisTabId } from "../analysisRegistry";

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

type NavigateArgs = {
  tabId: AnalysisTabId;
  itemId: string;
  setActiveTab: (tabId: AnalysisTabId) => void;
  setSelectedByTab: Dispatch<SetStateAction<Record<string, string | null>>>;
  setRailOpen: (isOpen: boolean) => void;
  detailRef: RefObject<HTMLElement>;
  onPulse?: (itemId: string) => void;
};

export const navigateToAnalysis = ({
  tabId,
  itemId,
  setActiveTab,
  setSelectedByTab,
  setRailOpen,
  detailRef,
  onPulse,
}: NavigateArgs) => {
  setActiveTab(tabId);
  setSelectedByTab((prev) => ({ ...prev, [tabId]: itemId }));
  setRailOpen(false);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const node = detailRef.current;
      if (node) {
        node.scrollIntoView({
          behavior: prefersReducedMotion() ? "auto" : "smooth",
          block: "start",
        });
      }
      if (onPulse) {
        onPulse(itemId);
      }
    });
  });
};
