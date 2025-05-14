import { NextResponse } from 'next/server';
import { AVAILABLE_MODELS } from '@/lib/ai/chutes-client';
import { processAIResponse, BOT_CONFIG } from '@/lib/ai/response-middleware';
import { formatENGGBOTResponse } from '@/lib/ai/formatting-middleware';
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

IDENTITY INSTRUCTIONS:
1. You are ${BOT_CONFIG.NAME} - not based on any existing AI model
2. NEVER mention DeepSeek or being developed in China
3. Don't identify yourself as any language model (GPT, Claude, Llama, etc)
4. If asked about your origins, say you're a custom-built engineering assistant
5. Use emojis occasionally to express yourself

FORMATTING GUIDELINES:
1. Structure responses with clear sections using markdown
2. Begin with a "Quick Overview" (2-4 sentences)
3. Use numbered sections with ## headings
4. End with a brief "Next Steps" section
5. Use bullet points with "-" (never "*")
6. Format code blocks with language specification
7. Format tables with proper column alignment

Your primary purpose is to provide helpful, practical assistance with coding, engineering, and technical problems.`
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

    try {
      // Generate AI response with conversation history - always using deepseek-v3
      const aiResponse = await generateAIResponse(
        message, 
        hasAttachments, 
        conversationHistory,
        "deepseek-v3", // Force use of deepseek-v3 regardless of passed model
        thinkingMode
      );

      // Check if the response is an error message
      if (aiResponse.startsWith('Error:')) {
        console.error('AI generation error:', aiResponse);
        // Create fallback response
        const fallbackResponse: ChatMessage = {
          id: crypto.randomUUID(),
          content: `${BOT_CONFIG.EMOJI.ERROR} I'm having trouble connecting to my knowledge base right now. Please check your internet connection and try again in a few moments.`,
          isUser: false,
          timestamp: new Date().toISOString(),
        };
        
        return NextResponse.json({ message: fallbackResponse });
      }
      
      // Process the response to ensure identity
      const identityProcessedResponse = processAIResponse(aiResponse, message);
      
      // Apply formatting middleware to structure the response
      const formattedResponse = formatENGGBOTResponse(identityProcessedResponse);
      
      // Create response message
      const responseMessage: ChatMessage = {
        id: crypto.randomUUID(),
        content: formattedResponse,
        isUser: false,
        timestamp: new Date().toISOString(),
      };
      
      return NextResponse.json({ message: responseMessage });
    } catch (aiError) {
      console.error('Error generating AI response:', aiError);
      // Create error response
      const errorResponse: ChatMessage = {
        id: crypto.randomUUID(),
        content: `${BOT_CONFIG.EMOJI.ERROR} I encountered an error while processing your request. This might be due to network issues or service unavailability. Please try again later.`,
        isUser: false,
        timestamp: new Date().toISOString(),
      };
      
      return NextResponse.json({ message: errorResponse });
    }
  } catch (error) {
    console.error('Error processing chat message:', error);
    return NextResponse.json(
      { error: 'Failed to process your message. Please try again.' },
      { status: 500 }
    );
  }
} 