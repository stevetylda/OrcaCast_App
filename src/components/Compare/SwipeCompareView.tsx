import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

type Props = {
  splitPct: number;
  onSplitCommit?: (pct: number) => void;
  childrenA: ReactNode;
  childrenB: ReactNode;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function SwipeCompareView({ splitPct, onSplitCommit, childrenA, childrenB }: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const dragPctRef = useRef(splitPct);

  useEffect(() => {
    dragPctRef.current = splitPct;
    if (!rootRef.current) return;
    rootRef.current.style.setProperty("--split-pct", `${splitPct}%`);
  }, [splitPct]);

  const onDividerPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const root = rootRef.current;
    if (!root) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);

    const updateSplit = (clientX: number) => {
      const rect = root.getBoundingClientRect();
      if (rect.width <= 0) return;
      const nextPct = clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
      dragPctRef.current = nextPct;
      root.style.setProperty("--split-pct", `${nextPct}%`);
    };

    updateSplit(event.clientX);

    const onMove = (moveEvent: PointerEvent) => {
      updateSplit(moveEvent.clientX);
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      onSplitCommit?.(dragPctRef.current);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
  };

  return (
    <div className="splitCompareView" ref={rootRef}>
      <div className="splitCompareView__panel splitCompareView__panel--a">{childrenA}</div>
      <div className="splitCompareView__panel splitCompareView__panel--b">{childrenB}</div>
      <div
        className="splitCompareView__divider"
        onPointerDown={onDividerPointerDown}
        role="separator"
        aria-orientation="vertical"
      >
        <span className="splitCompareView__handle" aria-hidden="true" />
      </div>
    </div>
  );
}
