import { NextResponse } from 'next/server';
import { AVAILABLE_MODELS } from '@/lib/ai/models';
import { processAIResponse, BOT_CONFIG, generateMarkdownSystemPrompt, isIdentityQuestion, EXACT_IDENTITY_REPLY } from '@/lib/ai/response-middleware';
import { chutesClient, isClientInitialized, initializeAIClient } from '@/lib/ai/preload-client';
import { getSupabaseAdmin } from '@/lib/server/supabase-admin';
import { getSessionFromCookies } from '@/lib/server/auth-session';
import { ensureConversation, insertMessage, updateMessage } from '@/lib/server/persistence';

// Simple stream processor to transform OpenRouter stream into an event stream
function processChutesStream(
  stream: ReadableStream,
  userMessage: string,
  options?: {
    onTextChunk?: (text: string) => Promise<void> | void;
    onDone?: () => Promise<void> | void;
  },
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
            try { await options?.onDone?.(); } catch (e) { console.error('onDone error', e); }
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
                try { await options?.onDone?.(); } catch (e) { console.error('onDone error', e); }
                continue;
              }
              
              // Parse JSON for normal data
              const data = JSON.parse(jsonData);
              
              if (data.choices && data.choices[0]?.delta?.content) {
                const content = data.choices[0].delta.content;
                
                // Apply minimal processing to preserve formatting
                const processedContent = processAIResponse(content, userMessage);
                
                // Create an event with the content
                const event = `data: ${JSON.stringify({ text: processedContent })}\n\n`;
                controller.enqueue(encoder.encode(event));

                // Persist chunk if requested
                try {
                  await options?.onTextChunk?.(processedContent);
                } catch (e) {
                  console.error('onTextChunk error', e);
                }
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
      model = "gpt-oss-120b", 
      thinkingMode = true,
      conversationHistory = [],
      conversationId,
      replyToId
    } = await request.json();
    
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required and must be a string' },
        { status: 400 }
      );
    }

    // Short-circuit identity/origin questions with exact mandated reply
    if (isIdentityQuestion(message)) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          const event = `data: ${JSON.stringify({ text: EXACT_IDENTITY_REPLY })}\n\n`;
          controller.enqueue(encoder.encode(event));
          const doneEvent = `data: [DONE]\n\n`;
          controller.enqueue(encoder.encode(doneEvent));
          controller.close();
        }
      });
      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
          'Transfer-Encoding': 'chunked',
          'X-Accel-Buffering': 'no'
        }
      });
    }

    // Ensure the client is initialized before use
    if (!isClientInitialized()) {
      await initializeAIClient();
    }
    
    // Always use OpenAI GPT-OSS-120B (free) model
    const modelName = AVAILABLE_MODELS["gpt-oss-120b"];
    
    // Format messages for the API
    const messages = [];
    
    // Add a system message to help shape the assistant's identity
    messages.push({
      role: 'system',
      content: generateMarkdownSystemPrompt()
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
        : message,
      prompt: "",
    });
    
    // Optional DB persistence setup
    const db = getSupabaseAdmin();
    const session = getSessionFromCookies();
    const canPersist = Boolean(db && session?.id && conversationId);

    let aiMessageId: string | null = null;
    let accumulated = '';
    let flushPending = false;
    let lastFlush = 0;
    const minFlushIntervalMs = 150;

    async function flushIfNeeded(force = false) {
      if (!canPersist || !aiMessageId || !db) return;
      const now = Date.now();
      if (!force && (flushPending || now - lastFlush < minFlushIntervalMs)) return;
      flushPending = true;
      try {
        await updateMessage(db, aiMessageId, { content: accumulated });
        lastFlush = Date.now();
      } finally {
        flushPending = false;
      }
    }

    // Prepare DB rows (best-effort)
    if (canPersist && db) {
      try {
        await ensureConversation(db, { conversationId, userId: session!.id as string });
        // Insert the user's message as completed
        await insertMessage(db, {
          conversationId,
          userId: session!.id as string,
          role: 'user',
          content: message,
          status: 'completed',
          replyToId: replyToId ?? null,
          model: null,
        });
        // Insert placeholder for assistant message with streaming status
        const a = await insertMessage(db, {
          conversationId,
          userId: session!.id as string,
          role: 'assistant',
          content: '',
          status: 'streaming',
          replyToId: null,
          model: modelName,
        });
        aiMessageId = a.id;
      } catch (e) {
        console.error('DB init error (stream):', e);
      }
    }

    try {
      // Generate streaming response from the AI
      const stream = await chutesClient.generateStream({
        prompt: "",
        model: modelName,
        messages: messages,
        temperature: 0.7,
        max_tokens: 8000,
        thinking_mode: thinkingMode,
        stream: true
      });
      
      // Process the stream and persist chunks
      const processedStream = processChutesStream(stream, message, {
        onTextChunk: async (text: string) => {
          if (!text) return;
          accumulated += text;
          await flushIfNeeded();
        },
        onDone: async () => {
          if (canPersist && aiMessageId && db) {
            try {
              await flushIfNeeded(true);
              await updateMessage(db, aiMessageId, { status: 'completed' });
            } catch (e) {
              console.error('DB finalize error (stream):', e);
            }
          }
        },
      });
      
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
      // Mark message as error if we had created one
      if (canPersist && aiMessageId && db) {
        try {
          await updateMessage(db, aiMessageId, { status: 'error' });
        } catch {}
      }
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
 