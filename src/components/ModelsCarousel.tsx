import React, { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  title?: string;
  hint?: string;
  children: React.ReactNode;
  itemWidth?: number; // px
  peek?: number; // px
};

export function ModelsCarousel({
  title,
  hint,
  children,
  itemWidth = 320,
  peek = 72,
}: Props) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastOffsetRef = useRef(0);
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);

  const items = useMemo(() => React.Children.toArray(children), [children]);
  const count = items.length;

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const cards = Array.from(scroller.querySelectorAll<HTMLElement>("[data-carousel-item='true']"));
    if (!cards.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        let bestIdx = activeRef.current;
        let bestRatio = 0;

        for (const e of entries) {
          const idx = Number((e.target as HTMLElement).dataset.index ?? -1);
          if (e.isIntersecting && e.intersectionRatio > bestRatio) {
            bestRatio = e.intersectionRatio;
            bestIdx = idx;
          }
        }
        if (bestRatio > 0 && bestIdx !== activeRef.current) {
          setActive(bestIdx);
        }
      },
      {
        root: scroller,
        threshold: [0.25, 0.5, 0.75, 0.9],
      }
    );

    cards.forEach((c) => io.observe(c));
    return () => io.disconnect();
  }, [count]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const onMove = (event: PointerEvent) => {
      if (!scroller) return;
      const rect = scroller.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const center = rect.width / 2;
      const offset = Math.max(-1, Math.min(1, (x - center) / center));
      lastOffsetRef.current = offset;
      if (rafRef.current !== null) return;
      rafRef.current = window.requestAnimationFrame(() => {
        scroller.style.setProperty("--mc-hover", lastOffsetRef.current.toFixed(3));
        rafRef.current = null;
      });
    };

    const onLeave = () => {
      lastOffsetRef.current = 0;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      scroller.style.setProperty("--mc-hover", "0");
    };

    scroller.addEventListener("pointermove", onMove);
    scroller.addEventListener("pointerleave", onLeave);
    return () => {
      scroller.removeEventListener("pointermove", onMove);
      scroller.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  function scrollToIndex(idx: number) {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const cards = scroller.querySelectorAll<HTMLElement>("[data-carousel-item='true']");
    const el = cards[idx];
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }

  function prev() {
    scrollToIndex(Math.max(0, activeRef.current - 1));
  }

  function next() {
    scrollToIndex(Math.min(count - 1, activeRef.current + 1));
  }

  function onKeyDown(e: React.KeyboardEvent) {
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
  }

  return (
    <div className="mcWrap">
      {(title || hint) && (
        <div className="mcHeader">
          {title ? <div className="mcTitle">{title}</div> : <span />}
          {hint ? <div className="mcHint">{hint}</div> : null}
        </div>
      )}

      <div
        className="mcStage"
        style={
          {
            "--mc-item-w": `${itemWidth}px`,
            "--mc-peek": `${peek}px`,
          } as React.CSSProperties
        }
      >
        <button
          type="button"
          className="mcNavBtn mcNavBtn--left"
          onClick={prev}
          disabled={active <= 0}
          aria-label="Previous"
        >
          <span className="material-symbols-rounded" aria-hidden="true">
            chevron_left
          </span>
        </button>

        <div
          className="mcScroller"
          ref={scrollerRef}
          tabIndex={0}
          onKeyDown={onKeyDown}
          aria-label="Models carousel"
        >
          {items.map((child, i) => (
            <div
              key={i}
              className={`mcItem ${i === active ? "isActive" : ""}`}
              data-carousel-item="true"
              data-index={i}
              aria-label={`Item ${i + 1} of ${count}`}
            >
              {child}
            </div>
          ))}
        </div>

        <button
          type="button"
          className="mcNavBtn mcNavBtn--right"
          onClick={next}
          disabled={active >= count - 1}
          aria-label="Next"
        >
          <span className="material-symbols-rounded" aria-hidden="true">
            chevron_right
          </span>
        </button>
      </div>

      {count > 1 && (
        <div className="mcDots" aria-label="Carousel navigation">
          {Array.from({ length: count }).map((_, i) => (
            <button
              key={i}
              type="button"
              className={`mcDot ${i === active ? "isActive" : ""}`}
              onClick={() => scrollToIndex(i)}
              aria-label={`Go to item ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
