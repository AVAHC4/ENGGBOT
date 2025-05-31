// Compiler-Chat communication service
// This service facilitates communication between the compiler and chat components

type CompilerOutput = {
  code: string;
  language: string;
  output: string;
  timestamp: Date;
  toInputField?: boolean; // New flag to indicate if output should go to input field
};

class CompilerChatService {
  private static instance: CompilerChatService;
  private listeners: ((data: CompilerOutput) => void)[] = [];
  private inputFieldListeners: ((text: string) => void)[] = []; // New listeners for input field updates
  private lastOutput: CompilerOutput | null = null;

  private constructor() {}

  static getInstance(): CompilerChatService {
    if (!CompilerChatService.instance) {
      CompilerChatService.instance = new CompilerChatService();
    }
    return CompilerChatService.instance;
  }

  // Send compiler output to the chat interface as a message
  sendOutputToChat(code: string, language: string, output: string): void {
    const compilerOutput: CompilerOutput = {
      code,
      language,
      output,
      timestamp: new Date(),
      toInputField: false
    };
    
    this.lastOutput = compilerOutput;
    this.notifyListeners(compilerOutput);
  }
  
  // Send compiler output to the chat input field
  sendOutputToInputField(code: string, language: string, output: string): void {
    console.log('[CompilerChatService] sendOutputToInputField called');
    
    // Format the output in a way that's useful for the chat
    const formattedText = `Output from ${language}:

${output}

Original code:
${code}`;
    
    console.log('[CompilerChatService] Formatted text:', formattedText.substring(0, 100) + '...');
    console.log('[CompilerChatService] Number of input field listeners:', this.inputFieldListeners.length);
    
    // Notify input field listeners
    this.notifyInputFieldListeners(formattedText);
    
    // Also store as last output
    this.lastOutput = {
      code,
      language,
      output,
      timestamp: new Date(),
      toInputField: true
    };
  }

  // Get the last compiler output
  getLastOutput(): CompilerOutput | null {
    return this.lastOutput;
  }

  // Subscribe to compiler output events for messages
  subscribeToOutput(callback: (data: CompilerOutput) => void): () => void {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }
  
  // Subscribe to input field updates
  subscribeToInputField(callback: (text: string) => void): () => void {
    this.inputFieldListeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.inputFieldListeners = this.inputFieldListeners.filter(listener => listener !== callback);
    };
  }

  // Notify all listeners about new compiler output
  private notifyListeners(data: CompilerOutput): void {
    this.listeners.forEach(listener => listener(data));
  }
  
  // Notify input field listeners about new text
  private notifyInputFieldListeners(text: string): void {
    this.inputFieldListeners.forEach(listener => listener(text));
  }
}

export default CompilerChatService.getInstance();
