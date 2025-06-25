import React, { useState, useEffect } from 'react';

/**
 * ⏳ Processing Status Component
 * 
 * Real-time analysis progress display
 * Shows current stage, progress, and estimated time
 * Provides cancellation option
 */

const ProcessingStatus = ({ status, onCancel }) => {
  const [elapsed, setElapsed] = useState(0);

  // Track elapsed time
  useEffect(() => {
    const startTime = new Date(status.startTime);
    
    const timer = setInterval(() => {
      setElapsed(Date.now() - startTime.getTime());
    }, 1000);

    return () => clearInterval(timer);
  }, [status.startTime]);

  /**
   * Format duration in seconds
   */
  const formatDuration = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  /**
   * Get stage display info
   */
  const getStageInfo = (stage) => {
    const stages = {
      initializing: { icon: '🔧', label: 'Initializing' },
      uploading: { icon: '📤', label: 'Uploading' },
      analyzing: { icon: '🧠', label: 'AI Analysis' },
      extracting: { icon: '⚙️', label: 'Extracting Issues' },
      creating: { icon: '📝', label: 'Creating Jira Issues' },
      finalizing: { icon: '✅', label: 'Finalizing' }
    };
    
    return stages[stage] || { icon: '⏳', label: 'Processing' };
  };

  const stageInfo = getStageInfo(status.stage);

  return (
    <div className="processing-status">
      <div className="status-header">
        <h3>🧠 AI Analysis in Progress</h3>
        <div className="status-actions">
          <button onClick={onCancel} className="cancel-btn">
            ❌ Cancel
          </button>
        </div>
      </div>

      <div className="status-main">
        {/* Stage Indicator */}
        <div className="stage-indicator">
          <span className="stage-icon">{stageInfo.icon}</span>
          <span className="stage-label">{stageInfo.label}</span>
        </div>

        {/* Progress Bar */}
        <div className="progress-container">
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${status.progress}%` }}
            />
          </div>
          <span className="progress-text">{status.progress}%</span>
        </div>

        {/* Status Message */}
        <div className="status-message">
          <p>{status.message}</p>
        </div>

        {/* Timing Information */}
        <div className="timing-info">
          <div className="timing-row">
            <span className="timing-label">Elapsed:</span>
            <span className="timing-value">{formatDuration(elapsed)}</span>
          </div>
          
          {status.estimatedTimeRemaining && (
            <div className="timing-row">
              <span className="timing-label">Remaining:</span>
              <span className="timing-value">
                ~{formatDuration(status.estimatedTimeRemaining)}
              </span>
            </div>
          )}
        </div>

        {/* Detailed Progress Steps */}
        {status.details && (
          <div className="progress-details">
            <h4>Progress Details:</h4>
            <ul className="detail-list">
              {status.details.map((detail, index) => (
                <li key={index} className={`detail-item ${detail.completed ? 'completed' : 'pending'}`}>
                  <span className="detail-icon">
                    {detail.completed ? '✅' : '⏳'}
                  </span>
                  <span className="detail-text">{detail.text}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Claude Sonnet 4 Branding */}
      <div className="ai-branding">
        <span className="ai-badge">
          Powered by Claude Sonnet 4 🤖
        </span>
      </div>
    </div>
  );
};

export default ProcessingStatus;