import unittest

from src.explainability.builder import merge_symmetric_interactions, validate_artifact_schema


class ExplainabilityBuilderTests(unittest.TestCase):
    def test_schema_validation(self) -> None:
        artifacts = {
            "meta": {
                "run_id": "run",
                "model_id": "model",
                "target": "target",
                "time_min": "2025-01-01",
                "time_max": "2025-12-31",
                "n_total": 12,
            },
            "features": [{"feature_name": "f1"}],
            "shap_samples": [
                {
                    "sample_id": "s1",
                    "time": "2025-01-01",
                    "feature_name": "f1",
                    "shap_value": 0.1,
                }
            ],
            "global_importance": [{"feature_name": "f1", "mean_abs_shap": 0.1, "mean_shap": 0.1}],
        }
        validate_artifact_schema(artifacts)

    def test_schema_validation_missing_field(self) -> None:
        artifacts = {
            "meta": {"run_id": "run"},
            "features": [],
            "shap_samples": [],
            "global_importance": [],
        }
        with self.assertRaises(ValueError):
            validate_artifact_schema(artifacts)

    def test_interaction_symmetric_merge(self) -> None:
        rows = [
            {"feature_a": "a", "feature_b": "b", "mean_abs_interaction": 0.5},
            {"feature_a": "b", "feature_b": "a", "mean_abs_interaction": 0.1},
            {"feature_a": "a", "feature_b": "c", "mean_abs_interaction": 0.2},
        ]
        merged = merge_symmetric_interactions(rows)
        self.assertEqual(len(merged), 2)
        first = merged[0]
        self.assertEqual(first["feature_a"], "a")
        self.assertEqual(first["feature_b"], "b")
        self.assertAlmostEqual(first["mean_abs_interaction"], 0.3)


if __name__ == "__main__":
    unittest.main()
