 
 
 

 
const WHISPER_MODEL = "Xenova/whisper-tiny.en";

 
let whisperPipeline: any = null;
let isLoading = false;
let loadPromise: Promise<any> | null = null;

 
async function getTransformers() {
     
    const { pipeline, env } = await import("@xenova/transformers");

     
    env.allowLocalModels = false;
    env.useBrowserCache = true;

    return { pipeline, env };
}

 
export async function preloadWhisperModel(): Promise<any> {
     
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

             
            const hasWebGPU = "gpu" in navigator;
            console.log(`WebGPU ${hasWebGPU ? "available" : "not available"} - using ${hasWebGPU ? "GPU" : "CPU/WASM"}`);

             
            whisperPipeline = await pipeline(
                "automatic-speech-recognition",
                WHISPER_MODEL,
                {
                    progress_callback: (progress: any) => {
                        if (progress.status === "progress") {
                            const percent = Math.round(progress.progress);
                            console.log(`Loading Whisper: ${percent}%`);
                             
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

 
export function getWhisperPipeline(): any {
    return whisperPipeline;
}

 
export function isWhisperModelLoading(): boolean {
    return isLoading;
}

 
export function isWhisperModelLoaded(): boolean {
    return whisperPipeline !== null;
}

 
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
