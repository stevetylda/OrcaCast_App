import { PageShell } from "../components/PageShell";

export function InsightsPage() {
  return (
    <PageShell title="Insights">
      <section className="pageSection analysisComingSoon">
        <div className="analysisComingSoon__badge">Coming Soon</div>
        <span className="material-symbols-rounded analysisComingSoon__icon" aria-hidden="true">
          insights
        </span>
        <h2>Insights</h2>
        <p>
          We are rebuilding this page with richer diagnostics, model behavior views, and clearer
          uncertainty summaries.
        </p>
      </section>
    </PageShell>
  );
}
