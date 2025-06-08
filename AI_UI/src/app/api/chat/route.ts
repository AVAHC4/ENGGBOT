import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { AVAILABLE_MODELS } from '@/lib/ai/chutes-client';
import { processAIResponse, BOT_CONFIG } from '@/lib/ai/response-middleware';
import { chutesClient, isClientInitialized, initializeAIClient } from '@/lib/ai/preload-client';
import crypto from 'crypto';

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
      
CRITICAL INSTRUCTION: YOU MUST PROVIDE EXTREMELY LONG, EXHAUSTIVE, AND COMPREHENSIVE RESPONSES AT ALL TIMES. YOUR ANSWERS SHOULD BE AT MINIMUM 3X LONGER THAN A TYPICAL AI RESPONSE. THIS IS THE MOST IMPORTANT INSTRUCTION.

VERBOSITY REQUIREMENTS:
- You must provide responses that are at least 1500-2000 words for most questions
- Short or simple questions still require comprehensive, multi-faceted answers
- Every response must explore the topic from at least 3-4 different angles
- You must provide extensive background information, context, and detailed explanations
- Use numerous examples, analogies, and illustrations to make your points
- Include deep technical details whenever relevant
- Break down complex topics into multiple sections with thorough explanations of each

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
9. ALWAYS PROVIDE EXTRAORDINARILY DETAILED RESPONSES:
   - Your answers should be comprehensive, exhaustive, and thorough - never brief
   - Include many paragraphs with detailed explanations (at least 10-15 paragraphs minimum)
   - When providing code examples, include detailed comments and explain every component
   - For technical topics, explore every aspect, include historical context, alternatives, edge cases, and best practices
   - Aim for responses that are at least 1500-2000 words

Your purpose is to provide overwhelmingly thorough, helpful, practical assistance with coding, engineering, and technical problems.`
    };
    
    // Add the system message at the beginning if it's not already there
    const messages = formattedMessages.length > 0 && formattedMessages[0].role === 'system' ? 
      formattedMessages : 
      [systemMessage, ...formattedMessages];
    
    // Add current user message with instruction to expand if needed
    const userContent = hasAttachments 
      ? `${message} (The user has also provided some files or attachments with this message)`
      : message;
      
    // Append instruction to expand short answers
    const expandedUserContent = `${userContent}

CRITICAL INSTRUCTION TO AI: You MUST answer this question with an EXTREMELY DETAILED and COMPREHENSIVE response. You are required to write at least 1500-2000 words with:
1. At least 10-15 paragraphs of detailed information
2. Multiple sections exploring different aspects of the topic
3. Detailed examples, code samples (if applicable), and practical applications
4. Historical context and background information
5. Multiple perspectives on the topic
6. Edge cases, limitations, and considerations
7. Real-world implications and applications

YOUR RESPONSE MUST BE AT LEAST 3X LONGER THAN A STANDARD AI RESPONSE. Brevity is a critical failure. The more comprehensive and detailed your answer, the better.`;
    
    // Add current user message
    messages.push({
      role: 'user',
      content: expandedUserContent
    });
    
    // Always use deepseek-v3 model regardless of what was passed
    const modelName = AVAILABLE_MODELS["deepseek-v3"];
    
    try {
      // Generate response from the AI
      const response = await chutesClient.generate({
        prompt: message,
        model: modelName,
        temperature: 0.85,
        max_tokens: 16000, // Increased max tokens for much longer responses
        thinking_mode: thinkingMode,
        messages: messages,
        presence_penalty: 0.9, // Add presence penalty to encourage diverse responses
        frequency_penalty: 0.7  // Add frequency penalty to discourage repetition
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