type ComingSoonWedgeProps = {
  title: string;
  description: string;
};

export function ComingSoonWedge({ title, description }: ComingSoonWedgeProps) {
  return (
    <div className="wedge wedge--soon">
      <header className="wedge__header">
        <h3>{title}</h3>
        <p>{description}</p>
      </header>
      <div className="wedge__soon">
        <div className="wedge__soonBadge">Coming soon</div>
        <p>Prototype content planned for v1. This slot will host the full analysis wedge.</p>
      </div>
    </div>
  );
}
