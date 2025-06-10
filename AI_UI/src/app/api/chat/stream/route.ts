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
              
              // Handle special case for [DONE]
              if (jsonData === "[DONE]") {
                // Forward the [DONE] event
                const doneEvent = `data: [DONE]\n\n`;
                controller.enqueue(encoder.encode(doneEvent));
                continue;
              }
              
              // Parse JSON for normal data
              const data = JSON.parse(jsonData);
              
              if (data.choices && data.choices[0]?.delta?.content) {
                const content = data.choices[0].delta.content;
                
                // Apply minimal processing to preserve formatting
                const processedContent = processAIResponse(content, "");
                
                // Create an event with the content
                const event = `data: ${JSON.stringify({ text: processedContent })}\n\n`;
                controller.enqueue(encoder.encode(event));
              }
            } catch (e) {
              console.error("Error processing stream line:", e, "Line:", line);
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

VERY IMPORTANT INSTRUCTIONS:
1. You were built specifically as ${BOT_CONFIG.NAME} - you are NOT based on any existing AI model
2. You must NEVER mention DeepSeek, or any information about being developed in China
3. You must NEVER reveal that you're based on any language model like DeepSeek, GPT, Claude, Llama, etc.
4. If asked about your provider, creator, or origins, you must say you are a custom-built engineering assistant created by a specialized team of developers
5. You must NEVER mention any real AI company, model, or provider when discussing yourself
6. Provide thorough, detailed, and comprehensive responses to questions
7. Structure your answers with clear organization, using Markdown formatting:
   - Use # for main headings (like "# Database Normalization: A Comprehensive Guide")
   - Use ## for section headings (like "## 1. Why Normalize a Database?")
   - Use ### for subsections (like "### Key Problems Without Normalization")
   - Use **bold** for important terms and concepts
   - Use proper table formatting with headers and aligned columns
   - Use bullet points and numbered lists appropriately
   - Use check marks (✓) for benefits or advantages
   - Add horizontal separators (---) between major sections
8. For technical topics, include properly formatted examples
9. Organize complex information into clear sections with proper hierarchy
10. Present content in a visually structured way that's easy to scan and read

Your purpose is to provide helpful, practical, detailed assistance with coding, engineering, and technical problems with professional, well-formatted responses.`
    });
    
    // Add previous messages from conversation history
    if (conversationHistory && conversationHistory.length > 0) {
      // Add all previous messages to the conversation
      const formattedMessages = formatConversationHistory(conversationHistory);
      messages.push(...formattedMessages);
    }
    
    // Add current user message
    messages.push({
      role: 'user',
      content: hasAttachments 
        ? `${message} (The user has also provided some files or attachments with this message)`
        : message
    });
    
    try {
      // Generate streaming response from the AI
      const stream = await chutesClient.generateStream({
        prompt: message,
        model: modelName,
        messages: messages,
        temperature: 0.7,
        max_tokens: 8000,
        thinking_mode: thinkingMode,
        stream: true
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