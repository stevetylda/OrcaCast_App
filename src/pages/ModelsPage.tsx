import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { PageShell } from "../components/PageShell";
import { M3Carousel } from "../components/M3Carousel";

type ModelMetricMap = Record<string, number>;

type ModelCardData = {
  id: string;
  name: string;
  short_desc: string;
  long_desc?: string;
  tier: string;
  category: string;
  update_cadence: string;
  run_id: string;
  badges?: string[];
  metrics?: ModelMetricMap;
  front_image_url?: string;
  back_image_url?: string;
  performance_path?: string;
};

const METRIC_LABELS: Record<string, string> = {
  precision_at_k: "Precision@K",
  recall_at_k: "Recall@K",
  ndcg_at_k: "NDCG@K",
  lift_at_k: "Lift@K",
};

const METRIC_PERCENT = new Set(["precision_at_k", "recall_at_k", "ndcg_at_k"]);

function formatMetricValue(key: string, value: number): string {
  if (!Number.isFinite(value)) return "–";
  if (METRIC_PERCENT.has(key)) return `${(value * 100).toFixed(1)}%`;
  return value.toFixed(2);
}

function normalizeTier(tier?: string): "gold" | "silver" | "bronze" | "blue" {
  if (!tier) return "blue";
  const normalized = tier.toLowerCase();
  if (normalized === "gold") return "gold";
  if (normalized === "silver") return "silver";
  if (normalized === "bronze") return "bronze";
  return "blue";
}

/**
 * Performance trick:
 * - Only render metric tiles + images if the card is "hot" (active or near active)
 *   to reduce DOM + layout + paint while scrolling.
 */
function ModelFlipCard({
  model,
  isHot,
}: {
  model: ModelCardData;
  isHot: boolean;
}) {
  const [flipped, setFlipped] = useState(false);

  // Pointer handling to avoid flipping during drag/swipe
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const didDragRef = useRef(false);

  const tier = normalizeTier(model.tier);
  const tierClass = `modelCard modelCard--${tier}${flipped ? " isFlipped" : ""}`;

  const metrics = model.metrics ?? {};
  const metricEntries = useMemo(() => Object.entries(metrics).slice(0, 4), [metrics]);

  const onPointerDown = (event: React.PointerEvent) => {
    didDragRef.current = false;
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
  };

  const onPointerMove = (event: React.PointerEvent) => {
    const start = pointerStartRef.current;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.hypot(dx, dy) > 8) {
      didDragRef.current = true;
    }
  };

  const onPointerUp = () => {
    if (!didDragRef.current) {
      setFlipped((v) => !v);
    }
    pointerStartRef.current = null;
  };

  const onPointerCancel = () => {
    pointerStartRef.current = null;
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setFlipped((v) => !v);
    } else if (event.key === "Escape") {
      setFlipped(false);
    }
  };

  return (
    <div className={tierClass}>
      <div
        className="modelCard__inner"
        role="button"
        tabIndex={0}
        aria-label={`Flip ${model.name} card`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onKeyDown={onKeyDown}
      >
        {/* FRONT */}
        <div className="modelCard__face modelCard__front" aria-hidden={flipped}>
          <div className="modelCard__topRow">
            <div className="modelCard__name">{model.name}</div>
            <div className="modelCard__tierPill">{tier}</div>
          </div>

          <div className="modelCard__desc">{model.short_desc}</div>

          {model.badges && model.badges.length > 0 && (
            <div className="modelCard__badges">
              {model.badges.map((badge) => (
                <span key={badge} className="modelCard__badge">
                  {badge}
                </span>
              ))}
            </div>
          )}

          <div className="modelCard__metaRow">
            <span className="modelCard__tag">{model.category}</span>
            <span className="modelCard__tag">Update: {model.update_cadence}</span>
            <span className="modelCard__tag">Run: {model.run_id}</span>
          </div>

          {/* Only render metrics + images for "hot" cards */}
          {isHot && metricEntries.length > 0 ? (
            <div className="modelCard__metrics">
              {metricEntries.map(([key, value]) => (
                <div key={key} className="modelCard__metric">
                  <div className="modelCard__metricLabel">{METRIC_LABELS[key] ?? key}</div>
                  <div className="modelCard__metricVal">{formatMetricValue(key, value)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="modelCard__metrics modelCard__metrics--skeleton" aria-hidden="true" />
          )}

          {isHot && model.front_image_url ? (
            <div className="modelCard__imageWrap">
              <img
                className="modelCard__image"
                src={model.front_image_url}
                alt={`${model.name} visual`}
                loading="lazy"
              />
            </div>
          ) : (
            <div className="modelCard__imagePlaceholder" />
          )}

          <div className="modelCard__bottomRow">
            <span className="modelCard__hint">Tap anywhere to flip</span>
            <span aria-hidden="true">↻</span>
          </div>
        </div>

        {/* BACK */}
        <div className="modelCard__face modelCard__back" aria-hidden={!flipped}>
          <div className="modelCard__backHeader">
            <div className="modelCard__name">{model.name}</div>
            <div className="modelCard__tierPill">{tier}</div>
          </div>

          <div className="modelCard__longDesc">{model.long_desc ?? model.short_desc}</div>

          {isHot && model.back_image_url ? (
            <div className="modelCard__imageWrap">
              <img
                className="modelCard__image"
                src={model.back_image_url}
                alt={`${model.name} detail`}
                loading="lazy"
              />
            </div>
          ) : null}

          <div className="modelCard__actions">
            {model.performance_path ? (
              <a className="modelCard__linkBtn" href={model.performance_path}>
                View performance
              </a>
            ) : null}
          </div>

          <div className="modelCard__bottomRow">
            <span className="modelCard__hint">Tap anywhere to flip back</span>
            <span aria-hidden="true">↻</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ModelsPage() {
  const [models, setModels] = useState<ModelCardData[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  // Track active index from carousel so we can lazy-render
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setStatus("loading");
    setError(null);

    fetch("/data/model_jsons/models.json", { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load models (${res.status})`);
        return res.json() as Promise<ModelCardData[]>;
      })
      .then((data) => {
        setModels(Array.isArray(data) ? data : []);
        setStatus("ready");
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setStatus("error");
        setError(err instanceof Error ? err.message : "Failed to load models");
      });

    return () => controller.abort();
  }, []);

  const { orderedModels } = useMemo(() => {
    if (models.length === 0) return { orderedModels: [] as ModelCardData[] };
    const current = models.filter((m) => m.category?.toLowerCase() === "current");
    const others = models.filter((m) => m.category?.toLowerCase() !== "current");
    if (current.length === 0) {
      const fallback = [models[0]];
      const rest = models.slice(1);
      return { orderedModels: [...fallback, ...rest] };
    }
    return { orderedModels: [...current, ...others] };
  }, [models]);

  // Find first gold model; fallback to 0
  const initialIndex = useMemo(() => {
    const idx = orderedModels.findIndex((m) => normalizeTier(m.tier) === "gold");
    return idx >= 0 ? idx : 0;
  }, [orderedModels]);

  // When data loads, set activeIndex to initialIndex so hot-render aligns immediately
  useEffect(() => {
    if (status === "ready" && orderedModels.length > 0) {
      setActiveIndex(initialIndex);
    }
  }, [status, orderedModels.length, initialIndex]);

  const handleActiveIndexChange = useCallback((idx: number) => {
    setActiveIndex(idx);
  }, []);

  return (
    <PageShell title="Models" stageClassName="pageStage--models">
      <div className="modelsPage">
        <div className="modelsHeaderRow">
          <h2>Model lineup</h2>
          <div className="modelsHeaderHint">
            Swipe through models. Tap anywhere on a card to flip.
          </div>
        </div>

        {status === "loading" && <div className="modelsState">Loading model cards…</div>}

        {status === "error" && (
          <div className="modelsState modelsState--error">{error ?? "Failed to load models."}</div>
        )}

        {status === "ready" && orderedModels.length > 0 && (
          <M3Carousel
            title="All models"
            hint="Swipe, scroll, or use arrows"
            itemWidth={380}
            activeWidth={460}
            peek={96}
            showDots={false}
            showArrows
            initialIndex={initialIndex}
            centerOnMount
            onActiveIndexChange={handleActiveIndexChange}
          >
            {orderedModels.map((model, idx) => {
              // Hot window: active +- 1 (tuneable)
              const isHot = Math.abs(idx - activeIndex) <= 1;
              return <ModelFlipCard key={model.id} model={model} isHot={isHot} />;
            })}
          </M3Carousel>
        )}
      </div>
    </PageShell>
  );
}
