import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import "./WhaleAmbient.css";

export type WhaleVariant = "cinematic" | "parallax" | "hero";

export type WhaleAmbientProps = {
  variant?: WhaleVariant;
  intensity?: 0 | 1 | 2;
  paused?: boolean;
  className?: string;
};

type MotionProfile = {
  waterDuration: number;
  parallaxMax: number;
};

const motionByIntensity: Record<0 | 1 | 2, MotionProfile> = {
  0: {
    waterDuration: 36,
    parallaxMax: 10,
  },
  1: {
    waterDuration: 28,
    parallaxMax: 18,
  },
  2: {
    waterDuration: 22,
    parallaxMax: 25,
  },
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export function WhaleAmbient({
  variant = "cinematic",
  intensity = 1,
  paused = false,
  className,
}: WhaleAmbientProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });
  const [isPageHidden, setIsPageHidden] = useState(() => {
    if (typeof document === "undefined") {
      return false;
    }
    return document.visibilityState !== "visible";
  });

  const profile = motionByIntensity[intensity];
  const shouldAnimate = !paused && !prefersReducedMotion && !isPageHidden;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleMotionPref = () => setPrefersReducedMotion(mediaQuery.matches);
    handleMotionPref();

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleMotionPref);
      return () => mediaQuery.removeEventListener("change", handleMotionPref);
    }

    mediaQuery.addListener(handleMotionPref);
    return () => mediaQuery.removeListener(handleMotionPref);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const handleVisibility = () => setIsPageHidden(document.visibilityState !== "visible");
    handleVisibility();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  useEffect(() => {
    const rootNode = rootRef.current;
    if (!rootNode) {
      return;
    }

    if (variant !== "parallax" || !shouldAnimate) {
      rootNode.style.setProperty("--wa-px", "0px");
      rootNode.style.setProperty("--wa-py", "0px");
      return;
    }

    const maxShift = profile.parallaxMax;
    const pointerTarget = { x: 0, y: 0 };
    let scrollTargetY = 0;
    const current = { x: 0, y: 0 };
    let frameId = 0;

    const render = () => {
      const targetX = pointerTarget.x;
      const targetY = pointerTarget.y + scrollTargetY;
      current.x += (targetX - current.x) * 0.08;
      current.y += (targetY - current.y) * 0.08;
      rootNode.style.setProperty("--wa-px", `${current.x.toFixed(2)}px`);
      rootNode.style.setProperty("--wa-py", `${current.y.toFixed(2)}px`);
      frameId = window.requestAnimationFrame(render);
    };

    const handlePointer = (event: PointerEvent) => {
      const bounds = rootNode.getBoundingClientRect();
      const x = clamp((event.clientX - bounds.left) / bounds.width, 0, 1);
      const y = clamp((event.clientY - bounds.top) / bounds.height, 0, 1);
      pointerTarget.x = clamp((x - 0.5) * 2, -1, 1) * maxShift;
      pointerTarget.y = clamp((y - 0.5) * 2, -1, 1) * maxShift * 0.66;
    };

    const handleLeave = () => {
      pointerTarget.x = 0;
      pointerTarget.y = 0;
    };

    const handleScroll = () => {
      scrollTargetY = Math.sin(window.scrollY / 420) * maxShift * 0.35;
    };

    window.addEventListener("pointermove", handlePointer);
    rootNode.addEventListener("pointerleave", handleLeave);
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    frameId = window.requestAnimationFrame(render);

    return () => {
      window.removeEventListener("pointermove", handlePointer);
      rootNode.removeEventListener("pointerleave", handleLeave);
      window.removeEventListener("scroll", handleScroll);
      window.cancelAnimationFrame(frameId);
      rootNode.style.setProperty("--wa-px", "0px");
      rootNode.style.setProperty("--wa-py", "0px");
    };
  }, [profile.parallaxMax, shouldAnimate, variant]);

  const rootStyle = useMemo(
    () =>
      ({
        "--wa-water-duration": `${profile.waterDuration}s`,
      }) as CSSProperties,
    [profile.waterDuration]
  );

  const classes = [
    "whaleAmbient",
    `whaleAmbient--${variant}`,
    !shouldAnimate ? "is-paused" : "",
    prefersReducedMotion ? "is-reduced" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} ref={rootRef} style={rootStyle} aria-label="Ambient whale motion graphic">
      <svg className="whaleAmbient__scene" viewBox="0 0 1200 600" role="img" aria-hidden="true">
        <defs>
          <linearGradient id="wa-bg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--wa-bg-top)" />
            <stop offset="100%" stopColor="var(--wa-bg-bottom)" />
          </linearGradient>
          <linearGradient id="wa-shaft" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(180, 244, 255, 0.16)" />
            <stop offset="100%" stopColor="rgba(180, 244, 255, 0)" />
          </linearGradient>
          <linearGradient id="wa-water" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--wa-water-top)" />
            <stop offset="100%" stopColor="var(--wa-water-bottom)" />
          </linearGradient>
        </defs>

        <g className="wa-layer wa-layer--bg">
          <rect x="0" y="0" width="1200" height="600" fill="url(#wa-bg)" />
          <path d="M122 44 L294 44 L28 518 L0 518 Z" fill="url(#wa-shaft)" opacity="0.28" />
          <path d="M540 0 L744 0 L384 600 L248 600 Z" fill="url(#wa-shaft)" opacity="0.22" />
          <path d="M1012 68 L1166 68 L812 596 L640 596 Z" fill="url(#wa-shaft)" opacity="0.2" />
        </g>

        <g className="wa-layer wa-layer--fg">
          <path
            className="wa-water wa-water--far"
            d="M0 356 C90 334, 190 374, 306 364 C420 354, 522 328, 640 340 C774 354, 916 390, 1200 338 L1200 600 L0 600 Z"
            fill="url(#wa-water)"
          />
          <path
            className="wa-water wa-water--near"
            d="M0 404 C120 374, 218 422, 334 410 C474 396, 598 364, 740 376 C908 392, 1046 432, 1200 406 L1200 600 L0 600 Z"
            fill="var(--wa-water-near)"
          />
          <path
            className="wa-ripple"
            d="M36 374 C138 360, 234 392, 360 386 C476 380, 612 350, 760 366 C906 382, 1038 402, 1160 380"
            fill="none"
            stroke="var(--wa-ripple)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>

        <rect className="wa-debug wa-debug--bg" x="0" y="0" width="1200" height="240" />
        <rect className="wa-debug wa-debug--whale" x="302" y="158" width="620" height="270" />
        <rect className="wa-debug wa-debug--fg" x="0" y="322" width="1200" height="278" />
      </svg>
    </div>
  );
}
