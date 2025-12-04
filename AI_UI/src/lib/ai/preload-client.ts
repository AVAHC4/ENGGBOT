/**
 * AI Client Pre-initialization
 * 
 * This module handles warming up the AI client when the application loads
 * to ensure immediate responsiveness for the first user interaction
 */

import { OpenRouterClient, AVAILABLE_MODELS } from '@/lib/ai/openrouter-client';

// Global state to track initialization
let isInitialized = false;
let initializationPromise: Promise<void> | null = null;

// Flag to prevent console logs during client creation in development hot reloads
const SUPPRESS_INIT_LOG = true;

// Create a proxy to the OpenRouter client to prevent multiple instance creation during hot reloads
let _openRouterClientInstance: OpenRouterClient | null = null;

/**
 * Get the singleton instance of the OpenRouter client
 */
export function getOpenRouterClient(): OpenRouterClient {
  if (!_openRouterClientInstance) {
    // Save original console.log
    const originalConsoleLog = console.log;

    if (SUPPRESS_INIT_LOG) {
      // Temporarily override console.log to suppress the initialization message
      console.log = (...args) => {
        if (typeof args[0] === 'string' && args[0].includes('Initialized OpenRouter client')) {
          // Suppress the initialization log
          return;
        }
        originalConsoleLog(...args);
      };
    }

    // Create the instance
    _openRouterClientInstance = new OpenRouterClient({
      defaultModel: AVAILABLE_MODELS["glm-4.5"]
    });

    if (SUPPRESS_INIT_LOG) {
      // Restore console.log
      console.log = originalConsoleLog;
    }
  }

  return _openRouterClientInstance;
}

// Singleton instance of the AI client (exposed for import)
export const openRouterClient = getOpenRouterClient();

/**
 * Initialize the AI client by making a simple request
 * This warms up the connection and any server-side resources
 */
export async function initializeAIClient(): Promise<Promise<void>> {
  if (isInitialized || initializationPromise) {
    return initializationPromise || Promise.resolve();
  }

  console.log("🔄 Pre-initializing OpenRouter AI client...");

  initializationPromise = new Promise<void>(async (resolve) => {
    try {
      // Make a minimal request to warm up the client and connection
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
      // Even if initialization fails, we consider it "done" to avoid repeated attempts
      isInitialized = true;
      resolve();
    }
  });

  return initializationPromise;
}

/**
 * Check if the client has been initialized
 */
export function isClientInitialized(): boolean {
  return isInitialized;
}