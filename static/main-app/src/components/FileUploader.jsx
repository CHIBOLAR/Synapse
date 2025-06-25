import React, { useState, useCallback } from 'react';

/**
 * 📁 File Uploader Component
 * 
 * Handles secure file upload with validation
 * Supports .txt and .docx files with size limits
 * Provides drag-and-drop and click-to-upload functionality
 */

const FileUploader = ({ onFileUpload, supportedFormats, maxSize }) => {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);

  /**
   * Handle file selection
   */
  const handleFileSelect = useCallback(async (file) => {
    if (!file) return;

    try {
      setUploading(true);

      // Validate file type
      const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
      if (!supportedFormats.includes(fileExtension)) {
        throw new Error(`Unsupported file type. Supported: ${supportedFormats.join(', ')}`);
      }

      // Validate file size
      if (file.size > maxSize) {
        throw new Error(`File too large. Maximum size: ${(maxSize / 1024).toFixed(0)}KB`);
      }

      // Read file content
      const content = await readFileContent(file);
      
      // Pass to parent component
      await onFileUpload(file, content);

    } catch (error) {
      console.error('File upload error:', error);
      alert(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  }, [onFileUpload, supportedFormats, maxSize]);

  /**
   * Read file content as text
   */
  const readFileContent = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Failed to read file'));
      
      reader.readAsText(file);
    });
  };

  /**
   * Handle drag events
   */
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  /**
   * Handle file input change
   */
  const handleInputChange = useCallback((e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  return (
    <div className="file-uploader">
      <div
        className={`upload-zone ${dragOver ? 'drag-over' : ''} ${uploading ? 'uploading' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-input').click()}
      >
        {uploading ? (
          <div className="upload-progress">
            <div className="spinner"></div>
            <p>Processing file...</p>
          </div>
        ) : (
          <div className="upload-content">
            <div className="upload-icon">📁</div>
            <h3>Upload Meeting Notes</h3>
            <p>Drag and drop your file here, or click to browse</p>
            <div className="upload-specs">
              <span>Supported: {supportedFormats.join(', ')}</span>
              <span>Max size: {(maxSize / 1024).toFixed(0)}KB</span>
            </div>
          </div>
        )}
      </div>

      <input
        id="file-input"
        type="file"
        accept={supportedFormats.join(',')}
        onChange={handleInputChange}
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default FileUploader;