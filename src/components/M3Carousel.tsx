import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";

type Props = {
  title?: string;
  hint?: string;
  children: React.ReactNode;
  activeWidth?: number;
  itemWidth?: number;
  peek?: number;
  showDots?: boolean;
  showArrows?: boolean;

  // NEW
  initialIndex?: number;
  centerOnMount?: boolean;
  onActiveIndexChange?: (index: number) => void;
};

export function M3Carousel({
  title,
  hint,
  children,
  activeWidth = 360,
  itemWidth = 300,
  peek = 72,
  showDots = false,
  showArrows = true,

  // NEW
  initialIndex = 0,
  centerOnMount = false,
  onActiveIndexChange,
}: Props) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const items = useMemo(() => React.Children.toArray(children), [children]);
  const count = items.length;

  const clampIndex = useCallback(
    (idx: number) => Math.max(0, Math.min(count - 1, idx)),
    [count]
  );

  const [active, setActive] = useState(() => clampIndex(initialIndex));
  const activeRef = useRef(active);

  // While the user is scrolling/dragging, we avoid changing activeWidth states
  const isUserScrollingRef = useRef(false);
  const scrollSettleTimerRef = useRef<number | null>(null);

  // Expose active index changes outward
  useEffect(() => {
    activeRef.current = active;
    onActiveIndexChange?.(active);
  }, [active, onActiveIndexChange]);

  // Keep active in range when items change
  useEffect(() => {
    setActive((prev) => clampIndex(prev));
  }, [clampIndex, count]);

  const getCards = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return [] as HTMLElement[];
    return Array.from(scroller.querySelectorAll<HTMLElement>("[data-carousel-item='true']"));
  }, []);

  const computeCenterIndex = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return activeRef.current;

    const cards = getCards();
    if (cards.length === 0) return activeRef.current;

    const centerX = scroller.scrollLeft + scroller.clientWidth / 2;

    let bestIdx = activeRef.current;
    let bestDist = Infinity;

    for (const el of cards) {
      const idx = Number(el.dataset.index ?? -1);
      if (!Number.isFinite(idx) || idx < 0) continue;

      const elCenter = el.offsetLeft + el.clientWidth / 2;
      const dist = Math.abs(elCenter - centerX);

      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = idx;
      }
    }

    return clampIndex(bestIdx);
  }, [clampIndex, getCards]);

  const scrollToIndex = useCallback(
    (idx: number, behavior: ScrollBehavior = "smooth") => {
      const scroller = scrollerRef.current;
      if (!scroller) return;

      const cards = getCards();
      const targetIdx = clampIndex(idx);
      const el = cards[targetIdx];
      if (!el) return;

      const targetLeft = el.offsetLeft - (scroller.clientWidth - el.clientWidth) / 2;
      scroller.scrollTo({ left: Math.max(0, targetLeft), behavior });
    },
    [clampIndex, getCards]
  );

  const prev = useCallback(() => scrollToIndex(activeRef.current - 1), [scrollToIndex]);
  const next = useCallback(() => scrollToIndex(activeRef.current + 1), [scrollToIndex]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      } else if (e.key === "Home") {
        e.preventDefault();
        scrollToIndex(0);
      } else if (e.key === "End") {
        e.preventDefault();
        scrollToIndex(count - 1);
      }
    },
    [count, next, prev, scrollToIndex]
  );

  // Scroll listener: mark "scrolling", then settle active after a short pause.
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    let raf = 0;

    const settle = () => {
      isUserScrollingRef.current = false;
      const idx = computeCenterIndex();
      if (idx !== activeRef.current) setActive(idx);
      // force a re-render so activeWidth can re-apply cleanly
      // (handled by state change or by the isScrolling state below)
    };

    const onScroll = () => {
      isUserScrollingRef.current = true;

      // Debounce settle
      if (scrollSettleTimerRef.current) {
        window.clearTimeout(scrollSettleTimerRef.current);
      }

      scrollSettleTimerRef.current = window.setTimeout(() => {
        // Use rAF to wait for the last scroll paint
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(settle);
      }, 120);

      // Optional: if you *want* active to roughly follow during scroll,
      // do it at low frequency without triggering width changes.
      // We'll keep it OFF to avoid flicker.
    };

    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      if (scrollSettleTimerRef.current) window.clearTimeout(scrollSettleTimerRef.current);
      cancelAnimationFrame(raf);
    };
  }, [computeCenterIndex]);

  // Center on mount / when initialIndex changes
  useEffect(() => {
    if (!centerOnMount) return;
    if (count === 0) return;

    const idx = clampIndex(initialIndex);
    const id = requestAnimationFrame(() => {
      scrollToIndex(idx, "auto");
      setActive(idx);
    });
    return () => cancelAnimationFrame(id);
  }, [centerOnMount, clampIndex, count, initialIndex, scrollToIndex]);

  // 🔥 Key anti-flicker trick:
  // When user is scrolling, we do NOT apply activeWidth.
  // We keep all items at itemWidth to avoid layout oscillations.
  const useActiveWidth = !isUserScrollingRef.current;

  return (
    <div className="m3cWrap">
      {(title || hint) && (
        <div className="m3cHeader">
          {title ? <div className="m3cTitle">{title}</div> : <span />}
          {hint ? <div className="m3cHint">{hint}</div> : null}
        </div>
      )}

      <div
        className="m3cStage"
        style={
          {
            "--m3-item-w": `${itemWidth}px`,
            "--m3-item-w-active": `${useActiveWidth ? activeWidth : itemWidth}px`,
            "--m3-peek": `${peek}px`,
          } as React.CSSProperties
        }
      >
        {showArrows && (
          <button
            type="button"
            className="m3cNavBtn m3cNavBtn--left"
            onClick={prev}
            disabled={active <= 0}
            aria-label="Previous"
          >
            <span className="material-symbols-rounded" aria-hidden="true">
              chevron_left
            </span>
          </button>
        )}

        <div
          className="m3cScroller"
          ref={scrollerRef}
          tabIndex={0}
          onKeyDown={onKeyDown}
          aria-label="Models carousel"
        >
          {items.map((child, i) => (
            <div
              key={i}
              className={`m3cItem ${i === active ? "isActive" : ""}`}
              data-carousel-item="true"
              data-index={i}
              aria-label={`Item ${i + 1} of ${count}`}
            >
              {child}
            </div>
          ))}
        </div>

        {showArrows && (
          <button
            type="button"
            className="m3cNavBtn m3cNavBtn--right"
            onClick={next}
            disabled={active >= count - 1}
            aria-label="Next"
          >
            <span className="material-symbols-rounded" aria-hidden="true">
              chevron_right
            </span>
          </button>
        )}
      </div>

      {showDots && count > 1 && (
        <div className="m3cDots" aria-label="Carousel navigation">
          {Array.from({ length: count }).map((_, i) => (
            <button
              key={i}
              type="button"
              className={`m3cDot ${i === active ? "isActive" : ""}`}
              onClick={() => scrollToIndex(i)}
              aria-label={`Go to item ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
