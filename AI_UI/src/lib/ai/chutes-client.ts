/**
 * DeepSeek AI Client via OpenRouter
 *
 * Server-only client. Do NOT import this from client-side code.
 */
import 'server-only';

// Default model used if none is provided by callers
const DEFAULT_MODEL = "deepseek/deepseek-r1-0528:free";

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
    // Read API key from environment. Never ship a default key in code.
    const envKey = process.env.OPENROUTER_API_KEY || process.env.CHUTES_API_KEY;
    if (!options?.apiKey && !envKey) {
      throw new Error("Missing OPENROUTER_API_KEY (or CHUTES_API_KEY) environment variable.");
    }
    this.apiKey = options?.apiKey || envKey!;
    this.apiUrl = "https://openrouter.ai/api/v1/chat/completions";
    this.defaultModel = options?.defaultModel || DEFAULT_MODEL;
    
    // Build headers. OpenRouter recommends HTTP-Referer and X-Title.
    const referer = process.env.CLIENT_URL
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
    const appTitle = process.env.APP_TITLE || 'ENGGBOT';

    this.headers = {
      "Authorization": `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": referer,
      "X-Title": appTitle
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
} 