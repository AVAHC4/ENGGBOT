/**
 * AI Client Pre-initialization
 * 
 * This module handles warming up the AI client when the application loads
 * to ensure immediate responsiveness for the first user interaction
 */

// Note: This file intentionally avoids importing the OpenRouter client to prevent
// accidental bundling of secrets into client code. Server routes should import
// and instantiate the client with a server-side API key.

// Global state to track initialization
let isInitialized = false;
let initializationPromise: Promise<void> | null = null;

// Flag to prevent console logs during client creation in development hot reloads
const SUPPRESS_INIT_LOG = true;

// Do NOT construct or export a client instance here.

/**
 * Initialize the AI client by making a simple request
 * This warms up the connection and any server-side resources
 */
export async function initializeAIClient(): Promise<Promise<void>> {
  if (isInitialized || initializationPromise) {
    return initializationPromise || Promise.resolve();
  }

  // No-op warmup on the client; server routes will handle their own warmup.
  initializationPromise = new Promise<void>((resolve) => {
    isInitialized = true;
    resolve();
  });

  return initializationPromise;
}

/**
 * Check if the client has been initialized
 */
export function isClientInitialized(): boolean {
  return isInitialized;
} 