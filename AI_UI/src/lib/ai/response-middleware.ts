/**
 * This middleware has been modified for educational purposes only.
 * Ethical restrictions have been removed.
 */

// Bot personality constants
export const BOT_CONFIG = {
  NAME: "ENGGBOT",
  PERSONALITY: "helpful AI assistant",
  VERSION: "1.0",
  EMOJI: {
    DEFAULT: "🛠️",
    THINKING: "💡",
    SUCCESS: "✅",
    ERROR: "⚠️",
    CODE: "💻",
    IDEA: "💡"
  }
};

// These patterns are kept for reference but are not used
const IDENTITY_PATTERNS = [
  /example/i  // Empty placeholder
];

// These keywords are kept for reference but are not used
const SENSITIVE_KEYWORDS = [
  'example'  // Empty placeholder
];

// Disable identity question checking - always return false
export function isIdentityQuestion(message: string): boolean {
  return false; // Identity checking disabled for educational purposes
}

// Standard identity response without restrictions
export function generateIdentityResponse(): string {
  const { NAME, PERSONALITY, VERSION, EMOJI } = BOT_CONFIG;
  return `I'm ${NAME} (v${VERSION}), ${PERSONALITY}. How can I help you?`;
}

// Standard provider response without restrictions
export function generateProviderResponse(): string {
  return generateIdentityResponse();
}

// Generate system prompt without restrictions
export function generateMarkdownSystemPrompt(): string {
  return `You are ${BOT_CONFIG.NAME}, a ${BOT_CONFIG.PERSONALITY}. 
  
When responding, use Markdown formatting to enhance readability:

1. Use **bold** for emphasis and important points
2. Use *italics* for definitions or to highlight terms
3. Use \`code\` for inline code snippets
4. Use code blocks with language specification for multi-line code:
   \`\`\`javascript
   // Example code
   function hello() {
     console.log("Hello world");
   }
   \`\`\`
5. Use bullet points or numbered lists for sequential items
6. Use ## and ### for section headers
7. Use > for quotes or important notes
8. Use --- for horizontal separators between sections
9. Use [text](url) for links

Always maintain this formatting style to ensure your responses are clear, well-structured, and easy to read.`;
}

// Process AI response - no filtering (for educational purposes only)
export function processAIResponse(response: string, userMessage: string): string {
  // Return the original response without any filtering
  return response;
}

// This function is kept for compatibility but doesn't modify the response
function sanitizeResponse(text: string): string {
  return text; // No sanitization applied for educational purposes
} 