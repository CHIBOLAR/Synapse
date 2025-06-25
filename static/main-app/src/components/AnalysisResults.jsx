import React, { useState, useCallback } from 'react';
import { invoke } from '@forge/bridge';

/**
 * 📊 Analysis Results Component
 * 
 * Displays AI analysis results and extracted issues
 * Allows creation of Jira issues with confidence scoring
 * Provides quality metrics and actionable insights
 */

const AnalysisResults = ({ results, metrics, onNewAnalysis, addNotification }) => {
  const [creatingIssues, setCreatingIssues] = useState(false);
  const [selectedIssues, setSelectedIssues] = useState(new Set());
  const [createdIssues, setCreatedIssues] = useState(new Set());

  /**
   * Handle issue selection toggle
   */
  const toggleIssueSelection = useCallback((issueId) => {
    setSelectedIssues(prev => {
      const newSet = new Set(prev);
      if (newSet.has(issueId)) {
        newSet.delete(issueId);
      } else {
        newSet.add(issueId);
      }
      return newSet;
    });
  }, []);

  /**
   * Select all high confidence issues
   */
  const selectHighConfidenceIssues = useCallback(() => {
    const highConfidenceIds = results.issues
      .filter(issue => issue.confidence >= 0.8)
      .map(issue => issue.id);
    
    setSelectedIssues(new Set(highConfidenceIds));
  }, [results.issues]);

  /**
   * Create selected Jira issues
   */
  const handleCreateIssues = useCallback(async () => {
    if (selectedIssues.size === 0) {
      addNotification('Please select at least one issue to create', 'warning');
      return;
    }

    try {
      setCreatingIssues(true);
      
      const issuesToCreate = results.issues.filter(issue => 
        selectedIssues.has(issue.id)
      );

      const createResponse = await invoke('createJiraIssues', {
        issues: issuesToCreate,
        analysisId: results.analysisId,
        meetingContext: {
          meetingType: results.meetingType,
          fileName: results.fileName,
          analysisTime: metrics.analysisTime
        }
      });

      if (createResponse.success) {
        setCreatedIssues(new Set(createResponse.createdIssueIds));
        addNotification(
          `Successfully created ${createResponse.createdIssueIds.length} Jira issues`,
          'success'
        );
      } else {
        throw new Error(createResponse.error || 'Failed to create issues');
      }

    } catch (error) {
      console.error('Issue creation failed:', error);
      addNotification(`Failed to create issues: ${error.message}`, 'error');
    } finally {
      setCreatingIssues(false);
    }
  }, [selectedIssues, results, metrics, addNotification]);

  return (
    <div className="analysis-results">
      {/* Results Header */}
      <div className="results-header">
        <h3>📊 Analysis Results</h3>
        <div className="header-actions">
          <button onClick={onNewAnalysis} className="new-analysis-btn">
            🔄 New Analysis
          </button>
        </div>
      </div>

      {/* Analysis Summary */}
      <div className="analysis-summary">
        <div className="summary-stats">
          <div className="stat-card">
            <span className="stat-icon">📝</span>
            <span className="stat-value">{results.issues?.length || 0}</span>
            <span className="stat-label">Issues Found</span>
          </div>
          
          <div className="stat-card">
            <span className="stat-icon">🎯</span>
            <span className="stat-value">{(metrics.confidence * 100).toFixed(1)}%</span>
            <span className="stat-label">Confidence</span>
          </div>
          
          <div className="stat-card">
            <span className="stat-icon">⚡</span>
            <span className="stat-value">{(metrics.analysisTime / 1000).toFixed(1)}s</span>
            <span className="stat-label">Analysis Time</span>
          </div>
        </div>

        <div className="summary-actions">
          <button
            onClick={selectHighConfidenceIssues}
            className="select-high-confidence-btn"
            disabled={creatingIssues}
          >
            ✨ Select High Confidence ({results.issues?.filter(i => i.confidence >= 0.8).length || 0})
          </button>
          
          <button
            onClick={handleCreateIssues}
            className="create-issues-btn primary-btn"
            disabled={creatingIssues || selectedIssues.size === 0}
          >
            {creatingIssues ? '⏳ Creating...' : `📝 Create ${selectedIssues.size} Issues`}
          </button>
        </div>
      </div>
      {/* Issues List */}
      <div className="issues-section">
        <h4>📋 Extracted Issues</h4>
        
        {results.issues && results.issues.length > 0 ? (
          <div className="issues-list">
            {results.issues.map((issue, index) => (
              <div
                key={issue.id}
                className={`issue-card ${selectedIssues.has(issue.id) ? 'selected' : ''} ${createdIssues.has(issue.id) ? 'created' : ''}`}
              >
                <div className="issue-header">
                  <div className="issue-selection">
                    <input
                      type="checkbox"
                      checked={selectedIssues.has(issue.id)}
                      onChange={() => toggleIssueSelection(issue.id)}
                      disabled={creatingIssues || createdIssues.has(issue.id)}
                    />
                  </div>
                  
                  <div className="issue-priority">
                    <span className={`priority-badge priority-${issue.priority.toLowerCase()}`}>
                      {issue.priority}
                    </span>
                  </div>
                  
                  <div className="issue-confidence">
                    <span className={`confidence-badge confidence-${getConfidenceLevel(issue.confidence)}`}>
                      {(issue.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  
                  {createdIssues.has(issue.id) && (
                    <div className="created-badge">
                      ✅ Created
                    </div>
                  )}
                </div>

                <div className="issue-content">
                  <h5 className="issue-title">{issue.title}</h5>
                  <p className="issue-description">{issue.description}</p>
                  
                  {issue.acceptanceCriteria && issue.acceptanceCriteria.length > 0 && (
                    <div className="acceptance-criteria">
                      <h6>Acceptance Criteria:</h6>
                      <ul>
                        {issue.acceptanceCriteria.map((criteria, idx) => (
                          <li key={idx}>{criteria}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="issue-metadata">
                  <span className="issue-type">{issue.issueType}</span>
                  {issue.tags && issue.tags.length > 0 && (
                    <div className="issue-tags">
                      {issue.tags.map((tag, idx) => (
                        <span key={idx} className="tag">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-issues">
            <p>No actionable issues were identified in this meeting.</p>
            <p>The content may have been informational or require manual review.</p>
          </div>
        )}
      </div>

      {/* Analysis Insights */}
      {results.insights && (
        <div className="analysis-insights">
          <h4>💡 Analysis Insights</h4>
          <div className="insights-content">
            <p>{results.insights}</p>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Get confidence level for styling
 */
const getConfidenceLevel = (confidence) => {
  if (confidence >= 0.9) return 'excellent';
  if (confidence >= 0.8) return 'high';
  if (confidence >= 0.6) return 'medium';
  return 'low';
};

export default AnalysisResults;