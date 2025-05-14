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
let initializationAttempts = 0;
const MAX_INIT_ATTEMPTS = 2;

// Check if we're in development mode
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';

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
  // If already initialized or in the process of initializing, return the existing promise
  if (isInitialized) {
    return Promise.resolve();
  }
  
  if (initializationPromise) {
    return initializationPromise;
  }

  console.log("🔄 Pre-initializing Chutes AI client...");
  
  // In development mode, we can skip the real initialization and just mark as initialized
  if (IS_DEVELOPMENT) {
    console.log("🧪 DEV MODE: Skipping actual API initialization, using local fallback mode");
    isInitialized = true;
    return Promise.resolve();
  }
  
  initializationPromise = new Promise<void>(async (resolve) => {
    try {
      // Make a minimal request to warm up the client and connection
      // with a shorter timeout for initialization
      const response = await chutesClient.generate({
        prompt: "System initialization. Respond with a single word: 'Ready'",
        temperature: 0.1,
        max_tokens: 5
      });
      
      // Check if the response indicates an error
      if (response.startsWith('Error:')) {
        throw new Error(response);
      }
      
      isInitialized = true;
      console.log("✅ Chutes AI client successfully pre-initialized");
      resolve();
    } catch (error) {
      console.error("❌ Failed to pre-initialize Chutes AI client:", error);
      
      initializationAttempts++;
      
      if (initializationAttempts < MAX_INIT_ATTEMPTS) {
        console.log(`Retrying initialization (attempt ${initializationAttempts+1}/${MAX_INIT_ATTEMPTS})...`);
        // Reset the promise to allow retrying
        initializationPromise = null;
        
        // Wait a bit before retrying
        setTimeout(() => {
          initializeAIClient()
            .then(() => resolve())
            .catch(() => {
              // Consider it initialized even if it fails after retries
              isInitialized = true;
              resolve();
            });
        }, 2000);
      } else {
        // Even if initialization fails after all attempts, we consider it "done" to avoid further attempts
        console.error("⛔ Failed to initialize Chutes AI client after multiple attempts");
        isInitialized = true;
        resolve();
      }
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