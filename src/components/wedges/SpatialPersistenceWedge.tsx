const persistenceData = [42, 48, 55, 60, 52, 64, 70, 58, 66, 72, 68, 74];

function buildLinePoints(values: number[]) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = Math.max(max - min, 1);
  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 200;
      const y = 70 - ((value - min) / range) * 45;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function SpatialPersistenceWedge() {
  const linePoints = buildLinePoints(persistenceData);
  const areaPoints = `${linePoints} 200,75 0,75`;

  return (
    <div className="wedge">
      <header className="wedge__header">
        <h3>Persistence</h3>
        <p>How sticky hotspots are week-to-week (habitat vs events).</p>
      </header>
      <div className="wedge__grid wedge__grid--single">
        <div className="wedge__chart">
          <div className="wedge__chartLabel">Overlap index (%)</div>
          <svg viewBox="0 0 200 80" role="img" aria-label="Spatial persistence area chart">
            <polygon className="wedge__area" points={areaPoints} />
            <polyline className="wedge__line" points={linePoints} />
          </svg>
          <div className="wedge__callout">Median overlap: 62%</div>
        </div>
      </div>
    </div>
  );
}
