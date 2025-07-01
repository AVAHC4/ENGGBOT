import { NextRequest, NextResponse } from 'next/server';
import { DocumentService, documentTemplates, DocumentContent, DocumentSection } from '../../../../../shared/services/document-service';

/**
 * Document Generation API Endpoint
 * 
 * Handles requests to generate documents from AI output
 */
export async function POST(request: NextRequest) {
  try {
    const { content, format, template, fileName } = await request.json();
    
    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }
    
    // Create document service
    const documentService = new DocumentService();
    
    // Parse AI output into document structure
    const parsedContent = documentService.parseAIOutputToDocument(content);
    
    // If template is provided, merge with template base
    let finalContent = parsedContent;
    if (template && typeof template === 'string' && template in documentTemplates) {
      const selectedTemplate = documentTemplates[template as keyof typeof documentTemplates];
      
      // Use template structure but keep parsed content where available
      finalContent = {
        title: parsedContent.title || selectedTemplate.title,
        author: parsedContent.author,
        date: new Date().toLocaleDateString(),
        sections: selectedTemplate.sections.map(templateSection => {
          // Try to find matching section in parsed content
          const matchingSection = parsedContent.sections.find(
            s => s.title.toLowerCase() === templateSection.title.toLowerCase()
          );
          
          if (matchingSection) {
            return {
              ...templateSection,
              content: matchingSection.content
            } as DocumentSection;
          }
          
          return templateSection as DocumentSection;
        })
      };
    }
    
    // Return the document content to be generated on the client side
    return NextResponse.json({
      success: true,
      content: finalContent,
      format,
      fileName: fileName || 'document'
    });
    
  } catch (error) {
    console.error('Error generating document:', error);
    return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 });
  }
} 