import React, { useState, useCallback } from 'react';
import { invoke } from '@forge/bridge';

/**
 * 📝 Direct Text Input Component
 * 
 * Allows users to copy-paste meeting notes directly
 * No file upload required - just paste and analyze
 */

const DirectTextInput = ({ onAnalysisStart, addNotification }) => {
  const [textContent, setTextContent] = useState('');
  const [meetingType, setMeetingType] = useState('general');
  const [issueType, setIssueType] = useState('task');
  const [isProcessing, setIsProcessing] = useState(false);

  const meetingTypes = [
    { value: 'general', label: 'General Meeting' },
    { value: 'standup', label: 'Daily Standup' },
    { value: 'retrospective', label: 'Retrospective' },
    { value: 'planning', label: 'Sprint Planning' },
    { value: 'technical', label: 'Technical Review' },
    { value: 'stakeholder', label: 'Stakeholder Meeting' }
  ];

  const issueTypes = [
    { value: 'task', label: 'Task' },
    { value: 'bug', label: 'Bug' },
    { value: 'story', label: 'Story' },
    { value: 'epic', label: 'Epic' },
    { value: 'improvement', label: 'Improvement' }
  ];

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

    try {
      setIsProcessing(true);
      addNotification('Starting analysis...', 'info');

      // Call the backend directly
      const result = await invoke('processDirectText', {
        textContent: textContent.trim(),
        meetingType,
        issueType,
        options: {
          createJiraIssues: true,
          source: 'direct_input'
        }
      });

      if (result.success) {
        addNotification('Analysis started successfully!', 'success');
        onAnalysisStart(result.analysisId);
        setTextContent(''); // Clear the text area
      } else {
        throw new Error(result.error || 'Analysis failed');
      }

    } catch (error) {
      console.error('Direct text analysis failed:', error);
      addNotification(`Analysis failed: ${error.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  }, [textContent, meetingType, issueType, onAnalysisStart, addNotification]);
  const handlePaste = useCallback((e) => {
    // Handle paste event - you can add special processing here if needed
    const pastedText = e.clipboardData.getData('text');
    if (pastedText) {
      addNotification('Text pasted successfully', 'success');
    }
  }, [addNotification]);

  const wordCount = textContent.trim().split(/\s+/).filter(word => word.length > 0).length;
  const charCount = textContent.length;

  return (
    <div className="direct-text-input">
      <div className="input-header">
        <h3>📝 Paste Meeting Notes</h3>
        <p>Copy and paste your meeting notes directly - no file upload needed!</p>
      </div>

      <form onSubmit={handleSubmit} className="text-input-form">
        {/* Meeting Type Selection */}
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="meetingType">Meeting Type:</label>
            <select
              id="meetingType"
              value={meetingType}
              onChange={(e) => setMeetingType(e.target.value)}
              className="form-select"
            >
              {meetingTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="issueType">Issue Type:</label>
            <select
              id="issueType"
              value={issueType}
              onChange={(e) => setIssueType(e.target.value)}
              className="form-select"
            >
              {issueTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>

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
- Discussed user authentication issues
- John reported login failures in production  
- Sarah suggested implementing 2FA
- ACTION: Create ticket for password reset flow
- DEADLINE: End of sprint"
            className="text-input-area"
            rows={12}
            disabled={isProcessing}
          />
          
          <div className="text-stats">
            <span>Words: {wordCount}</span>
            <span>Characters: {charCount}</span>
            {charCount > 100000 && (
              <span className="error">⚠️ Too long (max 100KB)</span>
            )}
          </div>
        </div>
        {/* Submit Button */}
        <div className="form-actions">
          <button
            type="submit"
            disabled={isProcessing || !textContent.trim() || charCount > 100000}
            className={`analyze-button ${isProcessing ? 'processing' : ''}`}
          >
            {isProcessing ? (
              <>
                <span className="spinner"></span>
                Analyzing...
              </>
            ) : (
              <>
                🧠 Analyze Notes
              </>
            )}
          </button>
          
          {textContent.trim() && (
            <button
              type="button"
              onClick={() => setTextContent('')}
              className="clear-button"
              disabled={isProcessing}
            >
              Clear
            </button>
          )}
        </div>
      </form>

      <style jsx>{`
        .direct-text-input {
          background: #f9f9f9;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
        }

        .input-header h3 {
          margin: 0 0 8px 0;
          color: #2c3e50;
        }

        .input-header p {
          margin: 0 0 20px 0;
          color: #666;
          font-size: 14px;
        }

        .form-row {
          display: flex;
          gap: 16px;
          margin-bottom: 16px;
        }

        .form-group {
          flex: 1;
        }

        .form-group label {
          display: block;
          margin-bottom: 6px;
          font-weight: 500;
          color: #2c3e50;
        }

        .form-select {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }
        .text-input-area {
          width: 100%;
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-family: 'Monaco', 'Menlo', monospace;
          font-size: 14px;
          line-height: 1.5;
          resize: vertical;
          min-height: 200px;
        }

        .text-input-area:focus {
          border-color: #3498db;
          outline: none;
          box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.1);
        }

        .text-stats {
          display: flex;
          justify-content: space-between;
          margin-top: 8px;
          font-size: 12px;
          color: #666;
        }

        .text-stats .error {
          color: #e74c3c;
          font-weight: 500;
        }

        .form-actions {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .analyze-button {
          background: #3498db;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 6px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .analyze-button:hover:not(:disabled) {
          background: #2980b9;
        }

        .analyze-button:disabled {
          background: #95a5a6;
          cursor: not-allowed;
        }

        .analyze-button.processing {
          background: #f39c12;
        }

        .clear-button {
          background: #95a5a6;
          color: white;
          border: none;
          padding: 12px 20px;
          border-radius: 6px;
          cursor: pointer;
        }

        .clear-button:hover:not(:disabled) {
          background: #7f8c8d;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid transparent;
          border-top: 2px solid currentColor;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default DirectTextInput;