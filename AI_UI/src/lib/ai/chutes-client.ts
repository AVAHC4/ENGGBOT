/**
 * DeepSeek AI Client via Chutes AI
 * 
 * TypeScript adaptation of the Python client for web use
 */

// Model definitions
export const AVAILABLE_MODELS = {
  "deepseek-v3": "deepseek-ai/DeepSeek-V3-0324",
  "deepseek-lite": "deepseek-ai/DeepSeek-Lite",
  "mistral": "mistralai/Mistral-7B-Instruct-v0.2"
};

// Default API key
const DEFAULT_API_KEY = "***REMOVED***";

// Endpoint URLs to try
const API_ENDPOINTS = [
  "https://api.chutes.ai/v1/chat/completions",
  "https://llm.chutes.ai/v1/chat/completions",
  "https://api.deepseek.com/v1/chat/completions"
];

// Check if we're in development mode
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';
const USE_LOCAL_FALLBACK = true; // Set to true to enable local fallbacks in dev mode

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
}

/**
 * Generate a local fallback response when API is unavailable in development
 */
function generateLocalFallbackResponse(messages: Array<{role: string, content: string}>): string {
  // Get the last user message
  const lastUserMessage = messages.filter(m => m.role === 'user').pop();
  
  if (!lastUserMessage) {
    return "I'm having trouble understanding your request. Could you please try again?";
  }
  
  // Extract the user's query
  const query = lastUserMessage.content;
  
  // Generic responses
  const responses = [
    "I understand you're asking about " + query.split(' ').slice(0, 3).join(' ') + "... In local fallback mode, I can only provide generic responses.",
    "This is a local fallback response since the AI API is currently unavailable. Your query was about: " + query.split(' ').slice(0, 5).join(' '),
    "I'm currently operating in fallback mode due to API unavailability. I've received your message about " + query.split(' ').slice(0, 3).join(' '),
    "The API connection is currently unavailable. I'm using local fallback mode to respond to your query about: " + query.split(' ').slice(0, 5).join(' ')
  ];
  
  // Return a random response
  return responses[Math.floor(Math.random() * responses.length)];
}

/**
 * Client for interacting with DeepSeek models via Chutes AI
 */
export class ChutesClient {
  private apiKey: string;
  private apiUrl: string;
  private defaultModel: string;
  private headers: Record<string, string>;
  private apiEndpoints: string[];
  private currentEndpointIndex: number;

  constructor(options?: ChutesClientOptions) {
    this.apiKey = options?.apiKey || DEFAULT_API_KEY;
    this.apiEndpoints = [...API_ENDPOINTS]; // Copy the endpoints array
    this.currentEndpointIndex = 0;
    this.apiUrl = this.apiEndpoints[this.currentEndpointIndex];
    this.defaultModel = options?.defaultModel || AVAILABLE_MODELS["deepseek-v3"];
    
    this.headers = {
      "Authorization": `Bearer ${this.apiKey}`,
      "Content-Type": "application/json"
    };
    
    console.log(`Initialized Chutes AI client with model: ${this.defaultModel}`);
  }
  
  /**
   * Try the next API endpoint
   */
  private tryNextEndpoint(): boolean {
    this.currentEndpointIndex++;
    if (this.currentEndpointIndex < this.apiEndpoints.length) {
      this.apiUrl = this.apiEndpoints[this.currentEndpointIndex];
      console.log(`Switching to API endpoint: ${this.apiUrl}`);
      return true;
    }
    return false;
  }
  
  /**
   * Reset API endpoint to the first one
   */
  private resetEndpoint(): void {
    this.currentEndpointIndex = 0;
    this.apiUrl = this.apiEndpoints[this.currentEndpointIndex];
  }
  
  /**
   * Generate a response from the AI model
   */
  async generate(options: GenerateOptions): Promise<string> {
    try {
      const { prompt, model, temperature = 0.7, max_tokens = 800, thinking_mode = false, messages } = options;
      
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
      
      // If development mode and local fallback is enabled, provide a fake response after a small delay
      if (IS_DEVELOPMENT && USE_LOCAL_FALLBACK) {
        console.log(`🧪 DEV MODE: Using local fallback response instead of calling API`);
        
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve(generateLocalFallbackResponse(messagePayload));
          }, 1000); // Simulate network delay
        });
      }
      
      // Prepare the payload
      const payload = {
        "model": modelName,
        "messages": messagePayload,
        "temperature": temperature,
        "max_tokens": max_tokens
      };
      
      // For debugging
      console.log(`Sending request to ${this.apiUrl} with model: ${modelName}`);
      
      // Make the API call with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      try {
        const response = await fetch(this.apiUrl, {
          method: 'POST',
          headers: this.headers,
          body: JSON.stringify(payload),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          console.error(`API Error: ${response.status} ${response.statusText}`);
          
          // Try next API endpoint if available
          if (this.tryNextEndpoint()) {
            return this.generate(options); // Retry with next endpoint
          }
          
          // Reset endpoint for next request
          this.resetEndpoint();
          
          // In development, return a fallback response if all endpoints fail
          if (IS_DEVELOPMENT && USE_LOCAL_FALLBACK) {
            console.log(`🧪 DEV MODE: All API endpoints failed, using local fallback response`);
            return generateLocalFallbackResponse(messagePayload);
          }
          
          throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();
        
        // Reset endpoint index for next successful request
        this.resetEndpoint();
        
        if (result.choices && result.choices.length > 0) {
          return result.choices[0].message.content;
        } else {
          return "No content returned from the API.";
        }
      } catch (fetchError: unknown) {
        clearTimeout(timeoutId);
        
        // Network error - try next endpoint
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          console.error("Request timed out");
          
          // Try next API endpoint if available
          if (this.tryNextEndpoint()) {
            return this.generate(options); // Retry with next endpoint
          }
          
          // Reset endpoint for next request
          this.resetEndpoint();
          
          // In development, return a fallback response
          if (IS_DEVELOPMENT && USE_LOCAL_FALLBACK) {
            console.log(`🧪 DEV MODE: Request timed out, using local fallback response`);
            return generateLocalFallbackResponse(messagePayload);
          }
          
          return "Error: Request timed out. Please try again later.";
        }
        
        // Try next API endpoint if available
        if (this.tryNextEndpoint()) {
          return this.generate(options); // Retry with next endpoint
        }
        
        // Reset endpoint for next request
        this.resetEndpoint();
        
        // In development, return a fallback response
        if (IS_DEVELOPMENT && USE_LOCAL_FALLBACK) {
          console.log(`🧪 DEV MODE: Fetch error, using local fallback response`);
          return generateLocalFallbackResponse(messagePayload);
        }
        
        throw fetchError;
      }
    } catch (error) {
      console.error("Error generating AI response:", error);
      
      // In development, provide a fallback response
      if (IS_DEVELOPMENT && USE_LOCAL_FALLBACK) {
        console.log(`🧪 DEV MODE: Error caught, using local fallback response`);
        return generateLocalFallbackResponse(options.messages || [{"role": "user", "content": options.prompt}]);
      }
      
      return `Error: ${error instanceof Error ? error.message : String(error)}. Please check your network connection and try again.`;
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