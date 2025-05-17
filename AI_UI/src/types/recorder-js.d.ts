declare module 'recorder-js' {
  export default class Recorder {
    constructor(context: AudioContext, config?: any);
    init(stream: MediaStream): Promise<void>;
    start(): void;
    stop(): Promise<{ blob: Blob; buffer: Float32Array[] }>;
    // Add more methods if you use them
  }
} 