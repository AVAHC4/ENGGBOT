"use client";

import { useState, useRef, useCallback, useEffect } from "react";

// Vosk model URL - using a small English model for faster loading
const VOSK_MODEL_URL = "https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip";

interface UseVoskSpeechRecognitionOptions {
    onResult?: (text: string, isFinal: boolean) => void;
    onError?: (error: string) => void;
    onStatusChange?: (status: VoskStatus) => void;
}

export type VoskStatus = "idle" | "loading-model" | "ready" | "recording" | "error";

export function useVoskSpeechRecognition(options: UseVoskSpeechRecognitionOptions = {}) {
    const { onResult, onError, onStatusChange } = options;

    const [status, setStatus] = useState<VoskStatus>("idle");
    const [isModelLoaded, setIsModelLoaded] = useState(false);
    const [transcript, setTranscript] = useState("");

    const modelRef = useRef<any>(null);
    const recognizerRef = useRef<any>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);

    const updateStatus = useCallback((newStatus: VoskStatus) => {
        setStatus(newStatus);
        onStatusChange?.(newStatus);
    }, [onStatusChange]);

    // Load Vosk model
    const loadModel = useCallback(async () => {
        if (modelRef.current || status === "loading-model") return;

        try {
            updateStatus("loading-model");

            // Dynamic import to avoid SSR issues
            const { createModel } = await import("vosk-browser");

            console.log("Loading Vosk model from:", VOSK_MODEL_URL);
            const model = await createModel(VOSK_MODEL_URL);
            modelRef.current = model;
            setIsModelLoaded(true);
            updateStatus("ready");
            console.log("Vosk model loaded successfully!");

            return model;
        } catch (err: any) {
            console.error("Failed to load Vosk model:", err);
            updateStatus("error");
            onError?.(`Failed to load speech model: ${err.message}`);
            return null;
        }
    }, [status, updateStatus, onError]);

    // Start recording
    const startRecording = useCallback(async () => {
        try {
            // Ensure model is loaded
            let model = modelRef.current;
            if (!model) {
                model = await loadModel();
                if (!model) return;
            }

            // Get microphone access
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 16000,
                },
            });
            mediaStreamRef.current = stream;

            // Create audio context
            const audioContext = new AudioContext({ sampleRate: 16000 });
            audioContextRef.current = audioContext;

            // Create recognizer
            const recognizer = new model.KaldiRecognizer(16000);
            recognizerRef.current = recognizer;

            // Handle recognition results
            recognizer.on("result", (message: any) => {
                const result = message.result;
                if (result?.text) {
                    setTranscript((prev) => prev + " " + result.text);
                    onResult?.(result.text, true);
                }
            });

            recognizer.on("partialresult", (message: any) => {
                const partial = message.result?.partial;
                if (partial) {
                    onResult?.(partial, false);
                }
            });

            // Create audio processing pipeline
            const source = audioContext.createMediaStreamSource(stream);
            const processor = audioContext.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            processor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                // Convert Float32Array to Int16Array for Vosk
                const int16Data = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) {
                    int16Data[i] = Math.max(-32768, Math.min(32767, Math.floor(inputData[i] * 32768)));
                }
                recognizer.acceptWaveform(int16Data);
            };

            source.connect(processor);
            processor.connect(audioContext.destination);

            updateStatus("recording");
            console.log("Vosk recording started");
        } catch (err: any) {
            console.error("Failed to start recording:", err);
            updateStatus("error");
            if (err.name === "NotAllowedError") {
                onError?.("Microphone permission denied. Please allow microphone access.");
            } else {
                onError?.(`Failed to start recording: ${err.message}`);
            }
        }
    }, [loadModel, updateStatus, onResult, onError]);

    // Stop recording
    const stopRecording = useCallback(() => {
        try {
            // Stop processor
            if (processorRef.current) {
                processorRef.current.disconnect();
                processorRef.current = null;
            }

            // Close audio context
            if (audioContextRef.current) {
                audioContextRef.current.close();
                audioContextRef.current = null;
            }

            // Stop media stream
            if (mediaStreamRef.current) {
                mediaStreamRef.current.getTracks().forEach((track) => track.stop());
                mediaStreamRef.current = null;
            }

            // Get final result from recognizer
            if (recognizerRef.current) {
                recognizerRef.current.remove();
                recognizerRef.current = null;
            }

            updateStatus(isModelLoaded ? "ready" : "idle");
            console.log("Vosk recording stopped");
        } catch (err) {
            console.error("Error stopping recording:", err);
        }
    }, [isModelLoaded, updateStatus]);

    // Toggle recording
    const toggleRecording = useCallback(async () => {
        if (status === "recording") {
            stopRecording();
        } else {
            await startRecording();
        }
    }, [status, startRecording, stopRecording]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopRecording();
            if (modelRef.current) {
                modelRef.current.terminate();
                modelRef.current = null;
            }
        };
    }, [stopRecording]);

    return {
        status,
        isModelLoaded,
        isRecording: status === "recording",
        isLoading: status === "loading-model",
        transcript,
        loadModel,
        startRecording,
        stopRecording,
        toggleRecording,
        clearTranscript: () => setTranscript(""),
    };
}
