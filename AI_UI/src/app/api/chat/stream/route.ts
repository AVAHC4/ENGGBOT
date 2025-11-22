import { NextResponse } from 'next/server';
import { AVAILABLE_MODELS, ChutesClient } from '@/lib/ai/chutes-client';
import { processAIResponse, BOT_CONFIG, generateMarkdownSystemPrompt, isIdentityQuestion, EXACT_IDENTITY_REPLY } from '@/lib/ai/response-middleware';
import { ENGINEERING_SYSTEM_PROMPT } from '@/lib/prompts/engineering-prompt';

export const runtime = 'nodejs';

// Simple stream processor to transform OpenRouter stream into an event stream
function processChutesStream(
  stream: ReadableStream,
  userMessage: string,
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

              // Parse JSON for normal dat
              const data = JSON.parse(jsonData);

              if (data.choices && data.choices[0]?.delta?.content) {
                const content = data.choices[0].delta.content;

                // Apply minimal processing to preserve formatting
                const processedContent = processAIResponse(content, userMessage);

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
function formatConversationHistory(history: any[]): Array<{ role: string, content: string }> {
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
      rawMessage,
      hasAttachments = false,
      model = "z-ai/glm-4.5-air:free",
      thinkingMode = true,
      engineeringMode = false,
      conversationHistory = []
    } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required and must be a string' },
        { status: 400 }
      );
    }

    const identityProbeText = typeof rawMessage === 'string' && rawMessage.trim().length > 0 ? rawMessage : message;

    // Short-circuit identity/origin questions with exact mandated reply
    if (isIdentityQuestion(identityProbeText)) {
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

    // Instantiate server-side client with secure API key (fallback to default when unset)
    const apiKey = typeof process !== 'undefined'
      ? process.env.OPENROUTER_API_KEY
      : undefined;
    if (!apiKey) {
      console.warn("OPENROUTER_API_KEY is not set. Falling back to default key. Configure this env var in production.");
    }
    const chutesClient = apiKey
      ? new ChutesClient({ apiKey })
      : new ChutesClient();

    // Always use the Z.AI GLM 4.5 Air (free) model
    const modelName = AVAILABLE_MODELS["zai-glm-4.5-air-free"];

    // Format messages for the API
    const messages = [];

    // Add a system message to help shape the assistant's identity
    messages.push({
      role: 'system',
      content: engineeringMode ? ENGINEERING_SYSTEM_PROMPT : generateMarkdownSystemPrompt()
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

      // Process the stream
      const processedStream = processChutesStream(stream, identityProbeText);

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
