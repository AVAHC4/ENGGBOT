import jsPDF from 'jspdf';

export interface DocumentOptions {
  title?: string;
  author?: string;
  subject?: string;
  content: string;
  codeLanguage?: string;
}

/**
 * Generate and download a Word document
 * Currently using a text file as fallback due to docx module loading issues
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
 * Generate and download a PDF document
 */
export function generatePdfDocument(options: DocumentOptions): void {
  const { title = 'Document', author = 'AI Compiler', content } = options;
  
  // Create PDF using jsPDF
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(18);
  doc.text(title, 105, 20, { align: 'center' });
  
  // Add content
  doc.setFontSize(12);
  
  // Split content into lines and add them to the PDF
  const lines = content.split('\n');
  let y = 40;
  
  for (let i = 0; i < lines.length; i++) {
    // Check if we need a new page
    if (y > 280) {
      doc.addPage();
      y = 20;
    }
    
    // Format code with monospace font if needed
    if (options.codeLanguage) {
      doc.setFont('courier');
    } else {
      doc.setFont('helvetica');
    }
    
    // Add the line
    doc.text(lines[i], 20, y);
    y += 7;
  }
  
  // Save PDF
  doc.save(`${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
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