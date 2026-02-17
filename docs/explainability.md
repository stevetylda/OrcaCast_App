# Explainability Artifacts

This app uses cached explainability artifacts under:

`artifacts/explainability/{run_id}/{model_id}/{target}/`

The `/explainability` UI reads the same schema from static app data at:

`public/data/explainability/{run_id}/{model_id}/{target}/`

## Files

- `meta.json`
  - `run_id`, `model_id`, `target`, `resolution`, `created_at`
  - `time_min`, `time_max`, `n_total`
  - `units_default` (`logit` or `probability`)
  - `supports_interactions`
  - `feature_schema_version`
- `features.json`
  - `feature_name`, `feature_group`, `display_name`, `unit`, `is_categorical`
- `shap_samples.json`
  - `sample_id`, `time`, `feature_name`, `feature_value`, `shap_value`, `weight`
- `global_importance.json`
  - `feature_name`, `mean_abs_shap`, `mean_shap`, `p95_abs_shap`
- `interaction_ranking.json`
  - `feature_a`, `feature_b`, `mean_abs_interaction`, `rank`
- `interaction_samples.json`
  - `time`, `feature_a`, `value_a`, `feature_b`, `value_b`, `shap_a`, `interaction_value`

JSON is used in this repo for frontend compatibility. Parquet can be added as a parallel output format later.

## Build Command

```bash
python3 -m src.cli explainability build \
  --run-id SRKW_r4_W_19700101_20241231_v_1_0_2 \
  --model-id composite_linear_logit \
  --target srkw_presence \
  --sample-n 50000 \
  --top-k-interactions 50
```

Optional flags:

- `--source-shap-dir` (default `public/data/forecasts/latest/shap`)
- `--output-root` (default `artifacts/explainability`)
- `--resolution` (default `H4`)

## Supported Model Types

- Tree models (XGBoost/LightGBM): supports SHAP interactions when interaction values are provided in artifacts.
- Linear/general models: global SHAP drivers and window/compare are supported; interactions can be disabled via `supports_interactions=false`.

## Performance Notes

- `--sample-n` caps beeswarm long-form rows for frontend performance.
- Build stage uses downsampling stratified by month to preserve seasonal structure.
- Artifacts are cached and loaded by the page; SHAP is not computed on page load.
