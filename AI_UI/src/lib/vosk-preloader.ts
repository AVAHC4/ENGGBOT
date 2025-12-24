// Vosk model preloader - loads the speech recognition model in the background
// This should be called after user login so the model is ready when they click the mic

// Model hosted in public folder to avoid CORS issues
const VOSK_MODEL_URL = "/vosk-models/vosk-model-small-en-us-0.15.zip";

// Global state to track model loading
let voskModel: any = null;
let isLoading = false;
let loadPromise: Promise<any> | null = null;

/**
 * Preload the Vosk model in the background.
 * Call this after login to ensure the model is ready when the user clicks the mic.
 * The model is cached by the browser, so subsequent loads are instant.
 */
export async function preloadVoskModel(): Promise<any> {
    // Already loaded
    if (voskModel) {
        console.log("Vosk model already loaded");
        return voskModel;
    }

    // Already loading, return existing promise
    if (isLoading && loadPromise) {
        return loadPromise;
    }

    // Start loading
    isLoading = true;
    console.log("Preloading Vosk model in background...");

    loadPromise = (async () => {
        try {
            // Dynamic import to avoid SSR issues
            const { createModel } = await import("vosk-browser");
            const model = await createModel(VOSK_MODEL_URL);

            voskModel = model;
            console.log("Vosk model preloaded successfully!");
            return model;
        } catch (err) {
            console.error("Failed to preload Vosk model:", err);
            // Don't throw - we'll try again when user clicks mic
            return null;
        } finally {
            isLoading = false;
        }
    })();

    return loadPromise;
}

/**
 * Get the preloaded Vosk model, or null if not yet loaded.
 */
export function getVoskModel(): any {
    return voskModel;
}

/**
 * Check if the Vosk model is currently loading.
 */
export function isVoskModelLoading(): boolean {
    return isLoading;
}

/**
 * Check if the Vosk model has been loaded.
 */
export function isVoskModelLoaded(): boolean {
    return voskModel !== null;
}
