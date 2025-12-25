// Whisper.js preloader using Transformers.js
// Uses dynamic imports to avoid SSR bundling issues with onnxruntime-node
// Model: whisper-tiny.en (~40MB) for fast loading, good accuracy for English

// Model to use - tiny.en is fast and accurate for English
const WHISPER_MODEL = "Xenova/whisper-tiny.en";

// Global state
let whisperPipeline: any = null;
let isLoading = false;
let loadPromise: Promise<any> | null = null;

/**
 * Dynamically import Transformers.js (client-side only)
 */
async function getTransformers() {
    // Dynamic import to avoid SSR bundling issues
    const { pipeline, env } = await import("@xenova/transformers");

    // Configure Transformers.js
    env.allowLocalModels = false;
    env.useBrowserCache = true;

    return { pipeline, env };
}

/**
 * Preload the Whisper model in the background.
 * Uses WebGPU if available, otherwise falls back to WASM/CPU.
 * This should only be called on the client side.
 */
export async function preloadWhisperModel(): Promise<any> {
    // Only run on client side
    if (typeof window === "undefined") {
        console.log("Whisper preload skipped - server side");
        return null;
    }

    if (whisperPipeline) {
        console.log("Whisper model already loaded");
        return whisperPipeline;
    }

    if (isLoading && loadPromise) {
        return loadPromise;
    }

    isLoading = true;
    console.log("Preloading Whisper model in background...");

    loadPromise = (async () => {
        try {
            const { pipeline } = await getTransformers();

            // Check for WebGPU support
            const hasWebGPU = "gpu" in navigator;
            console.log(`WebGPU ${hasWebGPU ? "available" : "not available"} - using ${hasWebGPU ? "GPU" : "CPU/WASM"}`);

            // Create the speech recognition pipeline
            whisperPipeline = await pipeline(
                "automatic-speech-recognition",
                WHISPER_MODEL,
                {
                    progress_callback: (progress: any) => {
                        if (progress.status === "progress") {
                            const percent = Math.round(progress.progress);
                            console.log(`Loading Whisper: ${percent}%`);
                            // Dispatch custom event for UI updates
                            if (typeof window !== "undefined") {
                                window.dispatchEvent(new CustomEvent("whisper-progress", { detail: { percent } }));
                            }
                        }
                    },
                }
            );

            console.log("Whisper model loaded successfully!");
            if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("whisper-loaded"));
            }
            return whisperPipeline;
        } catch (err) {
            console.error("Failed to preload Whisper model:", err);
            whisperPipeline = null;
            return null;
        } finally {
            isLoading = false;
        }
    })();

    return loadPromise;
}

/**
 * Get the preloaded Whisper pipeline, or null if not yet loaded.
 */
export function getWhisperPipeline(): any {
    return whisperPipeline;
}

/**
 * Check if the Whisper model is currently loading.
 */
export function isWhisperModelLoading(): boolean {
    return isLoading;
}

/**
 * Check if the Whisper model has been loaded.
 */
export function isWhisperModelLoaded(): boolean {
    return whisperPipeline !== null;
}

/**
 * Transcribe audio using Whisper.
 * @param audioData Float32Array of audio samples at 16kHz
 * @returns Transcribed text
 */
export async function transcribeAudio(audioData: Float32Array): Promise<string> {
    if (!whisperPipeline) {
        await preloadWhisperModel();
        if (!whisperPipeline) {
            throw new Error("Failed to load Whisper model");
        }
    }

    const result = await whisperPipeline(audioData, {
        chunk_length_s: 30,
        stride_length_s: 5,
        return_timestamps: false,
    });

    return result.text || "";
}
