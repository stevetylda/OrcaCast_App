const dayOfWeekData = [36, 48, 58, 62, 70, 76, 54];
const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function DayOfWeekHolidaysWedge() {
  const max = Math.max(...dayOfWeekData);

  return (
    <div className="wedge">
      <header className="wedge__header">
        <h3>Time &amp; Holidays</h3>
        <p>Observer patterns and reporting effects across weeks and holidays.</p>
      </header>
      <div className="wedge__grid">
        <div className="wedge__chart">
          <div className="wedge__chartLabel">Day-of-week activity</div>
          <div className="wedge__bars" role="img" aria-label="Day-of-week bar chart">
            {dayOfWeekData.map((value, index) => (
              <div key={dayLabels[index]} className="wedge__bar">
                <span
                  className="wedge__barFill"
                  style={{ height: `${Math.round((value / max) * 100)}%` }}
                />
                <span className="wedge__barLabel">{dayLabels[index]}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="wedge__chart">
          <div className="wedge__chartLabel">Holiday weeks signal</div>
          <div className="wedge__chips">
            <span className="wedge__chip">Memorial wk +18%</span>
            <span className="wedge__chip">July 4 wk +22%</span>
            <span className="wedge__chip">Labor wk +14%</span>
          </div>
          <p className="wedge__note">Peak sightings align with long-weekend reporting surges.</p>
        </div>
      </div>
    </div>
  );
}
