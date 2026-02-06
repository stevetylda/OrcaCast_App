type LensBadgeVariant = "header" | "inline" | "footer";

type Props = {
  variant?: LensBadgeVariant;
  label?: string;
};

const LENS_LABEL = "Lens: Reported sightings (not real-time)";

export function LensBadge({ variant = "inline", label }: Props) {
  return (
    <span className={`lensBadge lensBadge--${variant}`}>
      {label ?? LENS_LABEL}
    </span>
  );
}
