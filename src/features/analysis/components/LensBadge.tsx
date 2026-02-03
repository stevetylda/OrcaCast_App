type LensBadgeVariant = "header" | "inline" | "footer";

type Props = {
  variant?: LensBadgeVariant;
};

const LENS_LABEL = "Lens: Reported sightings (not real-time)";

export function LensBadge({ variant = "inline" }: Props) {
  return <span className={`lensBadge lensBadge--${variant}`}>{LENS_LABEL}</span>;
}
