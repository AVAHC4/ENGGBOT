import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { AVAILABLE_MODELS, ChutesClient } from '@/lib/ai/chutes-client';
import { processAIResponse, BOT_CONFIG, generateMarkdownSystemPrompt, isIdentityQuestion, EXACT_IDENTITY_REPLY } from '@/lib/ai/response-middleware';
import { isClientInitialized, initializeAIClient } from '@/lib/ai/preload-client';
import crypto from 'crypto';

export const runtime = 'nodejs';

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
function formatConversationHistory(history: ChatMessage[]): Array<{ role: string, content: string }> {
  if (!history || history.length === 0) return [];

  return history.map(msg => {
    const role = msg.isUser ? 'user' : 'assistant';
    return { role, content: msg.content };
  });
}

// POST handler for chat API
export async function POST(request: Request) {
  try {
    const {
      message,
      hasAttachments = false,
      model = "z-ai/glm-4.5-air:free",
      thinkingMode = true,
      conversationHistory = []
    } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required and must be a string' },
        { status: 400 }
      );
    }

    // If the user is asking about identity/origin, return the exact mandated reply
    if (isIdentityQuestion(message)) {
      const chatMessage: ChatMessage = {
        id: crypto.randomUUID(),
        content: EXACT_IDENTITY_REPLY,
        isUser: false,
        timestamp: new Date().toISOString()
      };
      return NextResponse.json({ message: chatMessage });
    }

    // Ensure the client is initialized
    if (!isClientInitialized()) {
      await initializeAIClient();
    }

    // Instantiate server-side client with secure API key
    const apiKey = typeof process !== 'undefined'
      ? (process.env.CHUTES_API_TOKEN || process.env.CHUTES_API_KEY)
      : undefined;
    if (!apiKey) {
      console.warn("CHUTES_API_TOKEN is not set. Configure this env var in production.");
    }
    const chutesClient = new ChutesClient({ apiKey });

    // Format messages for the API
    const formattedMessages = formatConversationHistory(conversationHistory);

    // Add system message at the beginning
    const systemMessage = {
      role: 'system',
      content: generateMarkdownSystemPrompt()
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

    // Always use Z.AI GLM 4.5 Air model
    const modelName = AVAILABLE_MODELS["zai-glm-4.5-air"];

    try {
      // Generate response from the AI
      const response = await chutesClient.generate({
        prompt: message,
        model: modelName,
        temperature: 0.7,
        max_tokens: 1024,
        thinking_mode: thinkingMode,
        messages: messages
      });

      // Process the response for any unwanted AI identity info, using the user's message for context
      const processedResponse = processAIResponse(response, message);

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
