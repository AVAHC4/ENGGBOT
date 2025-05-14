/**
 * Formatting middleware for ENGGBOT responses
 * Implements the specified structure and styling guidelines for all AI responses
 */

import { BOT_CONFIG } from './response-middleware';

// Maximum number of sentences in the opening summary
const MAX_SUMMARY_SENTENCES = 4;

// Extracts summary from content, limiting to MAX_SUMMARY_SENTENCES
function extractSummary(content: string): string {
  // Split content into sentences
  const sentences = content.split(/(?<=[.!?])\s+/);
  
  // Take the first few sentences for the summary
  const summary = sentences.slice(0, MAX_SUMMARY_SENTENCES).join(' ');
  
  return summary.trim();
}

// Detects code blocks in the content
function detectCodeBlocks(content: string): { code: string, language: string }[] {
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
  const codeBlocks: { code: string, language: string }[] = [];
  
  let match;
  while ((match = codeBlockRegex.exec(content)) !== null) {
    codeBlocks.push({
      language: match[1] || 'text',
      code: match[2].trim()
    });
  }
  
  return codeBlocks;
}

// Creates a formatted table from unformatted text
function formatTable(tableContent: string): string {
  // Split the table into lines
  const lines = tableContent.trim().split('\n');
  
  // Check if this is actually a table
  if (lines.length < 2) return tableContent;
  
  // Format with proper markdown table syntax
  let formattedTable = '';
  
  // Add table headers
  const headers = lines[0].split('|').map(header => header.trim());
  formattedTable += '| ' + headers.join(' | ') + ' |\n';
  
  // Add divider row
  formattedTable += '|' + headers.map(() => '---').join('|') + '|\n';
  
  // Add data rows
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '') continue;
    const cells = lines[i].split('|').map(cell => cell.trim());
    formattedTable += '| ' + cells.join(' | ') + ' |\n';
  }
  
  return formattedTable;
}

// Converts bulleted lists to properly formatted markdown
function formatLists(content: string): string {
  // Replace any * bullet points with - for consistency
  let formatted = content.replace(/^\s*\*\s+/gm, '- ');
  
  // Ensure proper spacing for bullet points
  formatted = formatted.replace(/^-\s+/gm, '- ');
  
  return formatted;
}

// Removes duplicate newlines to keep content readable but not overly spaced
function normalizeSpacing(content: string): string {
  return content.replace(/\n{3,}/g, '\n\n');
}

// Extracts sections and formats them with markdown headers
function extractSections(content: string): { title: string, content: string }[] {
  // Identify all headings in the content
  const headingRegex = /^(#+)\s+(.+)$/gm;
  const headings: { level: number, title: string, index: number }[] = [];
  
  let match;
  while ((match = headingRegex.exec(content)) !== null) {
    headings.push({
      level: match[1].length,
      title: match[2].trim(),
      index: match.index
    });
  }
  
  // If no headings found, create a default section
  if (headings.length === 0) {
    // Split content into paragraphs
    const paragraphs = content.split(/\n\s*\n/);
    
    // Use first paragraph to generate a title if possible
    const title = paragraphs[0].length < 40 ? 
      paragraphs[0].replace(/[^a-zA-Z0-9\s]/g, '').trim() : 
      'Information';
      
    return [{
      title,
      content
    }];
  }
  
  // Convert headings to sections with content
  const sections: { title: string, content: string }[] = [];
  
  for (let i = 0; i < headings.length; i++) {
    const heading = headings[i];
    const nextHeadingIndex = i + 1 < headings.length ? headings[i + 1].index : content.length;
    
    // Extract section content (excluding the heading itself)
    const headingEndIndex = content.indexOf('\n', heading.index);
    const sectionContent = content.substring(
      headingEndIndex + 1, 
      nextHeadingIndex
    ).trim();
    
    sections.push({
      title: heading.title,
      content: sectionContent
    });
  }
  
  return sections;
}

// Generates next steps suggestion based on content
function generateNextSteps(content: string): string {
  // Look for keywords about next steps
  const nextStepsKeywords = ['next', 'try', 'further', 'additional', 'more', 'continue'];
  
  // Split content into sentences
  const sentences = content.split(/(?<=[.!?])\s+/);
  
  // Find sentences that might be suggesting next steps
  let nextStepsSentences = sentences.filter(sentence => 
    nextStepsKeywords.some(keyword => 
      sentence.toLowerCase().includes(keyword)
    )
  );
  
  // If we found potential next steps, return them
  if (nextStepsSentences.length > 0) {
    // Get the last relevant sentence as next steps
    return nextStepsSentences[nextStepsSentences.length - 1];
  }
  
  // If no clear next steps in the content, provide a generic prompt
  return "Let me know if you'd like me to elaborate on any specific part of this response.";
}

// Add numbered indexes to major sections
function addSectionNumbers(sections: { title: string, content: string }[]): { title: string, content: string }[] {
  return sections.map((section, index) => ({
    title: `${index + 1}. ${section.title}`,
    content: section.content
  }));
}

// Check for citations in the content and format them properly
function extractAndFormatCitations(content: string): { 
  processedContent: string, 
  citations: { reference: string, url: string }[] 
} {
  const citationRegex = /\[(\d+)\]/g;
  const urlRegex = /(https?:\/\/[^\s\]]+)/g;
  
  let processedContent = content;
  const citations: { reference: string, url: string }[] = [];
  
  // Extract URLs and convert them to citation format
  let urlMatch;
  let citationIndex = 1;
  
  while ((urlMatch = urlRegex.exec(content)) !== null) {
    const url = urlMatch[0];
    
    // Skip URLs that are already part of a citation
    if (content.substring(Math.max(0, urlMatch.index - 20), urlMatch.index).includes('[')) {
      continue;
    }
    
    // Replace the URL with a citation marker
    processedContent = processedContent.replace(url, `[${citationIndex}]`);
    
    // Add to citations
    citations.push({
      reference: `Reference ${citationIndex}`,
      url
    });
    
    citationIndex++;
  }
  
  return { processedContent, citations };
}

// Format the citations as footnotes
function formatCitationsAsFootnotes(citations: { reference: string, url: string }[]): string {
  if (citations.length === 0) return '';
  
  let footnotes = '\n\n';
  
  citations.forEach((citation, index) => {
    footnotes += `[${index + 1}] ${citation.url}\n`;
  });
  
  return footnotes;
}

// Main formatting function that structures the entire response
export function formatENGGBOTResponse(content: string): string {
  try {
    // Process citations first to avoid interference with other formatting
    const { processedContent, citations } = extractAndFormatCitations(content);
    
    // Extract a summary from the first few sentences
    const summary = extractSummary(processedContent);
    
    // Get the main sections
    const rawSections = extractSections(processedContent);
    
    // Format section content and add numbered headings
    const formattedSections = addSectionNumbers(
      rawSections.map(section => ({
        title: section.title,
        content: formatLists(normalizeSpacing(section.content))
      }))
    );
    
    // Generate appropriate next steps
    const nextSteps = generateNextSteps(processedContent);
    
    // Build the final response with proper Markdown formatting
    let formattedResponse = `**Quick Overview:**  
${summary}

${formattedSections.map(section => 
  `## ${section.title}
${section.content}`
).join('\n\n')}

**Next Steps:**  
${nextSteps}`;

    // Add citations if present
    if (citations.length > 0) {
      formattedResponse += formatCitationsAsFootnotes(citations);
    }
    
    return formattedResponse;
  } catch (error) {
    console.error("Error in formatting middleware:", error);
    
    // If there's an error in the formatting, return the original content
    // This ensures we don't break the response even if formatting fails
    return content;
  }
} 