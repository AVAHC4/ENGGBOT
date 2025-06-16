/**
 * DeepSeek AI Client via Chutes AI
 * 
 * TypeScript adaptation of the Python client for web use
 */

// Model definitions
export const AVAILABLE_MODELS = {
  "deepseek-r1": "deepseek-ai/DeepSeek-R1-0528",
  "deepseek-v3": "deepseek-ai/DeepSeek-V3-0324",
  "deepseek-lite": "deepseek-ai/DeepSeek-Lite",
  "mistral": "mistralai/Mistral-7B-Instruct-v0.2"
};

// Default API key
const DEFAULT_API_KEY = "***REMOVED***";

// Client interface
export interface ChutesClientOptions {
  apiKey?: string;
  defaultModel?: string;
}

export interface GenerateOptions {
  prompt: string;
  model?: string;
  temperature?: number;
  max_tokens?: number;
  thinking_mode?: boolean;
  messages?: Array<{role: string, content: string}>;
  stream?: boolean;
}

/**
 * Client for interacting with DeepSeek models via Chutes AI
 */
export class ChutesClient {
  private apiKey: string;
  private apiUrl: string;
  private defaultModel: string;
  private headers: Record<string, string>;

  constructor(options?: ChutesClientOptions) {
    this.apiKey = options?.apiKey || DEFAULT_API_KEY;
    this.apiUrl = "https://llm.chutes.ai/v1/chat/completions";
    this.defaultModel = options?.defaultModel || AVAILABLE_MODELS["deepseek-r1"];
    
    this.headers = {
      "Authorization": `Bearer ${this.apiKey}`,
      "Content-Type": "application/json"
    };
    
    console.log(`Initialized Chutes AI client with model: ${this.defaultModel}`);
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
        "stream": stream
      };
      
      // Add timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, thinking_mode ? 60000 : 30000); // 60 seconds for thinking mode, 30 seconds otherwise
      
      try {
        // Make the API call
        const response = await fetch(this.apiUrl, {
          method: 'POST',
          headers: this.headers,
          body: JSON.stringify(payload),
          signal: controller.signal
        }).finally(() => {
          clearTimeout(timeoutId);
        });
        
        if (!response.ok) {
          throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.choices && result.choices.length > 0) {
          return result.choices[0].message.content;
        } else {
          return "No content returned from the API.";
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          return `Error: Request timed out. ${thinking_mode ? 'Thinking mode requires more processing time. Try again or use regular mode.' : 'Try again later.'}`;
        }
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
      "stream": true
    };
    
    try {
      // Make the API call with streaming
      // Increase timeout for thinking mode which requires more processing time
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, thinking_mode ? 60000 : 30000); // 60 seconds for thinking mode, 30 seconds otherwise
      
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(payload),
        signal: controller.signal
      }).finally(() => {
        clearTimeout(timeoutId);
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      // Return the raw stream
      return response.body!;
    } catch (error: any) {
      console.error("Error in generateStream:", error);
      if (error.name === 'AbortError') {
        throw new Error(`Request timed out. ${thinking_mode ? 'Thinking mode requires more processing time. Try again or use regular mode.' : 'Try again later.'}`);
      }
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