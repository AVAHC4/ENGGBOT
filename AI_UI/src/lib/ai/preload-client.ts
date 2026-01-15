 

import { OpenRouterClient, AVAILABLE_MODELS } from '@/lib/ai/openrouter-client';

 
let isInitialized = false;
let initializationPromise: Promise<void> | null = null;

 
const SUPPRESS_INIT_LOG = true;

 
let _openRouterClientInstance: OpenRouterClient | null = null;

 
export function getOpenRouterClient(): OpenRouterClient {
  if (!_openRouterClientInstance) {
     
    const originalConsoleLog = console.log;

    if (SUPPRESS_INIT_LOG) {
       
      console.log = (...args) => {
        if (typeof args[0] === 'string' && args[0].includes('Initialized OpenRouter client')) {
           
          return;
        }
        originalConsoleLog(...args);
      };
    }

     
    _openRouterClientInstance = new OpenRouterClient({
      defaultModel: AVAILABLE_MODELS["gpt-oss"]
    });

    if (SUPPRESS_INIT_LOG) {
       
      console.log = originalConsoleLog;
    }
  }

  return _openRouterClientInstance;
}

 
export const openRouterClient = getOpenRouterClient();

 
export async function initializeAIClient(): Promise<Promise<void>> {
  if (isInitialized || initializationPromise) {
    return initializationPromise || Promise.resolve();
  }

  console.log("🔄 Pre-initializing OpenRouter AI client...");

  initializationPromise = new Promise<void>(async (resolve) => {
    try {
       
      await openRouterClient.generate({
        prompt: "System initialization. Respond with a single word: 'Ready'",
        temperature: 0.1,
        max_tokens: 10
      });

      isInitialized = true;
      console.log("✅ OpenRouter AI client successfully pre-initialized");
      resolve();
    } catch (error) {
      console.error("❌ Failed to pre-initialize OpenRouter AI client:", error);
       
      isInitialized = true;
      resolve();
    }
  });

  return initializationPromise;
}

 
export function isClientInitialized(): boolean {
  return isInitialized;
}