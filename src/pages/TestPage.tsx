import { Fragment, useEffect, useMemo, useState } from "react";
import { DataLineageGraph } from "../components/data/DataLineageGraph";
import { PageShell } from "../components/PageShell";
import {
  type DataLineageEdge,
  type DataLineageNodeMeta,
  basemapAcknowledgements,
  modelLineageEdges,
  modelLineageNodes,
} from "./data/lineageConfig";
import { coverageRows, coverageYears } from "./data/coverageMatrix";

export function TestPage() {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [lineageView, setLineageView] = useState<"high-level" | "full-feature">("high-level");

  useEffect(() => {
    setSelectedNodeId(null);
  }, [lineageView]);

  const highLevelNodes = useMemo<DataLineageNodeMeta[]>(
    () => [
      {
        id: "hl_sightings",
        label: "Sightings",
        lane: "inputs",
        category: "observations",
        kind: "provider",
        pipeline: "sightings",
        status: "included",
        description: "Aggregated sightings inputs used by the model.",
        cadence: "Weekly / monthly",
        coverage: "Pacific Northwest",
        access: "Mixed sources",
      },
      {
        id: "hl_water_extent",
        label: "Water extent",
        lane: "inputs",
        category: "observations",
        kind: "provider",
        pipeline: "water",
        status: "included",
        description: "Water-domain and coastline geometry constraints.",
        cadence: "Periodic refresh",
        coverage: "Pacific Northwest",
        access: "Geospatial layers",
      },
      {
        id: "hl_depth",
        label: "Depth",
        lane: "inputs",
        category: "observations",
        kind: "provider",
        pipeline: "bathymetry",
        status: "planned",
        description: "Planned depth/bathymetry context inputs.",
        cadence: "Periodic release",
        coverage: "Regional marine domains",
        access: "Planned ingestion",
      },
      {
        id: "hl_ocean_state",
        label: "Ocean state",
        lane: "inputs",
        category: "observations",
        kind: "provider",
        pipeline: "ocean_state",
        status: "planned",
        description: "Planned ocean condition covariates.",
        cadence: "Daily / weekly",
        coverage: "Regional ocean domains",
        access: "Planned ingestion",
      },
      {
        id: "hl_prey_availability",
        label: "Prey availability",
        lane: "inputs",
        category: "observations",
        kind: "provider",
        pipeline: "prey_availability",
        status: "planned",
        description: "Planned prey proxy and fishery context signals.",
        cadence: "Seasonal / operational",
        coverage: "Regional",
        access: "Planned ingestion",
      },
      {
        id: "hl_human",
        label: "Human",
        lane: "inputs",
        category: "observations",
        kind: "provider",
        pipeline: "disturbance",
        status: "planned",
        description: "Planned human activity and effort-proxy signals.",
        cadence: "Daily / weekly",
        coverage: "Regional",
        access: "Planned ingestion",
      },
      {
        id: "data_processing",
        label: "Data processing",
        lane: "processing",
        category: "processing",
        kind: "processing",
        pipeline: "shared",
        status: "included",
        description: "Normalize, align, and merge source pipelines into model-ready features.",
        inputs: [
          "hl_sightings",
          "hl_water_extent",
          "hl_depth",
          "hl_ocean_state",
          "hl_prey_availability",
          "hl_human",
        ],
        outputs: ["feature_engineering"],
      },
      {
        id: "feature_engineering",
        label: "Feature Engineering",
        lane: "processing",
        category: "processing",
        kind: "processing",
        pipeline: "shared",
        status: "included",
        description: "Create model features from processed, aligned inputs.",
        inputs: ["data_processing"],
        outputs: ["model_inference"],
      },
      {
        id: "model_inference",
        label: "Model Inference",
        lane: "processing",
        category: "processing",
        kind: "processing",
        pipeline: "shared",
        status: "included",
        description: "Generate model predictions from engineered features.",
        inputs: ["feature_engineering"],
      },
    ],
    []
  );

  const highLevelEdges = useMemo<DataLineageEdge[]>(
    () => [
      { id: "hl-sightings-process", source: "hl_sightings", target: "data_processing" },
      { id: "hl-water-process", source: "hl_water_extent", target: "data_processing" },
      { id: "hl-depth-process", source: "hl_depth", target: "data_processing" },
      { id: "hl-ocean-process", source: "hl_ocean_state", target: "data_processing" },
      { id: "hl-prey-process", source: "hl_prey_availability", target: "data_processing" },
      { id: "hl-human-process", source: "hl_human", target: "data_processing" },
      { id: "hl-process-feature", source: "data_processing", target: "feature_engineering" },
      { id: "hl-feature-inference", source: "feature_engineering", target: "model_inference" },
    ],
    []
  );

  const lineageNodes = lineageView === "high-level" ? highLevelNodes : modelLineageNodes;
  const lineageEdges = lineageView === "high-level" ? highLevelEdges : modelLineageEdges;

  return (
    <PageShell
      title="Test Page"
      fullBleed
      showBottomRail={false}
      showFooter={false}
      stageClassName="pageStage--data"
    >
      <div className="dataPageBg">
        <div className="dataPageContent">
          <div className="dataPageSheet">
            <section className="dataSection">
              <div className="dataOverviewBox">
                <h2>Overview</h2>
                <p className="dataSubtle">
                  OrcaCast combines reported sightings with planned environmental, prey, and human
                  activity signals. Inputs flow through feature preparation, inference, and
                  calibration to produce forecast layers.
                </p>
                <div className="dataOverviewBias">
                  <div className="dataOverviewBias__title">Bias Notes</div>
                  <ul className="aboutBullets">
                    <li>Expect higher density near shore and population centers.</li>
                    <li>Reporting effort varies by season and weather.</li>
                    <li>Forecast is about reports, not confirmed presence.</li>
                  </ul>
                </div>
              </div>
            </section>

            <div className="dataDivider" />

            <section className="dataSection">
              <h2>Model Data Lineage</h2>
              <div className="lineageViewToggle" role="tablist" aria-label="Lineage view mode">
                <button
                  type="button"
                  role="tab"
                  aria-selected={lineageView === "high-level"}
                  className={`lineageViewToggle__option ${
                    lineageView === "high-level" ? "isActive" : ""
                  }`}
                  onClick={() => setLineageView("high-level")}
                >
                  High-Level View
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={lineageView === "full-feature"}
                  className={`lineageViewToggle__option ${
                    lineageView === "full-feature" ? "isActive" : ""
                  }`}
                  onClick={() => setLineageView("full-feature")}
                >
                  Full-Feature View
                </button>
              </div>
              <DataLineageGraph
                nodes={lineageNodes}
                edges={lineageEdges}
                selectedNodeId={selectedNodeId}
                onSelectNode={setSelectedNodeId}
                showPipelineLabels={lineageView === "full-feature"}
                viewMode={lineageView}
              />
            </section>

            <div className="dataDivider" />

            <section className="dataSection">
              <h2>Coverage Snapshot</h2>
              <div className="dataCoverageHeader">
                <div className="dataCoverageStatic__title">Dynamic Sources</div>
                <div className="dataCoverageLegend" aria-label="Coverage legend">
                  <span className="dataCoverageLegend__item">
                    <span className="dataCoverageLegend__swatch dataCoverageLegend__swatch--available">
                      ●
                    </span>
                    Available
                  </span>
                  <span className="dataCoverageLegend__item">
                    <span className="dataCoverageLegend__swatch dataCoverageLegend__swatch--missing">x</span>
                    Not available
                  </span>
                </div>
              </div>
              <div className="dataCoverageWrap">
                <div
                  className="dataCoverageGrid"
                  role="table"
                  aria-label="Yearly coverage by data source"
                  style={{
                    gridTemplateColumns: `minmax(190px, 1.7fr) repeat(${coverageYears.length}, minmax(22px, 0.5fr))`,
                  }}
                >
                  <div className="dataCoverageCell dataCoverageCell--head dataCoverageCell--source">
                    Data Source
                  </div>
                  {coverageYears.map((year) => (
                    <div key={year} className="dataCoverageCell dataCoverageCell--head dataCoverageCell--year">
                      <span className="dataCoverageYearLabel">{year}</span>
                    </div>
                  ))}

                  {coverageRows.map((row) => {
                    const rowHasAnyAvailable = coverageYears.some(
                      (year) => row.availabilityByYear[year]
                    );

                    return (
                      <Fragment key={row.source}>
                      <div
                        className="dataCoverageCell dataCoverageCell--source"
                      >
                        {row.source}
                      </div>
                      {coverageYears.map((year) => {
                        const available = row.availabilityByYear[year];
                        const showMissingMarker = rowHasAnyAvailable;
                        return (
                          <div
                            key={`${row.source}-${year}`}
                            className={`dataCoverageCell dataCoverageCell--value ${
                              available
                                ? "dataCoverageCell--available"
                                : showMissingMarker
                                  ? "dataCoverageCell--missing"
                                  : ""
                            }`}
                            aria-label={`${row.source} ${year} ${available ? "available" : "not available"}`}
                            title={`${row.source} ${year}: ${available ? "available" : "not available"}`}
                          >
                            {available ? "●" : showMissingMarker ? "x" : ""}
                          </div>
                        );
                      })}
                      </Fragment>
                    );
                  })}
                </div>
              </div>
              <div className="dataCoverageStatic">
                <div className="dataCoverageStatic__title">Static Sources</div>
                <div className="dataStaticTable" role="table" aria-label="Static data sources">
                  <div className="dataStaticTable__cell dataStaticTable__cell--head">Data Source</div>
                  <div className="dataStaticTable__cell dataStaticTable__cell--head">Recency</div>

                  <div className="dataStaticTable__cell">Coastline boundaries</div>
                  <div className="dataStaticTable__cell">&nbsp;</div>

                  <div className="dataStaticTable__cell">Hydro polygons</div>
                  <div className="dataStaticTable__cell">&nbsp;</div>

                  <div className="dataStaticTable__cell">GEBCO 10M</div>
                  <div className="dataStaticTable__cell">&nbsp;</div>
                </div>
              </div>
            </section>

            <div className="dataDivider" />

            <section className="dataSection">
              <h2>Results Rendering</h2>
              <p className="dataSubtle dataSubtle--singleLine">
                Basemap providers below support app rendering and map context. They are credited separately from model training data.
              </p>
              <div className="dataRenderTableWrap">
                <table className="dataRenderTable" aria-label="Results rendering sources">
                  <thead>
                    <tr>
                      <th>Data Source</th>
                      <th>Role</th>
                      <th>Description</th>
                      <th>Cadence</th>
                      <th>Coverage</th>
                      <th>Access</th>
                      <th>Attribution</th>
                      <th>Site</th>
                    </tr>
                  </thead>
                  <tbody>
                    {basemapAcknowledgements.map((provider) => (
                      <tr key={provider.id}>
                        <td>{provider.label}</td>
                        <td>{provider.role}</td>
                        <td>{provider.description}</td>
                        <td>{provider.cadence}</td>
                        <td>{provider.coverage}</td>
                        <td>{provider.access}</td>
                        <td>
                          <ul className="dataRenderTable__links">
                            {provider.attributionLinks.map((link) => (
                              <li key={link.url}>
                                <a className="pageLink" href={link.url} target="_blank" rel="noreferrer">
                                  {link.label}
                                </a>
                              </li>
                            ))}
                          </ul>
                        </td>
                        <td>
                          <a
                            className="sourceDetails__button dataRenderTable__button"
                            href={provider.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open site
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
