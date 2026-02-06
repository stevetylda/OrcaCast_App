type Props = {
  category: string;
  label: string;
};

export function ActionPill({ category, label }: Props) {
  return (
    <span className="actionPill">
      <span className="actionPill__category">{category}</span>
      <span className="actionPill__label">{label}</span>
    </span>
  );
}
