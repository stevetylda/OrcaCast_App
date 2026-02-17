import type { ExplainabilityView } from "../../features/explainability/types";

type Option = { key: ExplainabilityView; label: string };

const OPTIONS: Option[] = [
  { key: "drivers", label: "Drivers" },
  { key: "interactions", label: "Interactions" },
  { key: "window", label: "Window" },
  { key: "compare", label: "Compare" },
];

type Props = {
  value: ExplainabilityView;
  onChange: (value: ExplainabilityView) => void;
};

export function ExplainabilityToggle({ value, onChange }: Props) {
  const activeIndex = OPTIONS.findIndex((option) => option.key === value);

  return (
    <div
      className="lineageViewToggle explainabilityToggle"
      role="tablist"
      aria-label="Explainability mode"
      onKeyDown={(event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        const dir = event.key === "ArrowRight" ? 1 : -1;
        const nextIndex = (activeIndex + dir + OPTIONS.length) % OPTIONS.length;
        onChange(OPTIONS[nextIndex].key);
      }}
    >
      {OPTIONS.map((option) => (
        <button
          key={option.key}
          type="button"
          role="tab"
          aria-selected={value === option.key}
          tabIndex={value === option.key ? 0 : -1}
          className={value === option.key ? "lineageViewToggle__option isActive" : "lineageViewToggle__option"}
          onClick={() => onChange(option.key)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
