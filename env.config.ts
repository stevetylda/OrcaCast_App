export const envConfig = {
  ENABLE_VIEWABILITY: true,
  ENABLE_EXPLAINABILITY: true,
  ENABLE_MODELS: false,
  ENABLE_DATA: true,
} as const satisfies Record<string, boolean>;
