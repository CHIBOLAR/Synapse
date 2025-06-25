import React, { useState, useCallback, useRef } from 'react';
import { invoke } from '@forge/bridge';
import FileUploader from './FileUploader';
import AnalysisResults from './AnalysisResults';
import ProcessingStatus from './ProcessingStatus';
import MeetingTypeSelector from './MeetingTypeSelector';

/**
 * 🎯 SYNAPSE - Meeting Analyzer Component
 * 
 * Core functionality for AI-powered meeting analysis
 * Integrates with Claude Sonnet 4 for intelligent issue extraction
 * 
 * Features:
 * - File upload (.txt, .docx) with validation
 * - Real-time processing status with queue management
 * - Context-aware analysis (6 meeting types × 5 issue types)
 * - Confidence scoring and quality metrics
 * - Direct Jira issue creation
 * - Performance tracking and optimization
 */

const MeetingAnalyzer = ({ 
  userConfig, 
  addNotification, 
  updatePerformanceMetrics, 
  performanceMetrics 
}) => {
  // 📋 Component State
  const [analysisState, setAnalysisState] = useState('idle'); // idle, uploading, processing, completed, error
  const [uploadedFile, setUploadedFile] = useState(null);
  const [meetingType, setMeetingType] = useState('general');
  const [analysisResults, setAnalysisResults] = useState(null);
  const [processingStatus, setProcessingStatus] = useState(null);
  const [analysisMetrics, setAnalysisMetrics] = useState({});
  
  // 🔄 Refs for performance tracking
  const analysisStartTime = useRef(null);
  const processingQueue = useRef(null);

  /**
   * Handle file upload completion
   */
  const handleFileUpload = useCallback(async (file, fileContent) => {
    try {
      setAnalysisState('uploading');
      setUploadedFile({ file, content: fileContent });
      
      // Validate file content
      const validation = await validateFileContent(fileContent);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      setAnalysisState('ready');
      addNotification('File uploaded successfully', 'success');
      
      updatePerformanceMetrics({
        lastFileUpload: new Date().toISOString(),
        fileSize: file.size,
        fileName: file.name
      });

    } catch (error) {
      console.error('File upload failed:', error);
      setAnalysisState('error');
      addNotification(`Upload failed: ${error.message}`, 'error');
    }
  }, [addNotification, updatePerformanceMetrics]);

  /**
   * Validate uploaded file content
   */  const validateFileContent = async (content) => {
    try {
      // Basic content validation
      if (!content || content.trim().length < 50) {
        return { isValid: false, error: 'File content too short. Minimum 50 characters required.' };
      }

      if (content.length > 500000) { // 500KB limit
        return { isValid: false, error: 'File too large. Maximum 500KB allowed.' };
      }

      // Security validation through backend
      const securityCheck = await invoke('validateContent', { content });
      if (!securityCheck.isValid) {
        return { isValid: false, error: 'Content failed security validation' };
      }

      return { isValid: true };
    } catch (error) {
      return { isValid: false, error: 'Validation failed' };
    }
  };

  /**
   * Start analysis process
   */
  const handleStartAnalysis = useCallback(async () => {
    if (!uploadedFile || analysisState !== 'ready') return;

    try {
      setAnalysisState('processing');
      analysisStartTime.current = Date.now();
      
      // Initialize processing status
      setProcessingStatus({
        stage: 'initializing',
        progress: 0,
        message: 'Preparing analysis with Claude Sonnet 4...',
        startTime: new Date().toISOString()
      });

      // Submit analysis request
      const analysisRequest = {
        content: uploadedFile.content,
        meetingType,
        fileName: uploadedFile.file.name,
        userPreferences: userConfig?.analysisPreferences || {},
        timestamp: new Date().toISOString()
      };

      const analysisResponse = await invoke('startAnalysis', analysisRequest);
      
      if (analysisResponse.success) {
        processingQueue.current = analysisResponse.queueId;
        addNotification('Analysis started successfully', 'success');
        
        // Start polling for status updates
        pollAnalysisStatus(analysisResponse.queueId);
      } else {
        throw new Error(analysisResponse.error || 'Failed to start analysis');
      }

    } catch (error) {
      console.error('Analysis start failed:', error);
      setAnalysisState('error');
      setProcessingStatus(null);
      addNotification(`Analysis failed: ${error.message}`, 'error');
    }
  }, [uploadedFile, meetingType, userConfig, addNotification]);
  /**
   * Poll for analysis status updates
   */
  const pollAnalysisStatus = useCallback(async (queueId) => {
    const pollInterval = 2000; // 2 seconds
    const maxPollTime = 300000; // 5 minutes
    const startTime = Date.now();

    const poll = async () => {
      try {
        if (Date.now() - startTime > maxPollTime) {
          throw new Error('Analysis timeout - please try again');
        }

        const status = await invoke('getAnalysisStatus', { queueId });

        // Update processing status
        setProcessingStatus({
          stage: status.stage,
          progress: status.progress,
          message: status.message,
          estimatedTimeRemaining: status.estimatedTimeRemaining,
          details: status.details
        });

        if (status.completed) {
          // Analysis completed successfully
          const results = await invoke('getAnalysisResults', { queueId });
          handleAnalysisComplete(results);
        } else if (status.failed) {
          throw new Error(status.error || 'Analysis failed');
        } else {
          // Continue polling
          setTimeout(poll, pollInterval);
        }

      } catch (error) {
        console.error('Status polling failed:', error);
        setAnalysisState('error');
        setProcessingStatus(null);
        addNotification(`Analysis failed: ${error.message}`, 'error');
      }
    };

    poll();
  }, [addNotification]);

  /**
   * Handle analysis completion
   */
  const handleAnalysisComplete = useCallback((results) => {
    const analysisTime = Date.now() - analysisStartTime.current;
    
    setAnalysisResults(results);
    setAnalysisState('completed');
    setProcessingStatus(null);

    // Calculate and store metrics
    const metrics = {
      analysisTime,
      issuesFound: results.issues?.length || 0,
      confidence: results.confidence || 0,
      meetingType,
      completedAt: new Date().toISOString()
    };

    setAnalysisMetrics(metrics);
    updatePerformanceMetrics({
      lastAnalysis: new Date().toISOString(),
      averageAnalysisTime: analysisTime,
      totalAnalyses: (performanceMetrics.totalAnalyses || 0) + 1,
      ...metrics
    });

    addNotification(
      `Analysis completed! Found ${metrics.issuesFound} issues in ${(analysisTime / 1000).toFixed(1)}s`,
      'success'
    );
  }, [meetingType, updatePerformanceMetrics, performanceMetrics, addNotification]);
  /**
   * Reset analysis state for new file
   */
  const handleReset = useCallback(() => {
    setAnalysisState('idle');
    setUploadedFile(null);
    setAnalysisResults(null);
    setProcessingStatus(null);
    setAnalysisMetrics({});
    processingQueue.current = null;
    analysisStartTime.current = null;
  }, []);

  /**
   * Handle meeting type change
   */
  const handleMeetingTypeChange = useCallback((newType) => {
    setMeetingType(newType);
    updatePerformanceMetrics({
      lastMeetingTypeChange: newType
    });
  }, [updatePerformanceMetrics]);

  // 🎨 Component Render
  return (
    <div className="meeting-analyzer">
      {/* 📊 Analysis Header */}
      <div className="analyzer-header">
        <h2>📋 Meeting Analysis</h2>
        <p className="analyzer-description">
          Upload your meeting notes and let Claude Sonnet 4 intelligently extract actionable Jira issues
        </p>
        
        {analysisMetrics.issuesFound && (
          <div className="quick-stats">
            <span className="stat-item">
              📊 {analysisMetrics.issuesFound} issues found
            </span>
            <span className="stat-item">
              ⚡ {(analysisMetrics.analysisTime / 1000).toFixed(1)}s analysis
            </span>
            <span className="stat-item">
              🎯 {(analysisMetrics.confidence * 100).toFixed(1)}% confidence
            </span>
          </div>
        )}
      </div>

      {/* 🎯 Meeting Type Selection */}
      <MeetingTypeSelector
        selectedType={meetingType}
        onTypeChange={handleMeetingTypeChange}
        disabled={analysisState === 'processing'}
      />

      {/* 📁 File Upload Section */}
      {analysisState === 'idle' && (
        <FileUploader
          onFileUpload={handleFileUpload}
          supportedFormats={['.txt', '.docx']}
          maxSize={500 * 1024} // 500KB
        />
      )}

      {/* ✅ File Ready Section */}
      {analysisState === 'ready' && uploadedFile && (
        <div className="file-ready-section">
          <div className="uploaded-file-info">
            <h3>📄 File Ready for Analysis</h3>
            <div className="file-details">
              <span className="file-name">{uploadedFile.file.name}</span>
              <span className="file-size">
                {(uploadedFile.file.size / 1024).toFixed(1)} KB
              </span>
              <span className="meeting-type-badge">
                {meetingType.charAt(0).toUpperCase() + meetingType.slice(1)} Meeting
              </span>
            </div>
          </div>
          
          <div className="analysis-actions">
            <button
              onClick={handleStartAnalysis}
              className="start-analysis-btn primary-btn"
            >
              🧠 Start AI Analysis
            </button>
            <button
              onClick={handleReset}
              className="reset-btn secondary-btn"
            >
              🔄 Upload Different File
            </button>
          </div>
        </div>
      )}

      {/* ⏳ Processing Status */}
      {analysisState === 'processing' && processingStatus && (
        <ProcessingStatus
          status={processingStatus}
          onCancel={() => {
            // TODO: Implement cancellation
            addNotification('Analysis cancellation not yet implemented', 'info');
          }}
        />
      )}

      {/* 📊 Analysis Results */}
      {analysisState === 'completed' && analysisResults && (
        <AnalysisResults
          results={analysisResults}
          metrics={analysisMetrics}
          onNewAnalysis={handleReset}
          addNotification={addNotification}
        />
      )}

      {/* ❌ Error State */}
      {analysisState === 'error' && (
        <div className="analysis-error">
          <h3>❌ Analysis Error</h3>
          <p>Something went wrong during the analysis process.</p>
          <button onClick={handleReset} className="retry-btn">
            🔄 Try Again
          </button>
        </div>
      )}
    </div>
  );
};

export default MeetingAnalyzer;