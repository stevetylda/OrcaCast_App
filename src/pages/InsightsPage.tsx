import { AnalysisShell } from "../features/analysis/components/AnalysisShell";
import { PageShell } from "../components/PageShell";
import "../features/analysis/analysis.css";

export function InsightsPage() {
  return (
    <PageShell title="Insights / Analysis">
      <section className="pageSection insightsPage">
        <AnalysisShell />
      </section>
    </PageShell>
  );
}
