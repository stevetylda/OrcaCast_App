import { useMemo } from "react";

type Props = {
  data: number[];
  height?: number;
  strokeWidth?: number;
  ariaLabel?: string;
};

export function Sparkline({ data, height = 42, strokeWidth = 2, ariaLabel }: Props) {
  const path = useMemo(() => {
    if (!data || data.length < 2) return "";
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = Math.max(1, max - min);
    return data
      .map((value, index) => {
        const x = (index / (data.length - 1)) * 100;
        const y = 100 - ((value - min) / range) * 100;
        return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(" ");
  }, [data]);

  return (
    <svg
      className="insightSparkline"
      viewBox="0 0 100 100"
      height={height}
      role="img"
      aria-label={ariaLabel}
    >
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
