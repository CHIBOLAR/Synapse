// Frontend Performance Optimizer
// React component optimizations, bundle size reduction, and real-time updates

import React, { memo, useMemo, useCallback, lazy, Suspense } from 'react';

/**
 * OPTIMIZED: Meeting Analyzer Component with Performance Enhancements
 */
const MeetingAnalyzerOptimized = memo(({ 
  onAnalysisStart, 
  onStatusUpdate, 
  initialData = null,
  theme = 'light',
  userId = null 
}) => {
  // OPTIMIZATION: Memoized state management
  const [state, setState] = useState(() => ({
    notes: initialData?.notes || '',
    meetingType: initialData?.meetingType || 'general',
    issueType: initialData?.issueType || 'Task',
    isAnalyzing: false,
    results: null,
    errors: [],
    options: {
      createJiraIssues: true,
      assignToCurrentUser: false,
      projectKey: ''
    }
  }));

  // OPTIMIZATION: Debounced note input to reduce re-renders
  const debouncedNotes = useDebounce(state.notes, 300);

  // OPTIMIZATION: Memoized validation
  const validation = useMemo(() => ({
    isValid: debouncedNotes.trim().length > 10 && state.meetingType && state.issueType,
    notesLength: debouncedNotes.length,
    estimatedTokens: Math.ceil(debouncedNotes.length / 4),
    estimatedProcessingTime: calculateEstimatedTime(debouncedNotes, state.meetingType)
  }), [debouncedNotes, state.meetingType, state.issueType]);

  // OPTIMIZATION: Memoized callbacks to prevent child re-renders
  const handleNotesChange = useCallback((value) => {
    setState(prev => ({ ...prev, notes: value }));
  }, []);

  const handleMeetingTypeChange = useCallback((value) => {
    setState(prev => ({ ...prev, meetingType: value }));
  }, []);

  const handleIssueTypeChange = useCallback((value) => {
    setState(prev => ({ ...prev, issueType: value }));
  }, []);

  const handleOptionsChange = useCallback((newOptions) => {
    setState(prev => ({ 
      ...prev, 
      options: { ...prev.options, ...newOptions }
    }));
  }, []);

  // OPTIMIZATION: Optimized analysis handler with intelligent processing decision
  const handleAnalysisStart = useCallback(async () => {
    if (!validation.isValid) return;

    setState(prev => ({ ...prev, isAnalyzing: true, errors: [] }));

    try {
      // OPTIMIZATION: Determine processing strategy
      const shouldProcessImmediately = 
        debouncedNotes.length < 2000 && 
        ['dailyStandup', 'bugTriage'].includes(state.meetingType);

      const response = await fetch('/api/analysis/start-optimized', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: debouncedNotes,
          meetingType: state.meetingType,
          issueType: state.issueType,
          options: state.options,
          preferImmediate: shouldProcessImmediately
        })
      });

      const result = await response.json();

      if (result.success) {
        setState(prev => ({ ...prev, results: result }));
        onAnalysisStart?.(result);

        // OPTIMIZATION: Handle real-time updates differently based on processing type
        if (result.processedImmediately) {
          // Immediate result - no polling needed
          setState(prev => ({ ...prev, isAnalyzing: false }));
        } else {
          // Queued - start optimized polling
          startOptimizedPolling(result.analysisId);
        }
      } else {
        setState(prev => ({ 
          ...prev, 
          errors: [result.error || 'Analysis failed'],
          isAnalyzing: false 
        }));
      }
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        errors: [error.message],
        isAnalyzing: false 
      }));
    }
  }, [validation.isValid, debouncedNotes, state.meetingType, state.issueType, state.options, onAnalysisStart]);

  // OPTIMIZATION: Smart polling with exponential backoff
  const startOptimizedPolling = useCallback((analysisId) => {
    let attempts = 0;
    let pollInterval = 1000; // Start with 1 second
    const maxInterval = 5000; // Max 5 seconds
    
    const poll = async () => {
      try {
        const response = await fetch(`/api/analysis/status-optimized/${analysisId}`);
        const status = await response.json();

        if (status.success) {
          const analysis = status.analysis;
          
          setState(prev => ({
            ...prev,
            results: { ...prev.results, ...status },
            isAnalyzing: analysis.status !== 'completed' && analysis.status !== 'failed'
          }));

          onStatusUpdate?.(status);

          if (analysis.status === 'completed' || analysis.status === 'failed') {
            return; // Stop polling
          }

          // OPTIMIZATION: Exponential backoff for polling
          attempts++;
          if (attempts > 3) {
            pollInterval = Math.min(pollInterval * 1.5, maxInterval);
          }

          setTimeout(poll, pollInterval);
        }
      } catch (error) {
        console.error('Polling error:', error);
        setState(prev => ({ 
          ...prev, 
          errors: [...prev.errors, 'Failed to get status updates'],
          isAnalyzing: false 
        }));
      }
    };

    poll();
  }, [onStatusUpdate]);

  // OPTIMIZATION: Memoized theme styles
  const themeStyles = useMemo(() => ({
    container: {
      backgroundColor: theme === 'dark' ? '#1a1a1a' : '#ffffff',
      color: theme === 'dark' ? '#ffffff' : '#000000',
      borderRadius: '8px',
      padding: '24px',
      boxShadow: theme === 'dark' 
        ? '0 4px 6px rgba(0, 0, 0, 0.3)' 
        : '0 4px 6px rgba(0, 0, 0, 0.1)'
    },
    input: {
      backgroundColor: theme === 'dark' ? '#2a2a2a' : '#f8f9fa',
      color: theme === 'dark' ? '#ffffff' : '#000000',
      border: `1px solid ${theme === 'dark' ? '#404040' : '#dee2e6'}`,
      borderRadius: '4px',
      padding: '8px 12px'
    },
    button: {
      backgroundColor: theme === 'dark' ? '#0d6efd' : '#007bff',
      color: '#ffffff',
      border: 'none',
      borderRadius: '4px',
      padding: '10px 20px',
      cursor: 'pointer',
      opacity: validation.isValid ? 1 : 0.6
    }
  }), [theme, validation.isValid]);

  return (
    <div style={themeStyles.container}>
      <h2>🧠 Synapse - AI Meeting Analysis (Optimized)</h2>
      
      {/* OPTIMIZATION: Performance metrics display */}
      {validation.estimatedProcessingTime && (
        <div style={{ 
          marginBottom: '16px', 
          padding: '8px', 
          backgroundColor: theme === 'dark' ? '#2a2a2a' : '#e9ecef',
          borderRadius: '4px',
          fontSize: '14px'
        }}>
          📊 Estimated processing time: ~{validation.estimatedProcessingTime}s | 
          Tokens: {validation.estimatedTokens} | 
          Strategy: {debouncedNotes.length < 2000 ? 'Immediate' : 'Queued'}
        </div>
      )}

      {/* Meeting Notes Input - Optimized */}
      <OptimizedTextArea
        value={state.notes}
        onChange={handleNotesChange}
        placeholder="Paste your meeting notes here..."
        style={themeStyles.input}
        rows={8}
        maxLength={50000}
        showCharCount={true}
        theme={theme}
      />

      {/* Meeting Type Selection - Memoized */}
      <OptimizedSelect
        label="Meeting Type"
        value={state.meetingType}
        onChange={handleMeetingTypeChange}
        options={MEETING_TYPE_OPTIONS}
        style={themeStyles.input}
        theme={theme}
      />

      {/* Issue Type Selection - Memoized */}
      <OptimizedSelect
        label="Issue Type"
        value={state.issueType}
        onChange={handleIssueTypeChange}
        options={ISSUE_TYPE_OPTIONS}
        style={themeStyles.input}
        theme={theme}
      />

      {/* Options Panel - Lazy Loaded */}
      <Suspense fallback={<div>Loading options...</div>}>
        <LazyOptionsPanel
          options={state.options}
          onChange={handleOptionsChange}
          theme={theme}
        />
      </Suspense>

      {/* Action Buttons */}
      <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
        <button
          onClick={handleAnalysisStart}
          disabled={!validation.isValid || state.isAnalyzing}
          style={themeStyles.button}
        >
          {state.isAnalyzing ? '🔄 Analyzing...' : '🚀 Start Analysis'}
        </button>

        {state.results && (
          <OptimizedResultsDisplay
            results={state.results}
            theme={theme}
            onExport={() => exportResults(state.results)}
          />
        )}
      </div>

      {/* Error Display */}
      {state.errors.length > 0 && (
        <ErrorDisplay errors={state.errors} theme={theme} />
      )}

      {/* Real-time Status Updates */}
      {state.isAnalyzing && state.results && (
        <OptimizedStatusDisplay
          analysis={state.results.analysis}
          theme={theme}
        />
      )}
    </div>
  );
});

// OPTIMIZATION: Debounced input hook
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// OPTIMIZATION: Memoized text area component
const OptimizedTextArea = memo(({ 
  value, 
  onChange, 
  placeholder, 
  style, 
  rows, 
  maxLength, 
  showCharCount,
  theme 
}) => {
  const handleChange = useCallback((e) => {
    onChange(e.target.value);
  }, [onChange]);

  return (
    <div style={{ marginBottom: '16px' }}>
      <textarea
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        style={{ ...style, width: '100%', resize: 'vertical' }}
        rows={rows}
        maxLength={maxLength}
      />
      {showCharCount && (
        <div style={{ 
          fontSize: '12px', 
          color: theme === 'dark' ? '#888' : '#666',
          textAlign: 'right',
          marginTop: '4px'
        }}>
          {value.length} / {maxLength} characters
        </div>
      )}
    </div>
  );
});

// OPTIMIZATION: Memoized select component
const OptimizedSelect = memo(({ label, value, onChange, options, style, theme }) => {
  const handleChange = useCallback((e) => {
    onChange(e.target.value);
  }, [onChange]);

  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={{ 
        display: 'block', 
        marginBottom: '4px',
        color: theme === 'dark' ? '#ffffff' : '#000000'
      }}>
        {label}
      </label>
      <select
        value={value}
        onChange={handleChange}
        style={{ ...style, width: '100%' }}
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
});

// OPTIMIZATION: Lazy-loaded options panel
const LazyOptionsPanel = lazy(() => 
  import('./components/OptionsPanel').then(module => ({ 
    default: memo(module.OptionsPanel) 
  }))
);

// OPTIMIZATION: Memoized results display
const OptimizedResultsDisplay = memo(({ results, theme, onExport }) => {
  const memoizedResults = useMemo(() => {
    if (!results?.analysis?.result) return null;

    const { issues, metadata } = results.analysis.result;
    
    return {
      issueCount: issues?.length || 0,
      highConfidenceIssues: issues?.filter(i => i.confidence_score > 0.8).length || 0,
      jiraIssuesCreated: results.analysis.result.jiraIssues?.filter(j => j.success).length || 0,
      processingTime: metadata?.processingTime || results.analysis.result.processingTime,
      cached: results.analysis.result.cached,
      optimized: metadata?.optimized
    };
  }, [results]);

  if (!memoizedResults) return null;

  return (
    <div style={{
      marginTop: '20px',
      padding: '16px',
      backgroundColor: theme === 'dark' ? '#2a2a2a' : '#f8f9fa',
      borderRadius: '8px',
      border: `1px solid ${theme === 'dark' ? '#404040' : '#dee2e6'}`
    }}>
      <h3>📊 Analysis Results</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        <div>📝 Issues Found: {memoizedResults.issueCount}</div>
        <div>⭐ High Confidence: {memoizedResults.highConfidenceIssues}</div>
        <div>✅ Jira Created: {memoizedResults.jiraIssuesCreated}</div>
        <div>⚡ Processing Time: {memoizedResults.processingTime}ms</div>
        {memoizedResults.cached && <div>🚀 Cached Result</div>}
        {memoizedResults.optimized && <div>⚡ Optimized Processing</div>}
      </div>
      <button
        onClick={onExport}
        style={{
          marginTop: '12px',
          padding: '8px 16px',
          backgroundColor: theme === 'dark' ? '#198754' : '#28a745',
          color: '#ffffff',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        📤 Export Results
      </button>
    </div>
  );
});

// OPTIMIZATION: Real-time status display with smooth updates
const OptimizedStatusDisplay = memo(({ analysis, theme }) => {
  const [animatedProgress, setAnimatedProgress] = useState(0);

  useEffect(() => {
    const targetProgress = analysis.progress || 0;
    const duration = 500; // 500ms animation
    const steps = 20;
    const stepDuration = duration / steps;
    const stepSize = (targetProgress - animatedProgress) / steps;

    if (Math.abs(targetProgress - animatedProgress) > 1) {
      let currentStep = 0;
      const interval = setInterval(() => {
        currentStep++;
        setAnimatedProgress(prev => {
          const newProgress = prev + stepSize;
          if (currentStep >= steps || Math.abs(newProgress - targetProgress) < 1) {
            clearInterval(interval);
            return targetProgress;
          }
          return newProgress;
        });
      }, stepDuration);

      return () => clearInterval(interval);
    }
  }, [analysis.progress, animatedProgress]);

  const statusColors = {
    queued: theme === 'dark' ? '#6c757d' : '#6c757d',
    processing: theme === 'dark' ? '#fd7e14' : '#fd7e14',
    creating_issues: theme === 'dark' ? '#20c997' : '#20c997',
    completed: theme === 'dark' ? '#198754' : '#28a745',
    failed: theme === 'dark' ? '#dc3545' : '#dc3545'
  };

  return (
    <div style={{
      marginTop: '16px',
      padding: '16px',
      backgroundColor: theme === 'dark' ? '#2a2a2a' : '#f8f9fa',
      borderRadius: '8px',
      border: `1px solid ${statusColors[analysis.status] || '#dee2e6'}`
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span>Status: {analysis.status?.toUpperCase()}</span>
        <span>{Math.round(animatedProgress)}%</span>
      </div>
      
      {/* Animated progress bar */}
      <div style={{
        width: '100%',
        height: '8px',
        backgroundColor: theme === 'dark' ? '#404040' : '#e9ecef',
        borderRadius: '4px',
        overflow: 'hidden'
      }}>
        <div style={{
          width: `${animatedProgress}%`,
          height: '100%',
          backgroundColor: statusColors[analysis.status] || '#007bff',
          transition: 'width 0.3s ease-in-out',
          borderRadius: '4px'
        }} />
      </div>

      {analysis.result?.processingTime && (
        <div style={{ marginTop: '8px', fontSize: '14px', color: theme === 'dark' ? '#888' : '#666' }}>
          ⚡ Processing completed in {analysis.result.processingTime}ms
          {analysis.result.cached && ' (cached)'}
          {analysis.result.optimized && ' (optimized)'}
        </div>
      )}
    </div>
  );
});

// Error display component
const ErrorDisplay = memo(({ errors, theme }) => (
  <div style={{
    marginTop: '16px',
    padding: '12px',
    backgroundColor: theme === 'dark' ? '#3d1a1a' : '#f8d7da',
    color: theme === 'dark' ? '#f5c6cb' : '#721c24',
    borderRadius: '4px',
    border: `1px solid ${theme === 'dark' ? '#721c24' : '#f5c6cb'}`
  }}>
    <strong>❌ Errors:</strong>
    <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
      {errors.map((error, index) => (
        <li key={index}>{error}</li>
      ))}
    </ul>
  </div>
));

// Constants
const MEETING_TYPE_OPTIONS = [
  { value: 'general', label: '📋 General Meeting' },
  { value: 'dailyStandup', label: '🔄 Daily Standup' },
  { value: 'sprintPlanning', label: '📅 Sprint Planning' },
  { value: 'retrospective', label: '🔍 Retrospective' },
  { value: 'featurePlanning', label: '💡 Feature Planning' },
  { value: 'bugTriage', label: '🐛 Bug Triage' }
];

const ISSUE_TYPE_OPTIONS = [
  { value: 'Task', label: '📝 Task' },
  { value: 'Story', label: '📖 Story' },
  { value: 'Epic', label: '🎯 Epic' },
  { value: 'Bug', label: '🐛 Bug' },
  { value: 'Improvement', label: '⚡ Improvement' }
];

// Utility functions
function calculateEstimatedTime(notes, meetingType) {
  const baseTime = Math.ceil(notes.length / 1000) * 2; // 2 seconds per 1000 chars
  const typeMultiplier = {
    dailyStandup: 0.5,
    bugTriage: 0.7,
    general: 1.0,
    sprintPlanning: 1.3,
    featurePlanning: 1.5,
    retrospective: 1.2
  };
  
  return Math.min(baseTime * (typeMultiplier[meetingType] || 1), 15); // Max 15 seconds estimate
}

function exportResults(results) {
  const exportData = {
    analysis: results.analysis,
    timestamp: new Date().toISOString(),
    optimized: true
  };
  
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `synapse-analysis-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export default MeetingAnalyzerOptimized;
