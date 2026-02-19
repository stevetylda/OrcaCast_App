export type ExplainabilityView = "drivers" | "window" | "interactions" | "compare" | "movement";

export type ExplainabilityMeta = {
  run_id: string;
  model_id: string;
  target: string;
  resolution: string;
  created_at: string;
  time_min: string;
  time_max: string;
  n_total: number;
  units_default: "logit" | "probability";
  supports_interactions: boolean;
  feature_schema_version: string;
};

export type ExplainabilityFeature = {
  feature_name: string;
  feature_group: string;
  display_name: string;
  unit?: string;
  is_categorical: boolean;
};

export type ShapSampleRow = {
  sample_id: string;
  time: string;
  feature_name: string;
  feature_value: number | null;
  shap_value: number;
  weight?: number;
};

export type GlobalImportanceRow = {
  feature_name: string;
  mean_abs_shap: number;
  mean_shap: number;
  p95_abs_shap?: number;
};

export type InteractionRankingRow = {
  feature_a: string;
  feature_b: string;
  mean_abs_interaction: number;
  rank: number;
};

export type InteractionSampleRow = {
  time: string;
  feature_a: string;
  value_a: number;
  feature_b: string;
  value_b: number;
  shap_a: number;
  interaction_value?: number;
};

export type ExplainabilityIndexEntry = {
  run_id: string;
  model_id: string;
  target: string;
  label?: string;
};

export type ExplainabilityIndex = {
  default: ExplainabilityIndexEntry;
  contexts: ExplainabilityIndexEntry[];
};

export type DateWindow = {
  start: string;
  end: string;
};

export type CompareRow = {
  feature_name: string;
  a_mean_abs_shap: number;
  b_mean_abs_shap: number;
  delta: number;
};
