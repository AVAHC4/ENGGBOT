// Compiler-Chat communication service
// This service facilitates communication between the compiler and chat components

type CompilerOutput = {
  code: string;
  language: string;
  output: string;
  timestamp: Date;
  toInputField?: boolean; // New flag to indicate if output should go to input field
};

export type CompilerOutputListener = (data: CompilerOutput) => void;
export type InputFieldListener = (text: string) => void;

export class CompilerChatService {
  private static instance: CompilerChatService;
  private listeners: CompilerOutputListener[] = [];
  private inputFieldListeners: InputFieldListener[] = []; // New listeners for input field updates
  private lastOutput: CompilerOutput | null = null;
  
  // Global callback that can be set by the chat context
  private static globalAddMessageCallback: ((content: string, isUser: boolean, metadata?: any) => void) | null = null;

  // Method to register the global callback from chat context
  static registerGlobalAddMessage(callback: (content: string, isUser: boolean, metadata?: any) => void): void {
    console.log('[CompilerChatService] Registered global add message callback');
    CompilerChatService.globalAddMessageCallback = callback;
  }

  private constructor() {}

  static getInstance(): CompilerChatService {
    if (!CompilerChatService.instance) {
      CompilerChatService.instance = new CompilerChatService();
    }
    return CompilerChatService.instance;
  }

  // Send compiler output to the chat interface as a message
  sendOutputToChat(code: string, language: string, output: string): void {
    console.log('[CompilerChatService] sendOutputToChat called');
    console.log('[CompilerChatService] Number of chat listeners:', this.listeners.length);
    
    const compilerOutput: CompilerOutput = {
      code,
      language,
      output,
      timestamp: new Date(),
      toInputField: false
    };
    
    this.lastOutput = compilerOutput;
    
    // Create formatted content for the chat message
    const formattedContent = `Code output from ${language}:\n\n${output}\n\nOriginal code:\n${code}`;
    
    // Check if window._addCompilerMessageToChat function exists (should be set up by chat context)
    if (typeof window !== 'undefined' && (window as any)._addCompilerMessageToChat) {
      console.log('[CompilerChatService] Using window._addCompilerMessageToChat function');
      try {
        // Call the global function to add the message to chat
        (window as any)._addCompilerMessageToChat(formattedContent, {
          isCompilerOutput: true,
          language,
          code,
          timestamp: new Date()
        });
        
        // Show confirmation to user
        alert('Output sent to chat conversation!');
        return;
      } catch (error) {
        console.error('[CompilerChatService] Error calling window function:', error);
      }
    }
    
    // Fall back to the original notification mechanism
    console.log('[CompilerChatService] Using standard listeners');
    this.notifyListeners(compilerOutput);
    
    // Show confirmation to user
    alert('Output sent to chat conversation!');
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
    console.log(`[CompilerChatService] Notifying ${this.listeners.length} listeners`);
    
    if (this.listeners.length === 0) {
      console.warn('[CompilerChatService] No listeners registered! Message will be lost.');
      // Store the message temporarily in case listeners register late
      setTimeout(() => {
        if (this.listeners.length > 0) {
          console.log('[CompilerChatService] Delayed notification - listeners now available');
          this.listeners.forEach(listener => {
            try {
              listener(data);
            } catch (error) {
              console.error('[CompilerChatService] Error in listener:', error);
            }
          });
        }
      }, 500); // Try again after a short delay
      return;
    }
    
    // Notify all registered listeners
    this.listeners.forEach((listener, index) => {
      try {
        console.log(`[CompilerChatService] Calling listener ${index}`);
        listener(data);
      } catch (error) {
        console.error(`[CompilerChatService] Error in listener ${index}:`, error);
      }
    });
  }
  
  // Notify input field listeners about new text
  private notifyInputFieldListeners(text: string): void {
    this.inputFieldListeners.forEach(listener => listener(text));
  }
}

// Export the singleton instance as default
const compilerChatService = CompilerChatService.getInstance();
export default compilerChatService;
