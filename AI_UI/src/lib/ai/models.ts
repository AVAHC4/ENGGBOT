// Client-safe model map. No secrets here.
export const AVAILABLE_MODELS = {
  "deepseek-r1": "deepseek/deepseek-r1-0528:free",
  "deepseek-v3": "deepseek/deepseek-chat:free",
  "deepseek-v3.1": "deepseek/deepseek-chat-v3.1:free",
  "gpt-oss-120b": "openai/gpt-oss-120b:free",
} as const;
