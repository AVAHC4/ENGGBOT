 

 
export const AVAILABLE_MODELS = {
    "gpt-oss": "openai/gpt-oss-120b:free",
};

 
interface OpenRouterClientOptions {
    apiKey?: string;
    defaultModel?: string;
}

 
interface GenerateOptions {
    prompt: string;
    model?: string;
    temperature?: number;
    max_tokens?: number;
    thinking_mode?: boolean;
    messages?: Array<{ role: string, content: string }>;
    stream?: boolean;
}

 
export class OpenRouterClient {
    private apiKey: string;
    private apiUrl: string;
    private defaultModel: string;
    private headers: Record<string, string>;

    constructor(options?: OpenRouterClientOptions) {
        this.apiKey = options?.apiKey?.trim() || "";
        this.apiUrl = "https://openrouter.ai/api/v1/chat/completions";
        this.defaultModel = options?.defaultModel || AVAILABLE_MODELS["gpt-oss"];

         
        const refererUrl = typeof process !== 'undefined' && process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SITE_URL
                ? process.env.NEXT_PUBLIC_SITE_URL
                : "https://enggbot.me");

        this.headers = {
            "Authorization": `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": refererUrl,
            "X-Title": "EnggBot"  
        };

        if (!this.apiKey) {
            console.warn("OpenRouterClient initialized without an API key.");
        }

        console.log(`Initialized OpenRouter client with model: ${this.defaultModel}`);
    }

     
    async generate(options: GenerateOptions): Promise<string> {
        try {
            const { prompt, model, temperature = 0.7, max_tokens = 1024, thinking_mode = false, messages, stream = false } = options;

             
            const modelName = model || this.defaultModel;

             
            let messagePayload;
            if (messages && messages.length > 0) {
                 
                messagePayload = messages;

                 
                if (thinking_mode) {
                    const lastMsg = messagePayload[messagePayload.length - 1];
                    if (lastMsg.role === 'user') {
                        const thinkingPrompt = prompt.includes("?")
                            ? " Please think step by step and show your reasoning process."
                            : " Please think step by step and explain your thought process.";

                         
                        messagePayload = [...messagePayload.slice(0, -1), { ...lastMsg, content: lastMsg.content + thinkingPrompt }];
                    }
                }
            } else {
                 
                let actualPrompt = prompt;
                if (thinking_mode) {
                    if (prompt.includes("?")) {
                        actualPrompt = prompt + " Please think step by step and show your reasoning process.";
                    } else {
                        actualPrompt = prompt + " Please think step by step and explain your thought process.";
                    }
                }

                 
                messagePayload = [{ "role": "user", "content": actualPrompt }];
            }

            const payload = {
                "model": modelName,
                "messages": messagePayload,
                "temperature": temperature,
                "max_tokens": max_tokens,
                "stream": stream
            };

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000);  

            try {
                const response = await fetch(this.apiUrl, {
                    method: 'POST',
                    headers: this.headers,
                    body: JSON.stringify(payload),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    const errorText = await response.text().catch(() => "No error details available");
                    console.warn(`OpenRouter API error for model ${modelName} (${response.status}): ${errorText}`);
                    throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText.substring(0, 200)}`);
                }

                const result = await response.json();
                if (result.choices && result.choices.length > 0) {
                    return result.choices[0].message.content;
                } else {
                    return "No content returned from the API.";
                }
            } catch (err) {
                clearTimeout(timeoutId);
                throw err;
            }
        } catch (error) {
            console.error("Error generating AI response:", error);
            return `Error: ${error instanceof Error ? error.message : String(error)}`;
        }
    }

     
    async generateStream(options: GenerateOptions): Promise<ReadableStream> {
        const { prompt, model, temperature = 0.7, max_tokens = 1024, thinking_mode = false, messages } = options;

         
        const modelName = model || this.defaultModel;

         
        let messagePayload;
        if (messages && messages.length > 0) {
             
            messagePayload = messages;

             
            if (thinking_mode) {
                const lastMsg = messagePayload[messagePayload.length - 1];
                if (lastMsg.role === 'user') {
                    const thinkingPrompt = prompt.includes("?")
                        ? " Please think step by step and show your reasoning process."
                        : " Please think step by step and explain your thought process.";

                     
                    messagePayload = [...messagePayload.slice(0, -1), { ...lastMsg, content: lastMsg.content + thinkingPrompt }];
                }
            }
        } else {
             
            let actualPrompt = prompt;
            if (thinking_mode) {
                if (prompt.includes("?")) {
                    actualPrompt = prompt + " Please think step by step and show your reasoning process.";
                } else {
                    actualPrompt = prompt + " Please think step by step and explain your thought process.";
                }
            }

             
            messagePayload = [{ "role": "user", "content": actualPrompt }];
        }

        const payload = {
            "model": modelName,
            "messages": messagePayload,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": true
        };

        const controller = new AbortController();
         

        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify(payload),
                signal: controller.signal
            });

            if (!response.ok) {
                const errorText = await response.text().catch(() => "No error details available");
                console.warn(`OpenRouter API error for model ${modelName} (${response.status}): ${errorText}`);
                throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText.substring(0, 200)}`);
            }

             
            return response.body!;
        } catch (err) {
            throw err;
        }
    }

     
    switchModel(modelKey: string): boolean {
        if (modelKey in AVAILABLE_MODELS) {
            this.defaultModel = AVAILABLE_MODELS[modelKey as keyof typeof AVAILABLE_MODELS];
            console.log(`Switched to model: ${this.defaultModel}`);
            return true;
        } else {
            console.log(`Model key '${modelKey}' not found. Available keys: ${Object.keys(AVAILABLE_MODELS)}`);
            return false;
        }
    }

     
    listModels(): Record<string, string> {
        return AVAILABLE_MODELS;
    }
}
