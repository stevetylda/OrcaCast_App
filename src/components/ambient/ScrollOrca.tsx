import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import "./ScrollOrca.css";

type ScrollOrcaProps = {
  intensity?: 0 | 1 | 2;
  paused?: boolean;
  reducedMotion?: boolean;
  className?: string;
};

type SwimProfile = {
  tailAmplitude: number;
  tailDuration: number;
  bobAmplitude: number;
  bobDuration: number;
  tiltAmplitude: number;
};

type Pixel = [number, number];

const swimProfiles: Record<0 | 1 | 2, SwimProfile> = {
  0: { tailAmplitude: 6, tailDuration: 2.1, bobAmplitude: 2, bobDuration: 8.5, tiltAmplitude: 2 },
  1: { tailAmplitude: 8, tailDuration: 1.7, bobAmplitude: 3, bobDuration: 7.2, tiltAmplitude: 3 },
  2: { tailAmplitude: 11, tailDuration: 1.35, bobAmplitude: 4, bobDuration: 6.2, tiltAmplitude: 4 },
};

const bodyPixels: Pixel[] = [
  [4, 15], [5, 14], [6, 13], [7, 12], [8, 12], [9, 12], [10, 13], [11, 14],
  [4, 16], [5, 16], [6, 16], [7, 16], [8, 16], [9, 16], [10, 16], [11, 16], [12, 16],
  [3, 17], [4, 17], [5, 17], [6, 17], [7, 17], [8, 17], [9, 17], [10, 17], [11, 17], [12, 17], [13, 17],
  [3, 18], [4, 18], [5, 18], [6, 18], [7, 18], [8, 18], [9, 18], [10, 18], [11, 18], [12, 18], [13, 18],
  [4, 19], [5, 19], [6, 19], [7, 19], [8, 19], [9, 19], [10, 19], [11, 19], [12, 19], [13, 19],
  [5, 20], [6, 20], [7, 20], [8, 20], [9, 20], [10, 20], [11, 20], [12, 20],

  [10, 14], [11, 13], [12, 12], [13, 11], [14, 10], [15, 9], [16, 8], [17, 7],
  [11, 14], [12, 13], [13, 12], [14, 11], [15, 10], [16, 9], [17, 8], [18, 7],
  [12, 14], [13, 13], [14, 12], [15, 11], [16, 10], [17, 9], [18, 8],

  [13, 8], [14, 7], [15, 6], [16, 5], [17, 4], [18, 3], [19, 2],
  [13, 9], [14, 8], [15, 7], [16, 6], [17, 5], [18, 4], [19, 3],
  [13, 10], [14, 9], [15, 8], [16, 7], [17, 6], [18, 5],
];

const tailPixels: Pixel[] = [
  [18, 2], [19, 1], [20, 0],
  [18, 3], [19, 2], [20, 1], [21, 1],
  [17, 4], [18, 4], [19, 4], [20, 4],
  [16, 5], [17, 5], [18, 5], [19, 5],
  [16, 6], [17, 6], [18, 6],

  [16, 7], [17, 7], [18, 8], [19, 9], [20, 10],
  [15, 8], [16, 8], [17, 9], [18, 10], [19, 11],
  [15, 9], [16, 9], [17, 10], [18, 11],
];

const finPixels: Pixel[] = [
  [11, 13], [12, 12], [13, 11], [14, 10],
  [10, 14], [11, 14], [12, 13], [13, 12],
  [9, 15], [10, 15], [11, 15],

  [7, 21], [8, 21], [9, 22], [10, 23], [11, 24],
  [6, 21], [7, 22], [8, 23], [9, 24],
];

const bellyPixels: Pixel[] = [
  [4, 19], [5, 19], [6, 19], [7, 19], [8, 19], [9, 19],
  [4, 20], [5, 20], [6, 20], [7, 20], [8, 20], [9, 20], [10, 20],
  [5, 21], [6, 21], [7, 21], [8, 21], [9, 21], [10, 21], [11, 21],
  [6, 22], [7, 22], [8, 22], [9, 22], [10, 22],
];

const eyePatchPixels: Pixel[] = [
  [5, 16], [6, 15], [7, 15], [8, 15],
  [4, 17], [5, 17], [6, 17], [7, 17],
];

const eyeDetailPixels: Pixel[] = [[7, 17], [8, 17]];

const bubblePixels: Pixel[] = [
  [2, 14], [3, 13], [4, 14], [3, 15],
  [1, 17], [2, 16], [3, 17], [2, 18],
  [1, 20], [2, 19], [3, 20], [2, 21],
];

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

function renderPixels(pixels: Pixel[], fill: string) {
  return pixels.map(([x, y], index) => (
    <rect key={`${fill}-${x}-${y}-${index}`} x={x} y={y} width="1" height="1" fill={fill} />
  ));
}

export function ScrollOrca({ intensity = 1, paused = false, reducedMotion = false, className }: ScrollOrcaProps) {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const profile = swimProfiles[intensity];

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    let rafId = 0;
    let scrollContainer: HTMLElement | null = null;
    let lastMeasuredProgress = 0;

    const resolveScrollContainer = () => {
      const scoped = document.querySelector(".pageStage--whaleTest .page") as HTMLElement | null;
      if (scoped) {
        return scoped;
      }
      return document.querySelector(".page") as HTMLElement | null;
    };

    const getProgress = () => {
      const fromContainer = (() => {
        if (!scrollContainer) {
          return 0;
        }
        const maxScroll = Math.max(0, scrollContainer.scrollHeight - scrollContainer.clientHeight);
        if (maxScroll <= 1) {
          return 0;
        }
        return clamp(scrollContainer.scrollTop / maxScroll, 0, 1);
      })();

      const fromWindow = (() => {
        const doc = document.documentElement;
        const maxScroll = Math.max(0, doc.scrollHeight - window.innerHeight);
        if (maxScroll <= 1) {
          return 0;
        }
        return clamp(window.scrollY / maxScroll, 0, 1);
      })();

      return Math.abs(fromContainer - lastMeasuredProgress) >= Math.abs(fromWindow - lastMeasuredProgress)
        ? fromContainer
        : fromWindow;
    };

    const updateScrollProgress = () => {
      if (!scrollContainer) {
        scrollContainer = resolveScrollContainer();
      }

      const nextProgress = getProgress();
      if (Math.abs(nextProgress - lastMeasuredProgress) > 0.0005) {
        setDirection(nextProgress > lastMeasuredProgress ? 1 : -1);
        lastMeasuredProgress = nextProgress;
      }

      setScrollProgress(nextProgress);
      rafId = 0;
    };

    const handleScroll = () => {
      if (rafId !== 0) {
        return;
      }
      rafId = window.requestAnimationFrame(updateScrollProgress);
    };

    scrollContainer = resolveScrollContainer();
    scrollContainer?.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    handleScroll();

    return () => {
      scrollContainer?.removeEventListener("scroll", handleScroll);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      if (rafId !== 0) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, []);

  const travel = scrollProgress * 2;
  const leg = Math.floor(travel);
  const legProgress = travel - leg;
  const isRightward = leg % 2 === 0;
  const horizontal = isRightward ? legProgress : 1 - legProgress;
  const swimNudge = reducedMotion || paused ? 0 : Math.sin(scrollProgress * Math.PI * 16) * 1.8;
  const xPercent = 8 + horizontal * 84 + swimNudge * 0.24;
  const yPercent = 14 + scrollProgress * 66 + swimNudge * 0.5;
  const facing = reducedMotion || paused ? direction : isRightward ? 1 : -1;

  const style = useMemo(
    () =>
      ({
        "--so-x": `${xPercent}%`,
        "--so-y": `${yPercent}%`,
        "--so-flip": facing === -1 ? -1 : 1,
        "--so-tail-amp": `${profile.tailAmplitude}deg`,
        "--so-tail-duration": `${profile.tailDuration}s`,
        "--so-bob-amp": `${profile.bobAmplitude}px`,
        "--so-bob-duration": `${profile.bobDuration}s`,
        "--so-tilt-amp": `${profile.tiltAmplitude}deg`,
      }) as CSSProperties,
    [facing, profile.bobAmplitude, profile.bobDuration, profile.tailAmplitude, profile.tailDuration, profile.tiltAmplitude, xPercent, yPercent]
  );

  const classes = [
    "scrollOrca",
    facing === 1 ? "is-right" : "is-left",
    paused || reducedMotion ? "is-static" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  const sprite = (
    <div className={classes} style={style} aria-hidden="true">
      <div className="scrollOrca__sprite">
        <svg className="scrollOrca__svg" viewBox="0 0 30 26" role="img" aria-hidden="true">
          <g className="scrollOrca__swimBob">
            <g className="scrollOrca__swimTilt">
              <g id="orca-body" filter="url(#scrollOrcaRim)">
                {renderPixels(bodyPixels, "var(--scroll-orca-body)")}
                {renderPixels(bellyPixels, "var(--scroll-orca-belly)")}
                {renderPixels(eyePatchPixels, "var(--scroll-orca-eye-patch)")}
                {renderPixels(eyeDetailPixels, "var(--scroll-orca-eye-detail)")}
              </g>
              <g id="orca-fin">{renderPixels(finPixels, "var(--scroll-orca-body-mid)")}</g>
              <g id="orca-tail">{renderPixels(tailPixels, "var(--scroll-orca-tail-stock)")}</g>
            </g>
          </g>

          <g className="scrollOrca__wake">{renderPixels(bubblePixels, "var(--scroll-orca-wake)")}</g>

          <defs>
            <filter id="scrollOrcaRim" x="-30%" y="-30%" width="180%" height="180%">
              <feDropShadow dx="0" dy="0" stdDeviation="1" floodColor="var(--scroll-orca-rim)" floodOpacity="0.28" />
            </filter>
          </defs>
        </svg>
      </div>
    </div>
  );

  if (typeof document === "undefined") {
    return sprite;
  }

  return createPortal(sprite, document.body);
}
