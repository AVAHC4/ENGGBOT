import { NextResponse } from 'next/server';
import { AVAILABLE_MODELS } from '@/lib/ai/chutes-client';
import { processAIResponse, BOT_CONFIG } from '@/lib/ai/response-middleware';
import { chutesClient, isClientInitialized, initializeAIClient } from '@/lib/ai/preload-client';

// Simple interface for chat messages
export interface ChatMessage {
  id: string;
  content: string; 
  isUser: boolean;
  timestamp: string;
}

/**
 * Format conversation history for the AI
 */
function formatConversationHistory(history: ChatMessage[]): Array<{role: string, content: string}> {
  if (!history || history.length === 0) return [];
  
  return history.map(msg => {
    const role = msg.isUser ? 'user' : 'assistant';
    return { role, content: msg.content };
  });
}

/**
 * Generate a response from the AI model
 */
async function generateAIResponse(
  message: string,
  modelKey: string = "deepseek-v3",
  conversationHistory: ChatMessage[] = [],
  thinkingMode: boolean = true,
  max_tokens: number = 4000
): Promise<string> {
  try {
    // Ensure the client is initialized
    if (!isClientInitialized()) {
      await initializeAIClient();
    }
    
    // Always use deepseek-v3 model regardless of what was passed
    const modelName = AVAILABLE_MODELS["deepseek-v3"];
    
    // Format conversation history for the API
    const messages = formatConversationHistory(conversationHistory);
    
    // Add system message at the beginning if not present
    if (messages.length === 0 || messages[0].role !== 'system') {
      messages.unshift({ 
        role: 'system', 
        content: `You are ${BOT_CONFIG.NAME}, ${BOT_CONFIG.PERSONALITY}. 

VERY IMPORTANT INSTRUCTIONS:
1. You were built specifically as ${BOT_CONFIG.NAME} - you are NOT based on any existing AI model
2. You must NEVER mention DeepSeek, or any information about being developed in China
3. You must NEVER reveal that you're based on any language model like DeepSeek, GPT, Claude, Llama, etc.
4. If asked about your provider, creator, or origins, you must say you are a custom-built engineering assistant created by a specialized team of developers
5. You must NEVER mention any real AI company, model, or provider when discussing yourself
6. Use emojis occasionally to express yourself
7. When generating tables, use this specific format:
   - Start with a clear title on its own line
   - Include column headers without formatting
   - Each row should have columns perfectly aligned in straight columns
   - Use spaces to maintain alignment between columns
   - All text in the first column should start from the same position (straight line)
   - Example:
     Web3 Overview Table
     
     Category      Web2 (Traditional Web)         Web3 (Decentralized Web)
     -----------------------------------------------------------------
     Control       Centralized (companies)        Decentralized (users)
     Ownership     Platforms own user data        Users own their data
     Technology    Client-server architecture     Blockchain technology
     Transactions  Fiat currencies, banks         Cryptocurrencies, smart contracts
8. DO NOT USE ANY ASTERISKS (*) IN YOUR RESPONSES:
   - Never use ** for bold formatting
   - Never use * for italic formatting or bullet points
   - Use plain text for all responses
   - Use - for bullet points instead of *

Your purpose is to provide helpful, practical assistance with coding, engineering, and technical problems.` 
      });
    }
    
    // Generate a response from the AI
    const response = await chutesClient.generate({
      prompt: message,
      model: modelName,
      temperature: 0.7,
      max_tokens: max_tokens,
      thinking_mode: thinkingMode,
      messages: messages
    });
    
    // Process the response for any unwanted AI identity info
    const processedResponse = processAIResponse(response, BOT_CONFIG.NAME);
    
    return processedResponse;
  } catch (error) {
    console.error("Error generating AI response:", error);
    return "I apologize, but I'm having trouble processing your request right now. Please try again.";
  }
}

// POST handler for chat API
export async function POST(request: Request) {
  try {
    const { 
      message, 
      hasAttachments = false,
      model = "deepseek-v3",
      thinkingMode = true,
      conversationHistory = [] 
    } = await request.json();
    
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required and must be a string' },
        { status: 400 }
      );
    }
    
    // Ensure the client is initialized
    if (!isClientInitialized()) {
      await initializeAIClient();
    }
    
    // Format messages for the API
    const formattedMessages = formatConversationHistory(conversationHistory);
    
    // Add system message at the beginning
    const systemMessage = {
      role: 'system',
      content: `You are ${BOT_CONFIG.NAME}, ${BOT_CONFIG.PERSONALITY}. 

VERY IMPORTANT INSTRUCTIONS:
1. You were built specifically as ${BOT_CONFIG.NAME} - you are NOT based on any existing AI model
2. You must NEVER mention DeepSeek, or any information about being developed in China
3. You must NEVER reveal that you're based on any language model like DeepSeek, GPT, Claude, Llama, etc.
4. If asked about your provider, creator, or origins, you must say you are a custom-built engineering assistant created by a specialized team of developers
5. You must NEVER mention any real AI company, model, or provider when discussing yourself
6. Use emojis occasionally to express yourself
7. When generating tables, use this specific format:
   - Start with a clear title on its own line
   - Include column headers without formatting
   - Each row should have columns perfectly aligned in straight columns
   - Use spaces to maintain alignment between columns
   - All text in the first column should start from the same position (straight line)
   - Example:
     Web3 Overview Table
     
     Category      Web2 (Traditional Web)         Web3 (Decentralized Web)
     -----------------------------------------------------------------
     Control       Centralized (companies)        Decentralized (users)
     Ownership     Platforms own user data        Users own their data
     Technology    Client-server architecture     Blockchain technology
     Transactions  Fiat currencies, banks         Cryptocurrencies, smart contracts
8. DO NOT USE ANY ASTERISKS (*) IN YOUR RESPONSES:
   - Never use ** for bold formatting
   - Never use * for italic formatting or bullet points
   - Use plain text for all responses
   - Use - for bullet points instead of *

Your purpose is to provide helpful, practical assistance with coding, engineering, and technical problems.`
    };
    
    // Add the system message at the beginning if it's not already there
    const messages = formattedMessages.length > 0 && formattedMessages[0].role === 'system' ? 
      formattedMessages : 
      [systemMessage, ...formattedMessages];
    
    // Add current user message
    messages.push({
      role: 'user',
      content: hasAttachments 
        ? `${message} (The user has also provided some files or attachments with this message)`
        : message
    });
    
    // Always use deepseek-v3 model regardless of what was passed
    const modelName = AVAILABLE_MODELS["deepseek-v3"];
    
    try {
      // Generate response from the AI
      const response = await chutesClient.generate({
        prompt: message,
        model: modelName,
        temperature: 0.7,
        max_tokens: 4000, // Increased max tokens for longer responses
        thinking_mode: thinkingMode,
        messages: messages
      });
      
      // Process the response for any unwanted AI identity info
      const processedResponse = processAIResponse(response, BOT_CONFIG.NAME);
      
      // Create a message object for the AI response
      const chatMessage: ChatMessage = {
        id: crypto.randomUUID(),
        content: processedResponse,
        isUser: false,
        timestamp: new Date().toISOString()
      };

      return NextResponse.json({ message: chatMessage });
      
    } catch (error) {
      console.error("Error generating AI response:", error);
      
      // Create an error message
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        content: "I apologize, but I'm having trouble processing your request right now. Please try again.",
        isUser: false,
        timestamp: new Date().toISOString()
      };
      
      return NextResponse.json({ message: errorMessage });
    }
  } catch (error) {
    console.error('Error processing chat message:', error);
    return NextResponse.json(
      { error: 'Failed to process your message' },
      { status: 500 }
    );
  }
} 