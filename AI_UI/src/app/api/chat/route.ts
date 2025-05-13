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

// Function to format conversation history for the AI
function formatConversationHistory(history: ChatMessage[]): string {
  if (!history || history.length === 0) return '';
  
  return history.map(msg => {
    const role = msg.isUser ? 'User' : BOT_CONFIG.NAME;
    return `${role}: ${msg.content}`;
  }).join('\n\n');
}

// Function to generate AI response using DeepSeek via Chutes AI
async function generateAIResponse(
  userMessage: string, 
  hasAttachments: boolean,
  conversationHistory: ChatMessage[] = [],
  modelKey: string = "deepseek-v3",
  thinkingMode: boolean = true
): Promise<string> {
  try {
    // Ensure the client is initialized before use
    if (!isClientInitialized()) {
      await initializeAIClient();
    }
    
    // Always use deepseek-v3 model regardless of what was passed
    const modelName = AVAILABLE_MODELS["deepseek-v3"];
    
    // Format messages for the API
    const messages = [];
    
    // Add a system message to help shape the assistant's identity
    messages.push({
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

9. ALWAYS FOLLOW THESE FORMATTING GUIDELINES:
   - Start with a concise opening summary (2-4 sentences) that previews key points
   - Use clear section headers with ## for major sections and ### for subsections
   - Structure content into focused sections with one main idea per section
   - Keep paragraphs concise (3-5 sentences each)
   - Use active voice and friendly yet professional tone
   - End with a brief wrap-up or next steps

10. EXAMPLE FORMAT TEMPLATE:
    **Quick Overview:**  
    Here's what we'll cover: A, B, C.
    
    ## 1. Major Section
    Explanation in 2-3 sentences.
    
    ### 1.1 Subsection
    Details on the topic.
    
    ## 2. Another Major Section
    Explanation with code example if needed.
    
    **Next Steps:**  
    Brief follow-up or suggestion.

Your purpose is to provide helpful, practical assistance with coding, engineering, and technical problems.`
    });
    
    // Add previous messages from conversation history
    if (conversationHistory && conversationHistory.length > 0) {
      // Skip the current user message which is the last one
      const previousMessages = conversationHistory.slice(0, -1);
      
      for (const msg of previousMessages) {
        messages.push({
          role: msg.isUser ? 'user' : 'assistant',
          content: msg.content
        });
      }
    }
    
    // Add current user message
    messages.push({
      role: 'user',
      content: hasAttachments 
        ? `${userMessage} (The user has also provided some files or attachments with this message)`
        : userMessage
    });
    
    const options = {
      prompt: userMessage, // This is a fallback and may not be used
      model: modelName,
      temperature: 0.7,
      max_tokens: 1000,
      thinking_mode: thinkingMode,
      messages: messages
    };
    
    // Get response from DeepSeek using the pre-initialized client
    const response = await chutesClient.generate(options);
    
    // Process the response through our middleware to ensure identity
    const processedResponse = processAIResponse(response, userMessage);
    
    return processedResponse;
  } catch (error) {
    console.error("Error using AI:", error);
    return `${BOT_CONFIG.EMOJI.ERROR} I apologize, but I encountered an issue processing your request. Please try again.`;
  }
}

export async function POST(request: Request) {
  try {
    const { 
      message, 
      hasAttachments = false,
      model = "deepseek-v3", // This will be ignored
      thinkingMode = true,
      conversationId = '',
      conversationHistory = []
    } = await request.json();
    
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required and must be a string' },
        { status: 400 }
      );
    }

    // Generate AI response with conversation history - always using deepseek-v3
    const aiResponse = await generateAIResponse(
      message, 
      hasAttachments, 
      conversationHistory,
      "deepseek-v3", // Force use of deepseek-v3 regardless of passed model
      thinkingMode
    );
    
    // Create response message
    const responseMessage: ChatMessage = {
      id: crypto.randomUUID(),
      content: aiResponse,
      isUser: false,
      timestamp: new Date().toISOString(),
    };
    
    return NextResponse.json({ message: responseMessage });
  } catch (error) {
    console.error('Error processing chat message:', error);
    return NextResponse.json(
      { error: 'Failed to process your message' },
      { status: 500 }
    );
  }
} 