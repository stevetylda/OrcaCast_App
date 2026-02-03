import { InsightsFolderTabs } from "../components/InsightsFolderTabs";
import { PageShell } from "../components/PageShell";
import "../styles/insights.css";

export function InsightsPage() {
  return (
    <PageShell title="Insights / Analysis">
      <section className="pageSection insightsPage">
        <header className="insightsPage__header">
          <h2>Insights / Analysis</h2>
          <p>
            Analysis wedges summarize temporal patterns, persistence, and reporting context so we can
            compare signal drivers at a glance.
          </p>
        </header>
        <InsightsFolderTabs />
      </section>
    </PageShell>
  );
}
