import { useId } from "react";

type Props = {
  label: string;
  title: string;
  body: string;
};

export function InfoTip({ label, title, body }: Props) {
  const tooltipId = useId();

  return (
    <span className="infoTip">
      <button
        type="button"
        className="infoTip__trigger"
        aria-label={label}
        aria-describedby={tooltipId}
      >
        ?
      </button>
      <span id={tooltipId} role="tooltip" className="infoTip__content">
        <span className="infoTip__title">{title}</span>
        <span className="infoTip__body">{body}</span>
      </span>
    </span>
  );
}
