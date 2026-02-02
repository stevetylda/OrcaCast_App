import { PageShell } from "../components/PageShell";

export function PerformancePage() {
  return (
    <PageShell title="Performance">
      <section className="pageSection">
        <h2>Metrics overview</h2>
        <ul>
          <li>
            <strong>Precision@K:</strong> share of top-K cells that contain sightings.
          </li>
          <li>
            <strong>Recall@K:</strong> coverage of sightings captured within top-K cells.
          </li>
          <li>
            <strong>Lift@K:</strong> improvement over a random baseline at K.
          </li>
          <li>
            <strong>NDCG@K:</strong> ranking quality with higher weight on top cells.
          </li>
        </ul>
      </section>

      <section className="pageSection">
        <h2>Evaluation snapshot</h2>
        <div className="pageTable">
          <div className="pageTable__row pageTable__row--header">
            <div>Model</div>
            <div>Precision@50</div>
            <div>Recall@50</div>
            <div>Lift@50</div>
            <div>NDCG@50</div>
          </div>
          <div className="pageTable__row">
            <div>OrcaCast vPhase2</div>
            <div>0.42</div>
            <div>0.31</div>
            <div>2.6×</div>
            <div>0.58</div>
          </div>
          <div className="pageTable__row">
            <div>Spatiotemporal RF</div>
            <div>0.38</div>
            <div>0.27</div>
            <div>2.1×</div>
            <div>0.52</div>
          </div>
          <div className="pageTable__row">
            <div>Neighbor climatology</div>
            <div>0.29</div>
            <div>0.21</div>
            <div>1.6×</div>
            <div>0.41</div>
          </div>
        </div>
        <p className="pageNote">
          Evaluation uses time-based splits over historical seasons to avoid leakage.
        </p>
      </section>
    </PageShell>
  );
}
