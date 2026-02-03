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
      <section className="pageSection dataSection">
        <h2>Sources</h2>
        <div className="dataSourcesGrid">
          <div className="pageCard dataCard">
            <div className="pageCard__title dataCard__title">Basemap</div>
            <div className="dataMeta">
              <div className="dataMeta__row">
                <span className="dataMeta__label">Coverage</span>
                <span className="dataMeta__value">Varies by provider</span>
              </div>
              <div className="dataMeta__row">
                <span className="dataMeta__label">Update cadence</span>
                <span className="dataMeta__value">Rolling / provider defined</span>
              </div>
              <div className="dataMeta__row">
                <span className="dataMeta__label">License</span>
                <span className="dataMeta__value">See attribution links</span>
              </div>
            </div>
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

          <div className="pageCard dataCard">
            <div className="pageCard__title dataCard__title">Sightings</div>
            <div className="dataMeta">
              <div className="dataMeta__row">
                <span className="dataMeta__label">Coverage</span>
                <span className="dataMeta__value">Varies by source</span>
              </div>
              <div className="dataMeta__row">
                <span className="dataMeta__label">Update cadence</span>
                <span className="dataMeta__value">Weekly / monthly (source dependent)</span>
              </div>
              <div className="dataMeta__row">
                <span className="dataMeta__label">License</span>
                <span className="dataMeta__value">See attribution links</span>
              </div>
            </div>
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

      <section className="pageSection dataSection">
        <h2>Coverage snapshot</h2>
        <div className="dataStatsRow" role="list">
          <div className="dataStat" role="listitem">
            <div className="dataStat__label">Records</div>
            <div className="dataStat__value">Multi-source</div>
          </div>
          <div className="dataStat" role="listitem">
            <div className="dataStat__label">Date range</div>
            <div className="dataStat__value">Varies by source</div>
          </div>
          <div className="dataStat" role="listitem">
            <div className="dataStat__label">Regions covered</div>
            <div className="dataStat__value">Pacific Northwest (WA / BC)</div>
          </div>
          <div className="dataStat" role="listitem">
            <div className="dataStat__label">Species</div>
            <div className="dataStat__value">SRKW / Bigg's supported</div>
          </div>
        </div>
      </section>

      <section className="pageSection dataSection">
        <h2>Bias notes</h2>
        <ul className="dataBiasList">
          <li>Expect higher density near shore and population centers.</li>
          <li>Reporting effort varies by season and weather.</li>
          <li>Forecast is about reports, not presence.</li>
        </ul>
      </section>
    </PageShell>
  );
}
