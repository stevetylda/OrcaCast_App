import { PageShell } from "../components/PageShell";
import { attribution } from "../config/attribution";

const attributionLinks: Record<string, string> = {
  "OpenStreetMap contributors": "https://www.openstreetmap.org/copyright",
  "CARTO basemaps": "https://carto.com/attributions",
  Acartia: "https://acartia.io/home",
  "The Whale Museum": "https://www.whalemuseum.org/",
  iNaturalist: "https://www.inaturalist.org/",
};

export function DataPage() {
  const basemapSources = ["OpenStreetMap contributors", "CARTO basemaps"];
  const sightingSources = attribution.sources.filter(
    (source) => !basemapSources.includes(source)
  );

  return (
    <PageShell title="Data">
      <section className="pageSection">
        <h2>Sources</h2>
        <div className="pageGrid">
          <div className="pageCard">
            <div className="pageCard__title">Basemap</div>
            <ul className="pageList">
              {basemapSources.map((source) => (
                <li key={source}>
                  {attributionLinks[source] ? (
                    <a
                      className="pageLink"
                      href={attributionLinks[source]}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {source}
                    </a>
                  ) : (
                    source
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="pageCard">
            <div className="pageCard__title">Sightings</div>
            <ul className="pageList">
              {sightingSources.map((source) => (
                <li key={source}>
                  {attributionLinks[source] ? (
                    <a
                      className="pageLink"
                      href={attributionLinks[source]}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {source}
                    </a>
                  ) : (
                    source
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="pageSection">
        <h2>Coverage + bias notes</h2>
        <ul>
          <li>Spatial coverage is denser near popular viewing corridors.</li>
          <li>Seasonality and reporting effort can skew apparent hotspots.</li>
          <li>Future work will include effort-normalized baselines.</li>
        </ul>
      </section>
    </PageShell>
  );
}
