// Client-safe list of available models (no secrets here)
export const AVAILABLE_MODELS = {
  "deepseek-r1": "deepseek/deepseek-r1-0528:free",
} as const;

export type AvailableModelKey = keyof typeof AVAILABLE_MODELS;
