import { NextResponse } from 'next/server';
import { AVAILABLE_MODELS } from '@/lib/ai/models';
import { processAIResponse, BOT_CONFIG, generateMarkdownSystemPrompt } from '@/lib/ai/response-middleware';
import { chutesClient, isClientInitialized, initializeAIClient } from '@/lib/ai/preload-client';
import crypto from 'crypto';
import type { ChatMessage } from '@/types/chat';
export const runtime = 'nodejs';

// Simple interface for chat messages (shared type)

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

// POST handler for chat API
export async function POST(request: Request) {
  try {
    const { 
      message, 
      hasAttachments = false,
      model = "deepseek-r1",
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
    
    // Always use deepseek-r1 model
    const modelName = AVAILABLE_MODELS["deepseek-r1"];
    
    try {
      // Generate response from the AI
      const response = await chutesClient.generate({
        prompt: message,
        model: modelName,
        temperature: 0.5,
        max_tokens: 8000, // Increased max tokens for much longer responses
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