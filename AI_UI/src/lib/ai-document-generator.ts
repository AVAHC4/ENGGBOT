import { generateWordDocument, generatePdfDocument, DocumentOptions } from './document-generator';

export interface AIDocumentRequest {
  prompt: string;
  format: 'word' | 'pdf';
  title?: string;
  type?: 'essay' | 'report' | 'letter' | 'resume' | 'other';
  length?: 'short' | 'medium' | 'long';
}

/**
 * Generate document content based on AI prompt
 */
export async function generateDocumentContent(request: AIDocumentRequest): Promise<string> {
  // This would typically call an AI service API
  // For now, we'll create a simple template-based system
  
  const { prompt, type = 'essay', length = 'medium' } = request;
  
  // Default title if not provided
  const title = request.title || prompt.split(' ').slice(0, 5).join(' ');
  
  // Simulated AI document generation
  let content = '';
  
  // Add title
  content += `${title}\n\n`;
  
  // Determine length parameters
  const paragraphCount = length === 'short' ? 3 : length === 'medium' ? 5 : 8;
  const sentencesPerParagraph = length === 'short' ? 4 : length === 'medium' ? 6 : 8;
  
  // Generate content based on type
  if (type === 'essay') {
    content += `Introduction\n\n`;
    content += generateParagraph(prompt, sentencesPerParagraph);
    content += '\n\n';
    
    // Generate body paragraphs
    for (let i = 0; i < paragraphCount - 2; i++) {
      content += generateParagraph(prompt, sentencesPerParagraph);
      content += '\n\n';
    }
    
    content += `Conclusion\n\n`;
    content += generateParagraph(prompt, sentencesPerParagraph);
  } 
  else if (type === 'report') {
    content += `Executive Summary\n\n`;
    content += generateParagraph(prompt, sentencesPerParagraph);
    content += '\n\n';
    
    content += `Findings\n\n`;
    for (let i = 0; i < paragraphCount - 3; i++) {
      content += `Key Finding ${i + 1}\n\n`;
      content += generateParagraph(prompt, sentencesPerParagraph);
      content += '\n\n';
    }
    
    content += `Recommendations\n\n`;
    content += generateParagraph(prompt, sentencesPerParagraph);
  }
  else if (type === 'letter') {
    content += `Dear Recipient,\n\n`;
    
    for (let i = 0; i < paragraphCount; i++) {
      content += generateParagraph(prompt, sentencesPerParagraph);
      content += '\n\n';
    }
    
    content += `Sincerely,\n\nYour Name`;
  }
  else if (type === 'resume') {
    content += `Professional Summary\n\n`;
    content += generateParagraph(prompt, sentencesPerParagraph - 2);
    content += '\n\n';
    
    content += `Experience\n\n`;
    for (let i = 0; i < 3; i++) {
      content += `Position ${i + 1}\n`;
      content += `Company Name | Location | Date - Date\n\n`;
      content += generateBulletPoints(prompt, 4);
      content += '\n\n';
    }
    
    content += `Education\n\n`;
    content += `Degree Name | Institution | Year\n\n`;
    content += generateBulletPoints(prompt, 2);
    content += '\n\n';
    
    content += `Skills\n\n`;
    content += generateBulletPoints(prompt, 6);
  }
  else {
    // Generic document
    for (let i = 0; i < paragraphCount; i++) {
      content += generateParagraph(prompt, sentencesPerParagraph);
      content += '\n\n';
    }
  }
  
  return content;
}

/**
 * Generate and export an AI document based on prompt
 */
export async function createAIDocument(request: AIDocumentRequest): Promise<void> {
  const { format, title = 'AI Generated Document' } = request;
  
  // Generate content
  const content = await generateDocumentContent(request);
  
  // Generate document
  const documentOptions: DocumentOptions = {
    title,
    content,
    subject: request.prompt,
  };
  
  // Export in requested format
  if (format === 'word') {
    await generateWordDocument(documentOptions);
  } else {
    generatePdfDocument(documentOptions);
  }
  
  return Promise.resolve();
}

// Helper function to generate a paragraph
function generateParagraph(topic: string, sentenceCount: number): string {
  const sentences = [
    `This document explores ${topic}.`,
    `There are several important aspects to consider about ${topic}.`,
    `Many experts have studied ${topic} extensively.`,
    `Research has shown significant findings related to ${topic}.`,
    `The implications of ${topic} are far-reaching.`,
    `Understanding ${topic} requires careful analysis.`,
    `The development of ${topic} has evolved over time.`,
    `Various methodologies can be applied to ${topic}.`,
    `The future of ${topic} looks promising.`,
    `Challenges related to ${topic} must be addressed.`,
    `Solutions for issues with ${topic} continue to emerge.`,
    `The significance of ${topic} cannot be overstated.`,
  ];
  
  // Select random sentences
  const paragraph = [];
  for (let i = 0; i < sentenceCount; i++) {
    const randomIndex = Math.floor(Math.random() * sentences.length);
    paragraph.push(sentences[randomIndex]);
  }
  
  return paragraph.join(' ');
}

// Helper function to generate bullet points
function generateBulletPoints(topic: string, count: number): string {
  const points = [
    `Implemented solutions related to ${topic}`,
    `Developed strategies for ${topic}`,
    `Managed projects involving ${topic}`,
    `Analyzed data related to ${topic}`,
    `Improved processes for ${topic}`,
    `Collaborated with teams on ${topic}`,
    `Designed systems for ${topic}`,
    `Conducted research on ${topic}`,
    `Created documentation for ${topic}`,
    `Provided training on ${topic}`,
  ];
  
  // Select random bullet points
  const bullets = [];
  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * points.length);
    bullets.push(`- ${points[randomIndex]}`);
  }
  
  return bullets.join('\n');
} 