/**
 * AI Client Pre-initialization
 * 
 * This module handles warming up the AI client when the application loads
 * to ensure immediate responsiveness for the first user interaction
 */

import { ChutesClient } from '@/lib/ai/chutes-client';

// Global state to track initialization
let isInitialized = false;
let initializationPromise: Promise<void> | null = null;

// Flag to prevent console logs during client creation in development hot reloads
const SUPPRESS_INIT_LOG = true;

// Create a proxy to the Chutes client to prevent multiple instance creation during hot reloads
let _chutesClientInstance: ChutesClient | null = null;

/**
 * Get the singleton instance of the Chutes client
 */
export function getChutesClient(): ChutesClient {
  if (!_chutesClientInstance) {
    // Save original console.log
    const originalConsoleLog = console.log;
    
    if (SUPPRESS_INIT_LOG) {
      // Temporarily override console.log to suppress the initialization message
      console.log = (...args) => {
        if (typeof args[0] === 'string' && args[0].includes('Initialized Chutes AI client')) {
          // Suppress the initialization log
          return;
        }
        originalConsoleLog(...args);
      };
    }
    
    // Create the instance
    _chutesClientInstance = new ChutesClient({
      defaultModel: "deepseek-ai/DeepSeek-V3-0324"
    });
    
    if (SUPPRESS_INIT_LOG) {
      // Restore console.log
      console.log = originalConsoleLog;
    }
  }
  
  return _chutesClientInstance;
}

// Singleton instance of the AI client (exposed for import)
export const chutesClient = getChutesClient();

/**
 * Initialize the AI client by making a simple request
 * This warms up the connection and any server-side resources
 */
export async function initializeAIClient(): Promise<Promise<void>> {
  if (isInitialized || initializationPromise) {
    return initializationPromise || Promise.resolve();
  }

  console.log("🔄 Pre-initializing Chutes AI client...");
  
  initializationPromise = new Promise<void>(async (resolve) => {
    try {
      // Make a minimal request to warm up the client and connection
      // Use a shorter timeout for initialization
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 20000); // 20 second timeout for initialization
      
      try {
        await chutesClient.generate({
          prompt: "System initialization. Respond with a single word: 'Ready'",
          temperature: 0.1,
          max_tokens: 10
        });
        
        clearTimeout(timeoutId);
        isInitialized = true;
        console.log("✅ Chutes AI client successfully pre-initialized");
      } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          console.warn("⚠️ Chutes AI client initialization timed out, but will continue");
        } else {
          console.error("❌ Error during Chutes AI client initialization:", error);
        }
        // Even if initialization fails, we consider it "done" to avoid repeated attempts
        isInitialized = true;
      }
      
      resolve();
    } catch (error) {
      console.error("❌ Failed to pre-initialize Chutes AI client:", error);
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