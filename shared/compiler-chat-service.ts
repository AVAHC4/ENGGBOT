// Compiler-Chat communication service
// This service facilitates communication between the compiler and chat components

type CompilerOutput = {
  code: string;
  language: string;
  output: string;
  timestamp: Date;
};

class CompilerChatService {
  private static instance: CompilerChatService;
  private listeners: ((data: CompilerOutput) => void)[] = [];
  private lastOutput: CompilerOutput | null = null;

  private constructor() {}

  static getInstance(): CompilerChatService {
    if (!CompilerChatService.instance) {
      CompilerChatService.instance = new CompilerChatService();
    }
    return CompilerChatService.instance;
  }

  // Send compiler output to the chat interface
  sendOutputToChat(code: string, language: string, output: string): void {
    const compilerOutput: CompilerOutput = {
      code,
      language,
      output,
      timestamp: new Date(),
    };
    
    this.lastOutput = compilerOutput;
    this.notifyListeners(compilerOutput);
  }

  // Get the last compiler output
  getLastOutput(): CompilerOutput | null {
    return this.lastOutput;
  }

  // Subscribe to compiler output events
  subscribeToOutput(callback: (data: CompilerOutput) => void): () => void {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  // Notify all listeners about new compiler output
  private notifyListeners(data: CompilerOutput): void {
    this.listeners.forEach(listener => listener(data));
  }
}

export default CompilerChatService.getInstance();
