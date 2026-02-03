import { PageShell } from "../components/PageShell";
import { ModelCarousel } from "../features/models/components/ModelCarousel";
import { DUMMY_MODELS } from "../features/models/data/dummyModels";
import "../features/models/models.css";

export function ModelsPage() {
  return (
    <PageShell title="Models" stageClassName="pageStage--models">
      <div className="modelsPage">
        <header className="modelsHeader">
          <h1>Models</h1>
          <p>Compare forecasting models side-by-side with drag-to-compare and pricing-style detail.</p>
        </header>

        <ModelCarousel models={DUMMY_MODELS} />
      </div>
    </PageShell>
  );
}
