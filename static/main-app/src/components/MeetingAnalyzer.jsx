/**
 * 📊 ENHANCED MEETING ANALYZER COMPONENT
 * 
 * Meeting analysis component with comprehensive logging and error detection
 */

import React, { useState, useEffect } from 'react';
import { invoke } from '@forge/bridge';
import frontendLogger, { trackBridge, trackComponent } from '../utils/frontendLogger';

const MeetingAnalyzer = ({ userConfig, addNotification, backendHealth }) => {
  trackComponent('MeetingAnalyzer', 'component-start');

  // Component state
  const [content, setContent] = useState('');
  const [meetingType, setMeetingType] = useState('general');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [analysisId, setAnalysisId] = useState(null);
  const [validationStatus, setValidationStatus] = useState(null);
  const [processingLog, setProcessingLog] = useState([]);

  useEffect(() => {
    trackComponent('MeetingAnalyzer', 'mounted');
    
    // Set default meeting type from user config
    if (userConfig?.config?.preferences?.defaultMeetingType) {
      setMeetingType(userConfig.config.preferences.defaultMeetingType);
      frontendLogger.component('📊 Default meeting type set from user config', {
        meetingType: userConfig.config.preferences.defaultMeetingType
      });
    }

    return () => {
      trackComponent('MeetingAnalyzer', 'unmounted');
    };
  }, [userConfig]);

  const addToProcessingLog = (message, type = 'info') => {
    const logEntry = {
      id: Date.now() + Math.random(),
      message,
      type,
      timestamp: new Date().toISOString()
    };
    
    setProcessingLog(prev => [...prev, logEntry]);
    frontendLogger.component(`📝 Processing log: ${message}`, { type, logEntry });
  };

  const validateContent = async () => {
    if (!content || content.trim().length === 0) {
      setValidationStatus({ valid: false, error: 'No content provided' });
      return false;
    }

    addToProcessingLog('🔍 Validating content...', 'info');
    
    try {
      const tracker = trackBridge('validateContent', { contentLength: content.length });
      const validation = await invoke('validateContent', { content });
      tracker.complete(validation);
      
      if (validation.success) {
        setValidationStatus({ 
          valid: true, 
          contentLength: validation.contentLength,
          wordCount: validation.wordCount 
        });
        addToProcessingLog(`✅ Content validated (${validation.contentLength} chars, ${validation.wordCount || 'unknown'} words)`, 'success');
        return true;
      } else {
        setValidationStatus({ valid: false, error: validation.error });
        addToProcessingLog(`❌ Validation failed: ${validation.error}`, 'error');
        return false;
      }
    } catch (error) {
      frontendLogger.error('❌ Content validation error', {
        error: error.message,
        contentLength: content.length
      });
      setValidationStatus({ valid: false, error: error.message });
      addToProcessingLog(`❌ Validation error: ${error.message}`, 'error');
      return false;
    }
  };

  const startAnalysis = async () => {
    trackComponent('MeetingAnalyzer', 'analysis-start', { 
      contentLength: content.length, 
      meetingType 
    });

    addToProcessingLog('🚀 Starting analysis process...', 'info');
    
    if (!(await validateContent())) {
      addNotification('❌ Content validation failed', 'error');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResults(null);
    setAnalysisId(null);

    try {
      addToProcessingLog('📤 Sending content to backend...', 'info');
      
      const tracker = trackBridge('startAnalysis', { 
        contentLength: content.length, 
        meetingType 
      });
      
      const response = await invoke('startAnalysis', {
        content,
        meetingType
      });
      
      tracker.complete(response);

      if (response.success) {
        setAnalysisId(response.analysisId);
        addToProcessingLog(`✅ Analysis started (ID: ${response.analysisId})`, 'success');
        addNotification('✅ Analysis started successfully', 'success');
        
        // Start polling for results
        pollAnalysisStatus(response.analysisId);
      } else {
        throw new Error(response.error || 'Analysis failed to start');
      }
    } catch (error) {
      frontendLogger.error('❌ Analysis start failed', {
        error: error.message,
        contentLength: content.length,
        meetingType
      });
      
      addToProcessingLog(`❌ Analysis failed: ${error.message}`, 'error');
      addNotification(`❌ Analysis failed: ${error.message}`, 'error');
      setIsAnalyzing(false);
      trackComponent('MeetingAnalyzer', 'analysis-failed', { error: error.message });
    }
  };

  const pollAnalysisStatus = async (id) => {
    const maxAttempts = 30; // 30 attempts = 30 seconds
    let attempts = 0;

    const poll = async () => {
      try {
        attempts++;
        addToProcessingLog(`🔄 Checking status (attempt ${attempts}/${maxAttempts})...`, 'info');
        
        const tracker = trackBridge('getAnalysisStatus', { analysisId: id });
        const statusResponse = await invoke('getAnalysisStatus', { analysisId: id });
        tracker.complete(statusResponse);

        if (statusResponse.success) {
          const { status, progress, results } = statusResponse;
          
          addToProcessingLog(`📊 Status: ${status} (${progress || 0}%)`, 'info');

          if (status === 'completed' && results) {
            setAnalysisResults(results);
            setIsAnalyzing(false);
            addToProcessingLog('🎉 Analysis completed successfully!', 'success');
            addNotification('🎉 Analysis completed!', 'success');
            trackComponent('MeetingAnalyzer', 'analysis-completed', { 
              analysisId: id,
              resultsCount: Object.keys(results).length 
            });
            return;
          } else if (status === 'failed') {
            throw new Error('Analysis failed on backend');
          } else if (status === 'processing' && attempts < maxAttempts) {
            // Continue polling
            setTimeout(poll, 1000);
          } else if (attempts >= maxAttempts) {
            throw new Error('Analysis timeout - taking too long');
          }
        } else {
          throw new Error(statusResponse.error || 'Status check failed');
        }
      } catch (error) {
        frontendLogger.error('❌ Analysis polling error', {
          error: error.message,
          analysisId: id,
          attempts
        });
        
        addToProcessingLog(`❌ Status check failed: ${error.message}`, 'error');
        setIsAnalyzing(false);
        addNotification(`❌ Analysis failed: ${error.message}`, 'error');
        trackComponent('MeetingAnalyzer', 'analysis-polling-failed', { 
          error: error.message, 
          attempts 
        });
      }
    };

    poll();
  };

  const processDirectText = async () => {
    trackComponent('MeetingAnalyzer', 'direct-processing-start');
    
    if (!(await validateContent())) {
      addNotification('❌ Content validation failed', 'error');
      return;
    }

    setIsAnalyzing(true);
    addToProcessingLog('⚡ Processing text directly...', 'info');

    try {
      const tracker = trackBridge('processDirectText', { 
        contentLength: content.length, 
        meetingType 
      });
      
      const response = await invoke('processDirectText', {
        content,
        meetingType
      });
      
      tracker.complete(response);

      if (response.success) {
        setAnalysisResults(response.results);
        addToProcessingLog('🎉 Direct processing completed!', 'success');
        addNotification('🎉 Text processed successfully!', 'success');
        trackComponent('MeetingAnalyzer', 'direct-processing-completed', { 
          resultsCount: Object.keys(response.results).length 
        });
      } else {
        throw new Error(response.error || 'Direct processing failed');
      }
    } catch (error) {
      frontendLogger.error('❌ Direct processing failed', {
        error: error.message,
        contentLength: content.length,
        meetingType
      });
      
      addToProcessingLog(`❌ Processing failed: ${error.message}`, 'error');
      addNotification(`❌ Processing failed: ${error.message}`, 'error');
      trackComponent('MeetingAnalyzer', 'direct-processing-failed', { error: error.message });
    }

    setIsAnalyzing(false);
  };

  const clearAnalysis = () => {
    trackComponent('MeetingAnalyzer', 'analysis-cleared');
    setAnalysisResults(null);
    setAnalysisId(null);
    setProcessingLog([]);
    setValidationStatus(null);
    addToProcessingLog('🧹 Analysis cleared', 'info');
  };

  const handleContentChange = (e) => {
    const newContent = e.target.value;
    setContent(newContent);
    
    // Clear validation when content changes
    if (validationStatus) {
      setValidationStatus(null);
    }
    
    frontendLogger.component('📝 Content updated', { 
      contentLength: newContent.length,
      hasContent: newContent.trim().length > 0
    });
  };

  return (
    <div className="meeting-analyzer">
      <div className="analyzer-header">
        <h2>📊 Meeting Analysis</h2>
        <div className="analyzer-status">
          {backendHealth && (
            <span className="backend-status">
              Backend v{backendHealth.version} • {backendHealth.status}
            </span>
          )}
          {isAnalyzing && (
            <span className="analyzing-indicator">
              ⚡ Analyzing...
            </span>
          )}
        </div>
      </div>

      <div className="analyzer-content">
        {/* Input Section */}
        <div className="input-section">
          <div className="input-header">
            <h3>📝 Meeting Content</h3>
            <div className="input-controls">
              <select
                value={meetingType}
                onChange={(e) => {
                  setMeetingType(e.target.value);
                  frontendLogger.component('📋 Meeting type changed', { 
                    newType: e.target.value 
                  });
                }}
                disabled={isAnalyzing}
                className="meeting-type-select"
              >
                <option value="general">General Meeting</option>
                <option value="standup">Daily Standup</option>
                <option value="retrospective">Retrospective</option>
                <option value="planning">Planning Session</option>
                <option value="review">Review Meeting</option>
                <option value="brainstorming">Brainstorming</option>
              </select>
            </div>
          </div>

          <textarea
            value={content}
            onChange={handleContentChange}
            placeholder="Paste your meeting transcript, notes, or recording text here..."
            disabled={isAnalyzing}
            className="content-textarea"
            rows={12}
          />

          <div className="input-footer">
            <div className="content-stats">
              {content && (
                <>
                  <span>Characters: {content.length}</span>
                  <span>Words: {content.split(/\s+/).filter(w => w.length > 0).length}</span>
                </>
              )}
              
              {validationStatus && (
                <span className={`validation-status ${validationStatus.valid ? 'valid' : 'invalid'}`}>
                  {validationStatus.valid ? '✅ Valid' : `❌ ${validationStatus.error}`}
                </span>
              )}
            </div>

            <div className="action-buttons">
              <button
                onClick={startAnalysis}
                disabled={isAnalyzing || !content.trim()}
                className="analyze-button primary-btn"
              >
                {isAnalyzing ? '⚡ Analyzing...' : '🧠 Analyze Meeting'}
              </button>

              <button
                onClick={processDirectText}
                disabled={isAnalyzing || !content.trim()}
                className="direct-button secondary-btn"
              >
                ⚡ Quick Process
              </button>

              {(analysisResults || isAnalyzing) && (
                <button
                  onClick={clearAnalysis}
                  disabled={isAnalyzing}
                  className="clear-button tertiary-btn"
                >
                  🧹 Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Processing Log */}
        {processingLog.length > 0 && (
          <div className="processing-log">
            <h3>📋 Processing Log</h3>
            <div className="log-entries">
              {processingLog.slice(-10).map(entry => (
                <div key={entry.id} className={`log-entry log-${entry.type}`}>
                  <span className="log-time">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="log-message">{entry.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Analysis Results */}
        {analysisResults && (
          <div className="analysis-results">
            <div className="results-header">
              <h3>🎯 Analysis Results</h3>
              <div className="results-meta">
                {analysisId && <span>ID: {analysisId}</span>}
                <span>Type: {meetingType}</span>
                <span>Processed: {new Date(analysisResults.processedAt || Date.now()).toLocaleString()}</span>
              </div>
            </div>

            <div className="results-content">
              {/* Summary */}
              {analysisResults.summary && (
                <div className="result-section">
                  <h4>📄 Summary</h4>
                  <div className="summary-content">
                    {analysisResults.summary}
                  </div>
                </div>
              )}

              {/* Action Items */}
              {analysisResults.actionItems && analysisResults.actionItems.length > 0 && (
                <div className="result-section">
                  <h4>✅ Action Items ({analysisResults.actionItems.length})</h4>
                  <div className="action-items">
                    {analysisResults.actionItems.map((item, index) => (
                      <div key={item.id || index} className="action-item">
                        <div className="action-text">{item.text}</div>
                        {item.assignee && (
                          <div className="action-assignee">Assigned to: {item.assignee}</div>
                        )}
                        {item.dueDate && (
                          <div className="action-due">Due: {item.dueDate}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Decisions */}
              {analysisResults.decisions && analysisResults.decisions.length > 0 && (
                <div className="result-section">
                  <h4>🎯 Decisions ({analysisResults.decisions.length})</h4>
                  <div className="decisions">
                    {analysisResults.decisions.map((decision, index) => (
                      <div key={decision.id || index} className="decision-item">
                        <div className="decision-text">{decision.text}</div>
                        {decision.context && (
                          <div className="decision-context">Context: {decision.context}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Issues */}
              {analysisResults.issues && analysisResults.issues.length > 0 && (
                <div className="result-section">
                  <h4>⚠️ Issues ({analysisResults.issues.length})</h4>
                  <div className="issues">
                    {analysisResults.issues.map((issue, index) => (
                      <div key={issue.id || index} className="issue-item">
                        <div className="issue-text">{issue.text}</div>
                        {issue.severity && (
                          <div className="issue-severity">Severity: {issue.severity}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Participants */}
              {analysisResults.participants && analysisResults.participants.length > 0 && (
                <div className="result-section">
                  <h4>👥 Participants ({analysisResults.participants.length})</h4>
                  <div className="participants">
                    {analysisResults.participants.map((participant, index) => (
                      <span key={index} className="participant-tag">
                        {participant}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .meeting-analyzer {
          display: flex;
          flex-direction: column;
          gap: 20px;
          padding: 20px;
        }

        .analyzer-header {
          display: flex;
          justify-content: between;
          align-items: center;
          gap: 20px;
        }

        .analyzer-header h2 {
          margin: 0;
          color: #2d3436;
        }

        .analyzer-status {
          display: flex;
          gap: 15px;
          align-items: center;
        }

        .backend-status {
          background: #e8f5e8;
          color: #27ae60;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
        }

        .analyzing-indicator {
          background: #fff3cd;
          color: #e67e22;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          animation: pulse 1.5s infinite;
        }

        .input-section {
          background: white;
          border: 1px solid #e1e8ed;
          border-radius: 8px;
          padding: 20px;
        }

        .input-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }

        .input-header h3 {
          margin: 0;
          color: #2d3436;
        }

        .meeting-type-select {
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          background: white;
        }

        .content-textarea {
          width: 100%;
          padding: 15px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-family: inherit;
          font-size: 14px;
          line-height: 1.5;
          resize: vertical;
          min-height: 200px;
        }

        .input-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 15px;
          gap: 20px;
        }

        .content-stats {
          display: flex;
          gap: 15px;
          font-size: 12px;
          color: #636e72;
        }

        .validation-status.valid {
          color: #27ae60;
        }

        .validation-status.invalid {
          color: #e74c3c;
        }

        .action-buttons {
          display: flex;
          gap: 10px;
        }

        .action-buttons button {
          padding: 10px 20px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
        }

        .primary-btn {
          background: #6c5ce7;
          color: white;
        }

        .secondary-btn {
          background: #74b9ff;
          color: white;
        }

        .tertiary-btn {
          background: #636e72;
          color: white;
        }

        .action-buttons button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .action-buttons button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .processing-log {
          background: #f8f9fa;
          border: 1px solid #e9ecef;
          border-radius: 8px;
          padding: 20px;
        }

        .processing-log h3 {
          margin: 0 0 15px 0;
          color: #495057;
        }

        .log-entries {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-height: 200px;
          overflow-y: auto;
        }

        .log-entry {
          display: flex;
          gap: 10px;
          padding: 8px 12px;
          border-radius: 4px;
          font-size: 13px;
        }

        .log-info {
          background: #e8f4fd;
          color: #0c5460;
        }

        .log-success {
          background: #d4edda;
          color: #155724;
        }

        .log-error {
          background: #f8d7da;
          color: #721c24;
        }

        .log-time {
          color: #6c757d;
          min-width: 70px;
        }

        .analysis-results {
          background: white;
          border: 1px solid #e1e8ed;
          border-radius: 8px;
          padding: 20px;
        }

        .results-header {
          margin-bottom: 20px;
        }

        .results-header h3 {
          margin: 0 0 10px 0;
          color: #2d3436;
        }

        .results-meta {
          display: flex;
          gap: 15px;
          font-size: 12px;
          color: #636e72;
        }

        .result-section {
          margin: 20px 0;
          border-bottom: 1px solid #f1f3f4;
          padding-bottom: 20px;
        }

        .result-section:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }

        .result-section h4 {
          margin: 0 0 15px 0;
          color: #2d3436;
        }

        .summary-content {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 6px;
          line-height: 1.6;
        }

        .action-item, .decision-item, .issue-item {
          background: #f8f9fa;
          padding: 12px;
          border-radius: 6px;
          margin: 8px 0;
          border-left: 4px solid #6c5ce7;
        }

        .action-text, .decision-text, .issue-text {
          font-weight: 500;
          margin-bottom: 5px;
        }

        .action-assignee, .action-due, .decision-context, .issue-severity {
          font-size: 12px;
          color: #636e72;
        }

        .participants {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .participant-tag {
          background: #e8f4fd;
          color: #0c5460;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
};

export default MeetingAnalyzer;