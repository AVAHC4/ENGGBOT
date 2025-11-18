/**
 * OpenRouter client with Z.AI GLM defaults
 * 
 * TypeScript adaptation for web use
 */

// Model definitions – prioritize the GLM 4.5 Air free tier with nearby fallbacks.
// Legacy DeepSeek keys are kept as aliases so previously compiled code paths keep working.
export const AVAILABLE_MODELS = {
  "zai-glm-4.5-air-free": "z-ai/glm-4.5-air:free",
  "zai-glm-4.5-air": "z-ai/glm-4.5-air",
  "zai-glm-4.5": "z-ai/glm-4.5",
  "zai-glm-4.5v": "z-ai/glm-4.5v",
  // Legacy aliases
  "deepseek-v3.1": "z-ai/glm-4.5-air:free",
  "deepseek-v3": "z-ai/glm-4.5",
  "deepseek-r1": "z-ai/glm-4.5v"
};

// Default API key
const DEFAULT_API_KEY = "***REMOVED***";

// Client interface
interface ChutesClientOptions {
  apiKey?: string;
  defaultModel?: string;
}

// Generate options interface
interface GenerateOptions {
  prompt: string;
  model?: string;
  temperature?: number;
  max_tokens?: number;
  thinking_mode?: boolean;
  messages?: Array<{role: string, content: string}>;
  stream?: boolean;
}

/**
 * Client for interacting with OpenRouter models (defaulting to Z.AI GLM 4.5 Air)
 */
export class ChutesClient {
  private apiKey: string;
  private apiUrl: string;
  private defaultModel: string;
  private headers: Record<string, string>;

  constructor(options?: ChutesClientOptions) {
    this.apiKey = options?.apiKey || DEFAULT_API_KEY;
    this.apiUrl = "https://openrouter.ai/api/v1/chat/completions";
    this.defaultModel = options?.defaultModel || AVAILABLE_MODELS["zai-glm-4.5-air-free"];
    
    this.headers = {
      "Authorization": `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:3001",
      "X-Title": "AI UI Demo"
    };
    
    console.log(`Initialized OpenRouter client with model: ${this.defaultModel}`);
  }
  
  /**
   * Generate a response from the AI model
   */
  async generate(options: GenerateOptions): Promise<string> {
    try {
      const { prompt, model, temperature = 0.5, max_tokens = 8000, thinking_mode = false, messages, stream = false } = options;
      
      // Use model or default
      const modelName = model || this.defaultModel;
      const fallbacks: string[] = [
        modelName,
        AVAILABLE_MODELS["zai-glm-4.5-air"],
        AVAILABLE_MODELS["zai-glm-4.5"],
        AVAILABLE_MODELS["zai-glm-4.5v"],
      ].filter(Boolean) as string[];
      
      // Determine whether to use messages array or prompt
      let messagePayload;
      if (messages && messages.length > 0) {
        // Use provided messages array
        messagePayload = messages;
      } else {
        // Modify prompt to encourage thinking if thinking_mode is enabled
        let actualPrompt = prompt;
        if (thinking_mode) {
          if (prompt.includes("?")) {
            actualPrompt = prompt + " Please think step by step and show your reasoning process.";
          } else {
            actualPrompt = prompt + " Please think step by step and explain your thought process.";
          }
        }
        
        // Use single message with prompt
        messagePayload = [{"role": "user", "content": actualPrompt}];
      }
      
      // Try primary + fallback models
      let lastError: any = null;
      for (const attemptModel of fallbacks) {
        // Prepare the payload per attempt
        const payload = {
          "model": attemptModel,
          "messages": messagePayload,
          "temperature": temperature,
          "max_tokens": max_tokens,
          "stream": stream,
          "route": "fallback"
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        try {
          const response = await fetch(this.apiUrl, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify(payload),
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            const errorText = await response.text().catch(() => "No error details available");
            console.warn(`OpenRouter API error for model ${attemptModel} (${response.status}): ${errorText}`);
            lastError = new Error(`API Error: ${response.status} ${response.statusText} - ${errorText.substring(0, 200)}`);
            // Try next fallback if available
            continue;
          }

          const result = await response.json();
          if (result.choices && result.choices.length > 0) {
            return result.choices[0].message.content;
          } else {
            return "No content returned from the API.";
          }
        } catch (err) {
          clearTimeout(timeoutId);
          lastError = err;
          // Try next fallback
          continue;
        }
      }

      // If we got here, all attempts failed
      throw lastError || new Error("All model attempts failed");
    } catch (error) {
      console.error("Error generating AI response:", error);
      return `Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  /**
   * Generate a streaming response from the AI model
   */
  async generateStream(options: GenerateOptions): Promise<ReadableStream> {
    const { prompt, model, temperature = 0.5, max_tokens = 8000, thinking_mode = false, messages } = options;
    
    // Use model or default
    const modelName = model || this.defaultModel;
    const fallbacks: string[] = [
      modelName,
      AVAILABLE_MODELS["zai-glm-4.5-air"],
      AVAILABLE_MODELS["zai-glm-4.5"],
      AVAILABLE_MODELS["zai-glm-4.5v"],
    ].filter(Boolean) as string[];
    
    // Determine whether to use messages array or prompt
    let messagePayload;
    if (messages && messages.length > 0) {
      // Use provided messages array
      messagePayload = messages;
    } else {
      // Modify prompt to encourage thinking if thinking_mode is enabled
      let actualPrompt = prompt;
      if (thinking_mode) {
        if (prompt.includes("?")) {
          actualPrompt = prompt + " Please think step by step and show your reasoning process.";
        } else {
          actualPrompt = prompt + " Please think step by step and explain your thought process.";
        }
      }
      
      // Use single message with prompt
      messagePayload = [{"role": "user", "content": actualPrompt}];
    }
    
    // Try primary + fallback models for streaming
    let lastError: any = null;
    for (const attemptModel of fallbacks) {
      const payload = {
        "model": attemptModel,
        "messages": messagePayload,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "stream": true,
        "route": "fallback"
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      try {
        const response = await fetch(this.apiUrl, {
          method: 'POST',
          headers: this.headers,
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text().catch(() => "No error details available");
          console.warn(`OpenRouter API error for model ${attemptModel} (${response.status}): ${errorText}`);
          lastError = new Error(`API Error: ${response.status} ${response.statusText} - ${errorText.substring(0, 200)}`);
          continue;
        }

        // Return the raw stream
        return response.body!;
      } catch (err) {
        clearTimeout(timeoutId);
        lastError = err;
        continue;
      }
    }

    // All attempts failed
    throw lastError || new Error("All model attempts failed");
  }
  
  /**
   * Switch to a different model
   */
  switchModel(modelKey: string): boolean {
    if (modelKey in AVAILABLE_MODELS) {
      this.defaultModel = AVAILABLE_MODELS[modelKey as keyof typeof AVAILABLE_MODELS];
      console.log(`Switched to model: ${this.defaultModel}`);
      return true;
    } else {
      console.log(`Model key '${modelKey}' not found. Available keys: ${Object.keys(AVAILABLE_MODELS)}`);
      return false;
    }
  }
  
  /**
   * Get a list of available models
   */
  listModels(): Record<string, string> {
    return AVAILABLE_MODELS;
  }
} 
