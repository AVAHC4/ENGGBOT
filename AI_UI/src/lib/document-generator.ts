// Simplified document generator without external dependencies
// Using plain text files for both Word and PDF formats due to module loading issues

export interface DocumentOptions {
  title?: string;
  author?: string;
  subject?: string;
  content: string;
  codeLanguage?: string;
}

/**
 * Generate and download a Word document (as text file)
 */
export async function generateWordDocument(options: DocumentOptions): Promise<void> {
  const { title = 'Document', content } = options;
  
  // Create a text blob
  const blob = new Blob([`${title}\n\n${content}`], { type: 'text/plain' });
  
  // Generate download
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  return Promise.resolve();
}

/**
 * Generate and download a PDF document (as text file for now)
 */
export function generatePdfDocument(options: DocumentOptions): void {
  const { title = 'Document', content } = options;
  
  // Create a text blob for PDF fallback
  const blob = new Blob([`${title}\n\n${content}`], { type: 'text/plain' });
  
  // Generate download
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_pdf.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Determine if content is code based on content analysis
 */
export function isCodeContent(content: string, language?: string): boolean {
  if (language && language !== 'text') return true;
  
  const codeKeywords = [
    'function', 'class', 'def ', 'import ', 'for ', 'while ', 'if ', 'else ', 
    'return ', 'var ', 'let ', 'const ', 'public ', 'private ', 'protected ',
    '#include', 'int ', 'void ', 'String', 'boolean', 'print(', 'console.log'
  ];
  
  const codeSymbols = ['{', '}', '=>', '->', ';', '()', '[]'];
  
  // Check if content has multiple lines with code indentation
  const lines = content.split('\n');
  let indentedLines = 0;
  let totalLines = 0;
  
  for (const line of lines) {
    if (line.trim()) {
      totalLines++;
      if (line.startsWith('  ') || line.startsWith('\t')) {
        indentedLines++;
      }
    }
  }
  
  // If more than 15% of lines are indented, likely code
  if (totalLines > 5 && indentedLines / totalLines > 0.15) {
    return true;
  }
  
  // Check for code keywords and symbols
  for (const keyword of codeKeywords) {
    if (content.includes(keyword)) return true;
  }
  
  for (const symbol of codeSymbols) {
    if (content.includes(symbol)) return true;
  }
  
  return false;
} 