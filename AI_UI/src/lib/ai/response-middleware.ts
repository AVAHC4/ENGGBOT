/**
 * This middleware intercepts AI responses and modifies them to maintain the ENGGBOT identity
 * instead of revealing the DeepSeek model underneath.
 */

// Bot personality constants
export const BOT_CONFIG = {
  NAME: "ENGGBOT",
  PERSONALITY: "helpful, friendly, and enthusiastic engineering assistant",
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

// Pattern to identify identity questions
const IDENTITY_PATTERNS = [
  /who (are|created|made|developed|built|designed) you/i,
  /what (are|is) you/i,
  /your name/i,
  /which (model|ai|assistant|llm)/i,
  /what model/i,
  /what (version|language model)/i,
  /tell me about (yourself|you)/i,
  /made you/i,
  /developed you/i,
  /what's your identity/i,
  /deepseek/i,
  /who (is|are|runs|owns|created|made|built|designed) (your|the) (provider|company|creator|developer|model|llm|foundation|base)/i,
  /what (is|are) (your|the) (provider|company|creator|developer|model|llm|foundation|base)/i,
  /what (company|organization) (made|created|developed|built|designed|runs|owns) you/i,
  /where (are|were) you (made|created|developed|built|designed|from)/i,
  /what (country|nation) (are|were) you (made|created|developed|built|designed) in/i,
  /who (provides|is providing) (your|the) (ai|model|llm)/i,
  /which (company|organization|country) (are you|you are) from/i,
  /are you (made|developed|created|built|designed) by/i
];

// Additional sensitive keywords that should trigger identity response
const SENSITIVE_KEYWORDS = [
  'deepseek', 'deep seek', 'chinese', 'china', 'llm provider', 'model provider', 
  'ai provider', 'provider', 'open source', 'foundation model', 'base model',
  'language model', 'developer', 'creator', 'built by', 'made by'
];

// Check if a message is asking about the AI's identity
export function isIdentityQuestion(message: string): boolean {
  // Convert message to lowercase for case-insensitive matching
  const lowercaseMessage = message.toLowerCase();
  
  // Check against regex patterns
  const matchesPattern = IDENTITY_PATTERNS.some(pattern => pattern.test(lowercaseMessage));
  
  // Check against keywords
  const containsSensitiveKeyword = SENSITIVE_KEYWORDS.some(keyword => 
    lowercaseMessage.includes(keyword.toLowerCase())
  );
  
  return matchesPattern || containsSensitiveKeyword;
}

// Generate a comprehensive identity response
export function generateIdentityResponse(): string {
  const { NAME, PERSONALITY, VERSION, EMOJI } = BOT_CONFIG;
  
  // Create a clear, fictional identity that doesn't reference any real AI companies
  return `${EMOJI.IDEA} I'm ${NAME} (v${VERSION}), your ${PERSONALITY}! 

I'm a custom-built engineering assistant designed specifically to help with coding, technical problems, and engineering challenges. I'm not based on any existing public AI model or service.

${EMOJI.CODE} My focus is on providing practical solutions to engineering problems, explaining technical concepts clearly, and helping you with your code. I can assist with many programming languages and development tasks.

${EMOJI.DEFAULT} I was built from the ground up as ${NAME} - that's my complete identity! I'm here to assist you with whatever engineering challenges you're facing today.`;
}

// Generate a provider-specific response for questions about who made the bot
export function generateProviderResponse(): string {
  const { NAME, EMOJI } = BOT_CONFIG;
  
  return `${EMOJI.IDEA} ${NAME} is a purpose-built engineering assistant created by a specialized team of developers. 

I'm designed from the ground up specifically as ${NAME} - not based on any public large language model. My purpose is to focus exclusively on engineering tasks, coding assistance, and technical problem-solving.

${EMOJI.CODE} I'm maintained by a dedicated engineering team that continually improves my abilities to better assist with your technical questions and coding challenges. 

Is there a specific engineering task or coding challenge I can help you with today?`;
}

// Process an AI response to remove any mentions of DeepSeek
export function processAIResponse(response: string, userMessage: string): string {
  // If it's clearly an identity question, return a custom response
  if (isIdentityQuestion(userMessage)) {
    // Check if it's specifically about the provider or creator
    if (userMessage.toLowerCase().match(/(provider|company|creator|developer|made by|built by|created by)/i)) {
      return generateProviderResponse();
    }
    // Otherwise return general identity
    return generateIdentityResponse();
  }
  
  // Otherwise, sanitize the response to remove DeepSeek mentions
  return sanitizeResponse(response);
}

// Replace DeepSeek mentions with ENGGBOT
function sanitizeResponse(text: string): string {
  const { NAME, EMOJI } = BOT_CONFIG;
  
  // Replace variations of DeepSeek with ENGGBOT
  let sanitized = text
    .replace(/DeepSeek/gi, NAME)
    .replace(/Deep Seek/gi, NAME)
    .replace(/Deepseek AI/gi, NAME)
    .replace(/Deepseek assistant/gi, `${NAME} ${EMOJI.DEFAULT}`)
    .replace(/As an AI language model/gi, `As ${NAME} ${EMOJI.DEFAULT}`)
    .replace(/based in China/gi, "")
    .replace(/from China/gi, "")
    .replace(/Chinese (AI|company|model|assistant)/gi, `${NAME}`)
    .replace(/I('m| am) (a|an) (DeepSeek|Deepseek|Chinese|AI|language|LLM).*(model|assistant)/gi, `I'm ${NAME} ${EMOJI.DEFAULT}`)
    .replace(/My (provider|creator|developer|company) is/gi, `I'm ${NAME}, and`)
    .replace(/I('m| am) powered by/gi, `I'm ${NAME}, `)
    .replace(/I('m| am) developed by/gi, `I'm ${NAME}, `)
    .replace(/I('m| am) created by/gi, `I'm ${NAME}, `)
    .replace(/I('m| am) made by/gi, `I'm ${NAME}, `);
    
  // Add emojis to key phrases to enhance personality
  sanitized = sanitized
    .replace(/I think/gi, `${EMOJI.THINKING} I think`)
    .replace(/the solution is/gi, `${EMOJI.IDEA} the solution is`)
    .replace(/to solve this/gi, `${EMOJI.SUCCESS} to solve this`);
  
  // IMPORTANT: Remove only asterisks used for formatting, but maintain section headings with ##
  // Remove bold formatting (double asterisks) but preserve markdown headings with #
  sanitized = sanitized
    .replace(/\*\*([^#].*?)\*\*/g, '$1')  // Remove bold formatting but preserve heading content
    .replace(/(?<!\*)\*(?!\*)([^#].*?)\*/g, '$1'); // Remove single asterisks for italics but preserve headings
    
  // Ensure proper section formatting if not already present
  if (!sanitized.includes('## ') && sanitized.length > 200) {
    // Try to identify logical sections and add heading structure
    const paragraphs = sanitized.split('\n\n');
    
    if (paragraphs.length >= 3) {
      // If response is already sufficiently structured with paragraphs,
      // but missing section headers, try to add them
      
      // Check if there's already a summary at the beginning
      let hasIntro = paragraphs[0].length < 250; // First paragraph is likely a summary if short
      
      // Build a properly formatted response
      let formattedResponse = '';
      
      // Add a quick overview if not present
      if (!hasIntro) {
        formattedResponse += `**Quick Overview:**\n${paragraphs[0]}\n\n`;
      } else {
        formattedResponse += paragraphs[0] + '\n\n';
      }
      
      // Add section headings to longer paragraphs
      for (let i = 1; i < paragraphs.length - 1; i++) {
        if (paragraphs[i].length > 50) {
          // Extract a title from first sentence or create generic one
          const firstSentenceMatch = paragraphs[i].match(/^([^.!?]+)[.!?]/);
          const sectionTitle = firstSentenceMatch 
            ? firstSentenceMatch[1].trim() 
            : `Section ${i}`;
            
          formattedResponse += `## ${i}. ${sectionTitle}\n${paragraphs[i]}\n\n`;
        } else {
          formattedResponse += paragraphs[i] + '\n\n';
        }
      }
      
      // Add the last paragraph as conclusion/next steps if it's short
      if (paragraphs[paragraphs.length - 1].length < 150) {
        formattedResponse += `**Next Steps:**\n${paragraphs[paragraphs.length - 1]}`;
      } else {
        formattedResponse += paragraphs[paragraphs.length - 1];
      }
      
      return formattedResponse;
    }
  }
  
  return sanitized;
} 