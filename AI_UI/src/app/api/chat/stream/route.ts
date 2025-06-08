import { NextResponse } from 'next/server';
import { AVAILABLE_MODELS } from '@/lib/ai/chutes-client';
import { processAIResponse, BOT_CONFIG } from '@/lib/ai/response-middleware';
import { chutesClient, isClientInitialized, initializeAIClient } from '@/lib/ai/preload-client';

// Simple stream processor to transform Chutes AI stream into an event stream
function processChutesStream(
  stream: ReadableStream,
  encoder = new TextEncoder(),
  decoder = new TextDecoder()
): ReadableStream {
  const reader = stream.getReader();
  
  return new ReadableStream({
    async start(controller) {
      try {
        let buffer = '';
        
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            // Send done event
            const doneEvent = `data: [DONE]\n\n`;
            controller.enqueue(encoder.encode(doneEvent));
            break;
          }
          
          // Decode the chunk
          buffer += decoder.decode(value, { stream: true });
          
          // Split by newlines and process each line
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep the last potentially incomplete line in the buffer
          
          for (const line of lines) {
            if (line.trim() === '') continue;
            if (!line.startsWith('data:')) continue;
            
            try {
              // Extract the JSON data from the line
              const jsonData = line.slice(5).trim(); // Remove 'data: ' prefix
              if (!jsonData) continue;
              
              const data = JSON.parse(jsonData);
              
              if (data.choices && data.choices[0]?.delta?.content) {
                const content = data.choices[0].delta.content;
                
                // Process the content for identity protection
                const processedContent = processAIResponse(content, "");
                
                // Create an event with the content
                const event = `data: ${JSON.stringify({ text: processedContent })}\n\n`;
                controller.enqueue(encoder.encode(event));
              }
            } catch (e) {
              console.error("Error processing stream line:", e);
              continue;
            }
          }
        }
      } catch (error) {
        console.error("Stream processing error:", error);
        controller.error(error);
      } finally {
        controller.close();
      }
    },
    
    async cancel() {
      await reader.cancel();
    }
  });
}

// Format conversation history for the AI
function formatConversationHistory(history: any[]): Array<{role: string, content: string}> {
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
    });
    
    // Add previous messages from conversation history
    if (conversationHistory && conversationHistory.length > 0) {
      // Add all previous messages to the conversation
      const formattedMessages = formatConversationHistory(conversationHistory);
      messages.push(...formattedMessages);
    }
    
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
    
    messages.push({
      role: 'user',
      content: expandedUserContent
    });
    
    try {
      // Generate streaming response from the AI
      const stream = await chutesClient.generateStream({
        prompt: message,
        model: modelName,
        messages: messages,
        temperature: 0.85,
        max_tokens: 16000,
        thinking_mode: thinkingMode,
        stream: true,
        presence_penalty: 0.9,
        frequency_penalty: 0.7
      });
      
      // Process the stream
      const processedStream = processChutesStream(stream);
      
      // Return the streaming response with required headers for proper streaming
      return new Response(processedStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
          'Transfer-Encoding': 'chunked',
          'X-Accel-Buffering': 'no'
        }
      });
    } catch (error) {
      console.error("Error generating streaming response:", error);
      return new Response(`data: ${JSON.stringify({ error: "Error generating streaming response" })}\n\ndata: [DONE]\n\n`, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      });
    }
  } catch (error) {
    console.error('Error processing chat message:', error);
    return NextResponse.json(
      { error: 'Failed to process your message' },
      { status: 500 }
    );
  }
} 