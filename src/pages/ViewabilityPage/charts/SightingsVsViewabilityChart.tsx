import type { ViewabilitySightingsBin } from "../../../data/viewabilityTypes";

type Props = {
  bins: ViewabilitySightingsBin[];
};

export function SightingsVsViewabilityChart({ bins }: Props) {
  if (bins.length === 0) {
    return <div className="viewabilityEmptyState">Relationship data will appear here once sightings bins are connected.</div>;
  }

  const maxSightings = Math.max(...bins.map((bin) => bin.sighting_count ?? 0), 1);
  return (
    <div className="viewabilityRelationshipChart" aria-label="Sightings vs. dynamic viewability">
      {bins.map((bin) => (
        <div key={bin.bin_label} className="viewabilityRelationshipChart__barWrap">
          <div className="viewabilityRelationshipChart__bar" style={{ height: `${Math.max(8, ((bin.sighting_count ?? 0) / maxSightings) * 100)}%` }} />
          <span>{bin.bin_label}</span>
        </div>
      ))}
    </div>
  );
}
