const radarLabels = ["Seasonality", "Burstiness", "Concentration", "Persistence", "Coverage"];
const radarValues = [0.78, 0.62, 0.7, 0.55, 0.68];

function buildRadarPoints(values: number[], radius: number, center: number) {
  const angleStep = (Math.PI * 2) / values.length;
  return values
    .map((value, index) => {
      const angle = angleStep * index - Math.PI / 2;
      const r = value * radius;
      const x = center + Math.cos(angle) * r;
      const y = center + Math.sin(angle) * r;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function ContextSignatureRadarWedge() {
  const radarPoints = buildRadarPoints(radarValues, 40, 50);

  return (
    <div className="wedge">
      <header className="wedge__header">
        <h3>Context Signature</h3>
        <p>A character-sheet radar: seasonality, burstiness, concentration.</p>
      </header>
      <div className="wedge__grid wedge__grid--single">
        <div className="wedge__chart">
          <div className="wedge__chartLabel">Context radar profile</div>
          <svg viewBox="0 0 100 100" role="img" aria-label="Context signature radar chart">
            {[1, 0.75, 0.5, 0.25].map((scale) => (
              <polygon
                key={scale}
                className="wedge__radarGrid"
                points={buildRadarPoints(new Array(radarValues.length).fill(scale), 40, 50)}
              />
            ))}
            <polygon className="wedge__radar" points={radarPoints} />
            {radarValues.map((value, index) => {
              const angle = (Math.PI * 2 * index) / radarValues.length - Math.PI / 2;
              const x = 50 + Math.cos(angle) * 45;
              const y = 50 + Math.sin(angle) * 45;
              return (
                <text key={radarLabels[index]} x={x} y={y} className="wedge__radarLabel">
                  {radarLabels[index]}
                </text>
              );
            })}
          </svg>
        </div>
        <div className="wedge__chart wedge__legend">
          {radarLabels.map((label, index) => (
            <div key={label} className="wedge__legendRow">
              <span className="wedge__legendLabel">{label}</span>
              <span className="wedge__legendValue">{Math.round(radarValues[index] * 100)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
