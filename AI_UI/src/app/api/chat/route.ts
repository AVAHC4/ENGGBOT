import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { AVAILABLE_MODELS, OpenRouterClient } from '@/lib/ai/openrouter-client';
import { processAIResponse, BOT_CONFIG, generateMarkdownSystemPrompt, isIdentityQuestion, EXACT_IDENTITY_REPLY } from '@/lib/ai/response-middleware';
import { isClientInitialized, initializeAIClient } from '@/lib/ai/preload-client';
import crypto from 'crypto';

export const runtime = 'nodejs';

 
export interface ChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: string;
}

 
function formatConversationHistory(history: ChatMessage[]): Array<{ role: string, content: string }> {
  if (!history || history.length === 0) return [];

  return history.map(msg => {
    const role = msg.isUser ? 'user' : 'assistant';
    return { role, content: msg.content };
  });
}

 
export async function POST(request: Request) {
  try {
    const {
      message,
      hasAttachments = false,
      model = "openai/gpt-oss-120b:free",
      thinkingMode = true,
      conversationHistory = []
    } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required and must be a string' },
        { status: 400 }
      );
    }

     
    if (isIdentityQuestion(message)) {
      const chatMessage: ChatMessage = {
        id: crypto.randomUUID(),
        content: EXACT_IDENTITY_REPLY,
        isUser: false,
        timestamp: new Date().toISOString()
      };
      return NextResponse.json({ message: chatMessage });
    }

     
    if (!isClientInitialized()) {
      await initializeAIClient();
    }

     
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.warn("OPENROUTER_API_KEY is not set. Configure this env var in production.");
    }
    const openRouterClient = new OpenRouterClient({ apiKey });

     
    const formattedMessages = formatConversationHistory(conversationHistory);

     
    const systemMessage = {
      role: 'system',
      content: generateMarkdownSystemPrompt()
    };

     
    const messages = formattedMessages.length > 0 && formattedMessages[0].role === 'system' ?
      formattedMessages :
      [systemMessage, ...formattedMessages];

     
    messages.push({
      role: 'user',
      content: hasAttachments
        ? `${message} (The user has also provided some files or attachments with this message)`
        : message
    });

     
    const modelName = AVAILABLE_MODELS["gpt-oss"];

    try {
       
      const response = await openRouterClient.generate({
        prompt: message,
        model: modelName,
        temperature: 0.7,
        max_tokens: 1024,
        thinking_mode: thinkingMode,
        messages: messages
      });

       
      const processedResponse = processAIResponse(response, message);

       
      const chatMessage: ChatMessage = {
        id: crypto.randomUUID(),
        content: processedResponse,
        isUser: false,
        timestamp: new Date().toISOString()
      };

      return NextResponse.json({ message: chatMessage });

    } catch (error) {
      console.error("Error generating AI response:", error);

       
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

