const seasonalityData = [18, 26, 38, 30, 44, 56, 62, 58, 50, 46, 54, 66, 72, 60];

function buildLinePoints(values: number[]) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = Math.max(max - min, 1);
  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 200;
      const y = 70 - ((value - min) / range) * 50;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function SeasonalityWedge() {
  const linePoints = buildLinePoints(seasonalityData);

  return (
    <div className="wedge">
      <header className="wedge__header">
        <h3>Seasonality</h3>
        <p>Annual rhythms in sightings: week-of-year patterns and anomalies.</p>
      </header>
      <div className="wedge__grid">
        <div className="wedge__chart">
          <div className="wedge__chartLabel">Weekly index</div>
          <svg viewBox="0 0 200 80" role="img" aria-label="Seasonality line chart">
            <polyline className="wedge__line" points={linePoints} />
            {seasonalityData.map((value, index) => {
              const x = (index / (seasonalityData.length - 1)) * 200;
              const y = 70 - ((value - 18) / 54) * 50;
              return <circle key={value + index} cx={x} cy={y} r={2.5} className="wedge__point" />;
            })}
          </svg>
        </div>
        <div className="wedge__chart">
          <div className="wedge__chartLabel">Weekly spread heatmap</div>
          <div className="wedge__heatmap">
            {Array.from({ length: 28 }).map((_, index) => (
              <span key={`heat-${index}`} className="wedge__heatmapCell" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
