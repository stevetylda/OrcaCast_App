import { InteractiveGradientBg } from "../components/InteractiveGradientBg";
import { PageShell } from "../components/PageShell";
import { ModelCarousel } from "../features/models/components/ModelCarousel";
import { DUMMY_MODELS } from "../features/models/data/dummyModels";
import "../features/models/models.css";

export function ModelsPage() {
  return (
    <PageShell title="Models" stageClassName="pageStage--models" fullBleed>
      <div className="modelsPageRoot">
        <InteractiveGradientBg className="modelsPageBg" opacity={0.75} blur={110} />
        <div className="modelsPageContent">
          <div className="modelsPageContainer">
            <header className="modelsHeader">
              <p className="modelsHeader__eyebrow">OrcaCast model catalog</p>
              {/* <h1>Models</h1> */}
              {/* <p>
                Compare forecasting models side-by-side with drag-to-compare interactions and pricing-style detail
                panels.
              </p> */}
            </header>

            <ModelCarousel models={DUMMY_MODELS} />
          </div>
        </div>
      </div>
    </PageShell>
  );
}
