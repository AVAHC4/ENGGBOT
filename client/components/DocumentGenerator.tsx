import React, { useState } from 'react';
import { DocumentService } from '../../shared/services/document-service';

interface DocumentGeneratorProps {
  aiOutput: string;
  onClose: () => void;
}

/**
 * Document Generator Component
 * 
 * Allows users to generate documents from AI output
 */
const DocumentGenerator: React.FC<DocumentGeneratorProps> = ({ aiOutput, onClose }) => {
  const [format, setFormat] = useState<'docx' | 'pdf'>('docx');
  const [template, setTemplate] = useState<'default' | 'resume' | 'report' | 'letter'>('default');
  const [fileName, setFileName] = useState('document');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Generate and download document
   */
  const generateDocument = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/document-generation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: aiOutput,
          format,
          template,
          fileName,
        }),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
      
      // Generate and download the document
      const documentService = new DocumentService();
      
      if (format === 'docx') {
        await documentService.createAndDownloadWordDocument(
          data.content.title,
          data.content.sections,
          data.content.author,
          `${fileName}.docx`
        );
      } else {
        await documentService.createAndDownloadPdfDocument(
          data.content.title,
          data.content.sections,
          data.content.author,
          `${fileName}.pdf`
        );
      }

      onClose();
    } catch (err) {
      console.error('Error generating document:', err);
      setError('Failed to generate document. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-lg shadow-xl max-w-md w-full p-6 border border-zinc-700">
        <h2 className="text-xl font-semibold text-white mb-4">Generate Document</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Document Format</label>
            <div className="flex space-x-4">
              <button
                type="button"
                className={`px-4 py-2 rounded-md ${
                  format === 'docx' 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
                onClick={() => setFormat('docx')}
              >
                Word (.docx)
              </button>
              <button
                type="button"
                className={`px-4 py-2 rounded-md ${
                  format === 'pdf' 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
                onClick={() => setFormat('pdf')}
              >
                PDF (.pdf)
              </button>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Template</label>
            <select
              value={template}
              onChange={(e) => setTemplate(e.target.value as any)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="default">Default</option>
              <option value="resume">Resume</option>
              <option value="report">Report</option>
              <option value="letter">Letter</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="fileName" className="block text-sm font-medium text-zinc-300 mb-1">
              File Name
            </label>
            <input
              type="text"
              id="fileName"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Enter file name"
            />
          </div>
          
          {error && (
            <div className="text-red-400 text-sm py-2 px-3 bg-red-900/30 border border-red-900 rounded-md">
              {error}
            </div>
          )}
          
          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={generateDocument}
              disabled={isGenerating}
              className={`px-4 py-2 rounded-md ${
                isGenerating
                  ? 'bg-indigo-700 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-500'
              } text-white`}
            >
              {isGenerating ? 'Generating...' : 'Generate Document'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentGenerator; 