/**
 * DeepSeek AI Client via OpenRouter
 * 
 * TypeScript adaptation for web use
 */

// Model definitions - only DeepSeek R1 0528
export const AVAILABLE_MODELS = {
  "deepseek-r1": "deepseek/deepseek-r1-0528:free"
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
 * Client for interacting with DeepSeek models via OpenRouter
 */
export class ChutesClient {
  private apiKey: string;
  private apiUrl: string;
  private defaultModel: string;
  private headers: Record<string, string>;

  constructor(options?: ChutesClientOptions) {
    this.apiKey = options?.apiKey || DEFAULT_API_KEY;
    this.apiUrl = "https://openrouter.ai/api/v1/chat/completions";
    this.defaultModel = options?.defaultModel || AVAILABLE_MODELS["deepseek-r1"];
    
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
      
      // Prepare the payload
      const payload = {
        "model": modelName,
        "messages": messagePayload,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "stream": stream,
        "route": "fallback"
      };
      
      // Make the API call with increased timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds timeout
      
      try {
        const response = await fetch(this.apiUrl, {
          method: 'POST',
          headers: this.headers,
          body: JSON.stringify(payload),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId); // Clear timeout on successful response
        
        if (!response.ok) {
          const errorText = await response.text().catch(() => "No error details available");
          console.error(`OpenRouter API error (${response.status}): ${errorText}`);
          throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText.substring(0, 200)}`);
        }
        
        const result = await response.json();
        
        if (result.choices && result.choices.length > 0) {
          return result.choices[0].message.content;
        } else {
          return "No content returned from the API.";
        }
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
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
    
    // Prepare the payload
    const payload = {
      "model": modelName,
      "messages": messagePayload,
      "temperature": temperature,
      "max_tokens": max_tokens,
      "stream": true,
      "route": "fallback"
    };
    
    // Make the API call with streaming - with increased timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds timeout
    
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId); // Clear timeout on successful response
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => "No error details available");
        console.error(`OpenRouter API error (${response.status}): ${errorText}`);
        throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText.substring(0, 200)}`);
      }
      
      // Return the raw stream
      return response.body!;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
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