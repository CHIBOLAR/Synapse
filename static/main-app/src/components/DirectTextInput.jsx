import React, { useState, useCallback } from 'react';

/**
 * 📝 FIXED Direct Text Input Component
 * 
 * Version: 3.0.0 - Works with new backend pattern
 * Simplified to work with parent component's backend handling
 */

const DirectTextInput = ({ onAnalysisStart, addNotification, meetingType }) => {
  const [textContent, setTextContent] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (!textContent.trim()) {
      addNotification('Please enter some meeting notes', 'error');
      return;
    }

    if (textContent.trim().length < 10) {
      addNotification('Meeting notes too short. Please enter at least 10 characters.', 'error');
      return;
    }

    if (textContent.length > 500000) {
      addNotification('Text too long. Maximum 500KB allowed.', 'error');
      return;
    }

    try {
      setIsProcessing(true);
      
      // Pass the text content to parent component for processing
      // Parent will handle backend calls and status polling
      await onAnalysisStart(textContent.trim());
      
      // Clear the text area on successful start
      setTextContent('');

    } catch (error) {
      console.error('Direct text analysis failed:', error);
      addNotification(`Analysis failed: ${error.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  }, [textContent, onAnalysisStart, addNotification]);

  const handlePaste = useCallback((e) => {
    // Handle paste event
    const pastedText = e.clipboardData.getData('text');
    if (pastedText) {
      addNotification('✅ Text pasted successfully', 'success', 2000);
    }
  }, [addNotification]);

  const handleClear = useCallback(() => {
    setTextContent('');
    addNotification('Text cleared', 'info', 2000);
  }, [addNotification]);

  // Calculate stats
  const wordCount = textContent.trim().split(/\s+/).filter(word => word.length > 0).length;
  const charCount = textContent.length;
  const isValid = textContent.trim().length >= 10 && charCount <= 500000;

  return (
    <div className="direct-text-input">
      <div className="input-header">
        <h3>📝 Paste Meeting Notes</h3>
        <p>Copy and paste your meeting notes directly - no file upload needed!</p>
        <div className="meeting-type-info">
          Selected Meeting Type: <strong>{meetingType}</strong>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="text-input-form">
        {/* Text Area */}
        <div className="form-group">
          <label htmlFor="textContent">Meeting Notes:</label>
          <textarea
            id="textContent"
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            onPaste={handlePaste}
            placeholder="Paste your meeting notes here...

Example:
📋 Team Standup Meeting - March 15, 2024

✅ Completed:
- User authentication module deployed
- Fixed login bug in production

🚧 In Progress:
- Working on password reset flow
- Database optimization 

⚠️ Blockers:
- Need approval for new API endpoints
- Waiting for design assets

📝 Action Items:
- John: Create ticket for 2FA implementation
- Sarah: Review security requirements
- Team: Schedule architecture review

🎯 Next Steps:
- Deploy password reset by Friday
- Plan next sprint features"
            className="text-input-area"
            rows={15}
            disabled={isProcessing}
          />
          
          <div className="text-stats">
            <span className={wordCount > 0 ? 'stat-active' : ''}>
              📝 Words: {wordCount}
            </span>
            <span className={charCount > 0 ? 'stat-active' : ''}>
              📊 Characters: {charCount.toLocaleString()}
            </span>
            <span className={charCount > 400000 ? 'stat-warning' : charCount > 0 ? 'stat-active' : ''}>
              💾 Size: {(charCount / 1024).toFixed(1)} KB
            </span>
            {charCount > 500000 && (
              <span className="stat-error">⚠️ Too long (max 500KB)</span>
            )}
            {textContent.trim().length > 0 && textContent.trim().length < 10 && (
              <span className="stat-error">⚠️ Too short (min 10 chars)</span>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="form-actions">
          <button
            type="submit"
            disabled={isProcessing || !isValid}
            className={`analyze-button ${isProcessing ? 'processing' : ''} ${!isValid ? 'disabled' : ''}`}
          >
            {isProcessing ? (
              <>
                <span className="spinner"></span>
                Starting Analysis...
              </>
            ) : (
              <>
                🧠 Analyze with Claude Sonnet 4
              </>
            )}
          </button>
          
          {textContent.trim() && (
            <button
              type="button"
              onClick={handleClear}
              className="clear-button"
              disabled={isProcessing}
            >
              🗑️ Clear
            </button>
          )}
        </div>

        {/* Help Section */}
        <div className="help-section">
          <h4>💡 Tips for Better Analysis:</h4>
          <ul>
            <li>Include action items and decisions clearly</li>
            <li>Mention specific people and deadlines</li>
            <li>Use bullet points or structured format</li>
            <li>Include any blockers or issues discussed</li>
            <li>Add context about meeting type and goals</li>
          </ul>
        </div>
      </form>

      <style jsx>{`
        .direct-text-input {
          background: #f8f9fa;
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 20px;
          border: 1px solid #e9ecef;
        }

        .input-header {
          margin-bottom: 20px;
        }

        .input-header h3 {
          margin: 0 0 8px 0;
          color: #2c3e50;
          font-size: 20px;
        }

        .input-header p {
          margin: 0 0 10px 0;
          color: #666;
          font-size: 14px;
        }

        .meeting-type-info {
          background: #e3f2fd;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 14px;
          color: #1565c0;
          border-left: 4px solid #2196f3;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
          color: #2c3e50;
          font-size: 16px;
        }

        .text-input-area {
          width: 100%;
          padding: 16px;
          border: 2px solid #dee2e6;
          border-radius: 8px;
          font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
          font-size: 14px;
          line-height: 1.6;
          resize: vertical;
          min-height: 300px;
          background: #ffffff;
          transition: border-color 0.3s ease;
        }

        .text-input-area:focus {
          border-color: #3498db;
          outline: none;
          box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
        }

        .text-input-area::placeholder {
          color: #999;
          font-style: italic;
        }

        .text-stats {
          display: flex;
          justify-content: space-between;
          margin-top: 12px;
          padding: 8px 12px;
          background: #f1f3f4;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
        }

        .text-stats span {
          color: #666;
        }

        .text-stats .stat-active {
          color: #2c3e50;
        }

        .text-stats .stat-warning {
          color: #f39c12;
        }

        .text-stats .stat-error {
          color: #e74c3c;
          font-weight: 600;
        }

        .form-actions {
          display: flex;
          gap: 16px;
          align-items: center;
          margin-bottom: 24px;
        }

        .analyze-button {
          background: linear-gradient(135deg, #3498db, #2980b9);
          color: white;
          border: none;
          padding: 14px 28px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(52, 152, 219, 0.3);
        }

        .analyze-button:hover:not(:disabled) {
          background: linear-gradient(135deg, #2980b9, #1f5f99);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(52, 152, 219, 0.4);
        }

        .analyze-button:disabled {
          background: #95a5a6;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .analyze-button.processing {
          background: linear-gradient(135deg, #f39c12, #e67e22);
          animation: pulse 2s infinite;
        }

        .clear-button {
          background: #6c757d;
          color: white;
          border: none;
          padding: 14px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          transition: background 0.3s ease;
        }

        .clear-button:hover:not(:disabled) {
          background: #5a6268;
        }

        .spinner {
          width: 18px;
          height: 18px;
          border: 2px solid transparent;
          border-top: 2px solid currentColor;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .help-section {
          background: #fff3cd;
          border: 1px solid #ffeaa7;
          border-radius: 8px;
          padding: 16px;
          margin-top: 16px;
        }

        .help-section h4 {
          margin: 0 0 12px 0;
          color: #856404;
          font-size: 14px;
        }

        .help-section ul {
          margin: 0;
          padding-left: 20px;
          color: #856404;
        }

        .help-section li {
          margin-bottom: 4px;
          font-size: 13px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }

        @media (max-width: 768px) {
          .direct-text-input {
            padding: 16px;
          }
          
          .form-actions {
            flex-direction: column;
            align-items: stretch;
          }
          
          .text-stats {
            flex-direction: column;
            gap: 4px;
          }
        }
      `}</style>
    </div>
  );
};

export default DirectTextInput;
