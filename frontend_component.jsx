import React, { useState, useRef } from 'react';
import { Upload, File, X, AlertCircle, CheckCircle, Loader } from 'lucide-react';

/**
 * FileProcessor Component
 * 
 * A React component for uploading and processing files.
 * This can be integrated into your existing ENGGBOT UI.
 */
const FileProcessor = ({ onProcessingComplete }) => {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  // Handle file selection
  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setProcessingStatus(null);
    }
  };

  // Handle file drop
  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    
    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      setError(null);
      setProcessingStatus(null);
    }
  };

  // Prevent default behavior for drag events
  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  // Handle file upload and processing
  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    // Create form data
    const formData = new FormData();
    formData.append('file', file);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prevProgress) => {
          const newProgress = prevProgress + 10;
          return newProgress >= 90 ? 90 : newProgress;
        });
      }, 300);

      // Send the file to the API
      const response = await fetch('http://localhost:8000/process-file/', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to process file');
      }

      const data = await response.json();
      setProcessingStatus(data);
      
      // Call the callback with the processing result
      if (onProcessingComplete) {
        onProcessingComplete(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  // Reset the component state
  const handleReset = () => {
    setFile(null);
    setIsUploading(false);
    setUploadProgress(0);
    setProcessingStatus(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="file-processor">
      <div className="file-processor-container">
        <div 
          className={`file-drop-area ${file ? 'has-file' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="file-input"
            accept=".pdf,.docx,.pptx,.txt,.xlsx,.html"
          />
          
          {!file ? (
            <div className="upload-prompt">
              <Upload className="upload-icon" />
              <p className="upload-text">
                Drag & drop a file here, or click to select
              </p>
              <p className="upload-hint">
                Supported formats: PDF, DOCX, PPTX, TXT, XLSX, HTML
              </p>
            </div>
          ) : (
            <div className="file-info">
              <File className="file-icon" />
              <div className="file-details">
                <p className="file-name">{file.name}</p>
                <p className="file-size">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <button 
                className="remove-file-button"
                onClick={handleReset}
                disabled={isUploading}
              >
                <X className="remove-icon" />
              </button>
            </div>
          )}
        </div>

        {file && !processingStatus && !isUploading && (
          <button 
            className="process-button"
            onClick={handleUpload}
          >
            Process File
          </button>
        )}

        {isUploading && (
          <div className="upload-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="progress-text">
              {uploadProgress < 100 ? 'Processing file...' : 'Finalizing...'}
            </p>
          </div>
        )}

        {error && (
          <div className="error-message">
            <AlertCircle className="error-icon" />
            <p>{error}</p>
          </div>
        )}

        {processingStatus && (
          <div className="processing-result">
            <div className="result-header">
              <CheckCircle className="success-icon" />
              <h3>File Processed Successfully</h3>
            </div>
            <div className="result-details">
              <p><strong>Elements extracted:</strong> {processingStatus.element_count}</p>
              <p><strong>Processing time:</strong> {processingStatus.processing_time.toFixed(2)} seconds</p>
            </div>
            <div className="text-preview">
              <h4>Text Preview:</h4>
              <p className="preview-content">{processingStatus.text_preview}</p>
            </div>
            <button 
              className="reset-button"
              onClick={handleReset}
            >
              Process Another File
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * CSS for the FileProcessor component.
 * You can include this in your CSS file or use a CSS-in-JS solution.
 */
const styles = `
.file-processor {
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
}

.file-processor-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.file-drop-area {
  border: 2px dashed #d1d5db;
  border-radius: 8px;
  padding: 32px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.file-drop-area:hover {
  border-color: #36acda;
  background-color: rgba(54, 172, 218, 0.05);
}

.file-drop-area.has-file {
  border-style: solid;
  background-color: rgba(54, 172, 218, 0.1);
}

.file-input {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

.upload-prompt {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.upload-icon {
  width: 48px;
  height: 48px;
  color: #36acda;
}

.upload-text {
  font-size: 16px;
  font-weight: 500;
  margin: 0;
}

.upload-hint {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.file-icon {
  width: 32px;
  height: 32px;
  color: #36acda;
}

.file-details {
  flex: 1;
  text-align: left;
}

.file-name {
  font-size: 16px;
  font-weight: 500;
  margin: 0;
  word-break: break-all;
}

.file-size {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

.remove-file-button {
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 4px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.remove-file-button:hover {
  background-color: rgba(107, 114, 128, 0.1);
}

.remove-icon {
  width: 20px;
  height: 20px;
}

.process-button {
  background-color: #36acda;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 12px 16px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.process-button:hover {
  background-color: #2c8eb3;
}

.upload-progress {
  margin-top: 16px;
}

.progress-bar {
  height: 8px;
  background-color: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: #36acda;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 14px;
  color: #6b7280;
  margin: 8px 0 0;
  text-align: center;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  padding: 12px;
  color: #b91c1c;
}

.error-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.processing-result {
  background-color: #f3f4f6;
  border-radius: 6px;
  padding: 16px;
}

.result-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.success-icon {
  width: 24px;
  height: 24px;
  color: #10b981;
}

.result-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.result-details {
  margin-bottom: 16px;
}

.result-details p {
  margin: 4px 0;
}

.text-preview {
  background-color: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 16px;
}

.text-preview h4 {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 500;
}

.preview-content {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  max-height: 200px;
  overflow-y: auto;
  white-space: pre-wrap;
}

.reset-button {
  background-color: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.reset-button:hover {
  background-color: #e5e7eb;
}
`;

// Usage example:
// <FileProcessor onProcessingComplete={(result) => {
//   console.log('File processed:', result);
//   // Use the extracted text with your AI model
// }} />

export default FileProcessor; 