/**
 * ⚙️ ENHANCED ADMIN PANEL COMPONENT
 * 
 * Admin panel with comprehensive logging and system diagnostics
 */

import React, { useState, useEffect } from 'react';
import { invoke } from '@forge/bridge';
import frontendLogger, { trackBridge, trackComponent, getErrorReport } from '../utils/frontendLogger';

const AdminPanel = ({ userConfig, setUserConfig, addNotification, backendHealth }) => {
  trackComponent('AdminPanel', 'component-start');

  // Component state
  const [systemInfo, setSystemInfo] = useState(null);
  const [diagnosticResults, setDiagnosticResults] = useState(null);
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false);
  const [errorReport, setErrorReport] = useState(null);
  const [configChanges, setConfigChanges] = useState({});
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  useEffect(() => {
    trackComponent('AdminPanel', 'mounted');
    loadSystemInfo();
    loadErrorReport();
    
    return () => {
      trackComponent('AdminPanel', 'unmounted');
    };
  }, []);

  const loadSystemInfo = async () => {
    try {
      frontendLogger.admin('📊 Loading system information');
      
      const tracker = trackBridge('getDebugInfo', {});
      const debugInfo = await invoke('getDebugInfo');
      tracker.complete(debugInfo);
      
      setSystemInfo(debugInfo);
      frontendLogger.admin('✅ System information loaded', { 
        hasBackend: !!debugInfo.backend,
        hasLogging: !!debugInfo.logging 
      });
    } catch (error) {
      frontendLogger.error('❌ Failed to load system info', {
        error: error.message,
        component: 'AdminPanel'
      });
      addNotification('❌ Failed to load system information', 'error');
    }
  };

  const loadErrorReport = () => {
    try {
      const report = getErrorReport();
      setErrorReport(report);
      frontendLogger.admin('📋 Error report loaded', {
        totalLogs: report.totalLogs,
        errorCount: report.errors.total
      });
    } catch (error) {
      frontendLogger.error('❌ Failed to load error report', { error: error.message });
    }
  };

  const runComprehensiveDiagnostics = async () => {
    trackComponent('AdminPanel', 'diagnostics-start');
    setIsRunningDiagnostics(true);
    
    const diagnostics = {
      timestamp: new Date().toISOString(),
      tests: {},
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0
      }
    };

    const runTest = async (testName, testFunction) => {
      frontendLogger.admin(`🧪 Running test: ${testName}`);
      diagnostics.summary.total++;
      
      try {
        const startTime = Date.now();
        const result = await testFunction();
        const duration = Date.now() - startTime;
        
        diagnostics.tests[testName] = {
          status: 'passed',
          duration,
          result,
          timestamp: new Date().toISOString()
        };
        
        diagnostics.summary.passed++;
        frontendLogger.admin(`✅ Test passed: ${testName}`, { duration });
      } catch (error) {
        diagnostics.tests[testName] = {
          status: 'failed',
          error: error.message,
          timestamp: new Date().toISOString()
        };
        
        diagnostics.summary.failed++;
        frontendLogger.admin(`❌ Test failed: ${testName}`, { error: error.message });
      }
    };

    // Test 1: Backend Health
    await runTest('backend-health', async () => {
      const tracker = trackBridge('health', {});
      const health = await invoke('health');
      tracker.complete(health);
      
      if (!health.success) {
        throw new Error('Backend health check failed');
      }
      return health;
    });

    // Test 2: Connection Test
    await runTest('connection-test', async () => {
      const tracker = trackBridge('testConnection', {});
      const connection = await invoke('testConnection');
      tracker.complete(connection);
      
      if (!connection.success) {
        throw new Error('Connection test failed');
      }
      return connection;
    });

    // Test 3: User Context
    await runTest('user-context', async () => {
      const tracker = trackBridge('getUserContext', {});
      const context = await invoke('getUserContext');
      tracker.complete(context);
      return context;
    });

    // Test 4: Admin Permissions
    await runTest('admin-permissions', async () => {
      const tracker = trackBridge('checkAdminPermissions', {});
      const perms = await invoke('checkAdminPermissions');
      tracker.complete(perms);
      return perms;
    });

    // Test 5: Content Validation
    await runTest('content-validation', async () => {
      const tracker = trackBridge('validateContent', { content: 'test content' });
      const validation = await invoke('validateContent', { content: 'test content for validation' });
      tracker.complete(validation);
      return validation;
    });

    // Test 6: Storage Test (via testConnection)
    await runTest('storage-test', async () => {
      const tracker = trackBridge('testConnection', {});
      const result = await invoke('testConnection');
      tracker.complete(result);
      
      if (!result.success || !result.tests?.storage) {
        throw new Error('Storage test not available');
      }
      
      if (result.tests.storage.status !== 'ok') {
        throw new Error(`Storage test failed: ${result.tests.storage.error || 'unknown error'}`);
      }
      
      return result.tests.storage;
    });

    // Frontend Tests
    const frontendReport = getErrorReport();
    
    // Test 7: Frontend Error Count
    diagnostics.tests['frontend-errors'] = {
      status: frontendReport.errors.total === 0 ? 'passed' : 'warning',
      result: {
        totalErrors: frontendReport.errors.total,
        constructorErrors: frontendReport.errors.constructor,
        bridgeErrors: frontendReport.errors.bridge
      },
      timestamp: new Date().toISOString()
    };
    
    if (frontendReport.errors.total === 0) {
      diagnostics.summary.passed++;
    } else {
      diagnostics.summary.warnings++;
    }
    diagnostics.summary.total++;

    // Test 8: CSP Violations
    diagnostics.tests['csp-violations'] = {
      status: frontendReport.cspViolations.total === 0 ? 'passed' : 'warning',
      result: {
        totalViolations: frontendReport.cspViolations.total,
        recentViolations: frontendReport.cspViolations.recent
      },
      timestamp: new Date().toISOString()
    };
    
    if (frontendReport.cspViolations.total === 0) {
      diagnostics.summary.passed++;
    } else {
      diagnostics.summary.warnings++;
    }
    diagnostics.summary.total++;

    setDiagnosticResults(diagnostics);
    setIsRunningDiagnostics(false);
    
    frontendLogger.admin('🔍 Comprehensive diagnostics completed', {
      total: diagnostics.summary.total,
      passed: diagnostics.summary.passed,
      failed: diagnostics.summary.failed,
      warnings: diagnostics.summary.warnings
    });
    
    if (diagnostics.summary.failed > 0) {
      addNotification(`⚠️ Diagnostics completed with ${diagnostics.summary.failed} failures`, 'warning');
    } else {
      addNotification('✅ All diagnostics passed successfully', 'success');
    }
    
    trackComponent('AdminPanel', 'diagnostics-completed', {
      passed: diagnostics.summary.passed,
      failed: diagnostics.summary.failed
    });
  };

  const exportDiagnostics = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      systemInfo,
      diagnosticResults,
      errorReport,
      backendHealth,
      userConfig
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `synapse-diagnostics-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    frontendLogger.admin('📥 Diagnostics exported');
    addNotification('📥 Diagnostics exported successfully', 'success');
  };

  const handleConfigChange = (section, key, value) => {
    const changeKey = `${section}.${key}`;
    setConfigChanges(prev => ({
      ...prev,
      [changeKey]: value
    }));
    
    frontendLogger.admin('⚙️ Config change staged', { section, key, value });
  };

  const saveConfiguration = async () => {
    if (Object.keys(configChanges).length === 0) {
      addNotification('ℹ️ No configuration changes to save', 'info');
      return;
    }

    setIsSavingConfig(true);
    trackComponent('AdminPanel', 'config-save-start');
    
    try {
      // Apply changes to user config
      const updatedConfig = { ...userConfig.config };
      
      Object.entries(configChanges).forEach(([key, value]) => {
        const [section, configKey] = key.split('.');
        if (!updatedConfig[section]) {
          updatedConfig[section] = {};
        }
        updatedConfig[section][configKey] = value;
      });
      
      // For now, just update local state
      // In a real implementation, you'd save to backend storage
      setUserConfig({ ...userConfig, config: updatedConfig });
      setConfigChanges({});
      
      frontendLogger.admin('✅ Configuration saved', { 
        changesCount: Object.keys(configChanges).length,
        updatedConfig 
      });
      
      addNotification('✅ Configuration saved successfully', 'success');
      trackComponent('AdminPanel', 'config-save-completed');
      
    } catch (error) {
      frontendLogger.error('❌ Failed to save configuration', {
        error: error.message,
        configChanges
      });
      addNotification(`❌ Failed to save configuration: ${error.message}`, 'error');
      trackComponent('AdminPanel', 'config-save-failed', { error: error.message });
    }
    
    setIsSavingConfig(false);
  };

  const clearAllErrors = () => {
    frontendLogger.admin('🧹 Clearing frontend error logs');
    
    // Reset frontend logger errors
    if (frontendLogger.clearErrors) {
      frontendLogger.clearErrors();
    }
    
    // Reload error report
    loadErrorReport();
    
    addNotification('🧹 Error logs cleared', 'success');
  };

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h2>⚙️ Admin Panel</h2>
        <div className="admin-actions">
          <button
            onClick={runComprehensiveDiagnostics}
            disabled={isRunningDiagnostics}
            className="diagnostics-btn primary-btn"
          >
            {isRunningDiagnostics ? '🔍 Running...' : '🔍 Run Diagnostics'}
          </button>
          
          <button
            onClick={exportDiagnostics}
            className="export-btn secondary-btn"
          >
            📥 Export Data
          </button>
        </div>
      </div>

      <div className="admin-content">
        {/* System Overview */}
        <div className="admin-section">
          <h3>📊 System Overview</h3>
          <div className="system-grid">
            <div className="system-card">
              <h4>Backend Status</h4>
              {backendHealth ? (
                <div className="status-info">
                  <div className="status-indicator status-healthy">✅ Healthy</div>
                  <div>Version: {backendHealth.version}</div>
                  <div>Uptime: {backendHealth.backend?.uptime || 'Unknown'}</div>
                </div>
              ) : (
                <div className="status-indicator status-error">❌ Unknown</div>
              )}
            </div>

            <div className="system-card">
              <h4>Frontend Status</h4>
              {errorReport ? (
                <div className="status-info">
                  <div className={`status-indicator ${errorReport.errors.total === 0 ? 'status-healthy' : 'status-warning'}`}>
                    {errorReport.errors.total === 0 ? '✅ Clean' : `⚠️ ${errorReport.errors.total} errors`}
                  </div>
                  <div>Logs: {errorReport.totalLogs}</div>
                  <div>Session: {Math.round(errorReport.uptime / 1000)}s</div>
                </div>
              ) : (
                <div className="status-indicator status-warning">⚠️ No data</div>
              )}
            </div>

            <div className="system-card">
              <h4>CSP Status</h4>
              {errorReport ? (
                <div className="status-info">
                  <div className={`status-indicator ${errorReport.cspViolations.total === 0 ? 'status-healthy' : 'status-error'}`}>
                    {errorReport.cspViolations.total === 0 ? '✅ No violations' : `❌ ${errorReport.cspViolations.total} violations`}
                  </div>
                </div>
              ) : (
                <div className="status-indicator status-warning">⚠️ Unknown</div>
              )}
            </div>

            <div className="system-card">
              <h4>System Info</h4>
              {systemInfo ? (
                <div className="status-info">
                  <div className="status-indicator status-healthy">✅ Available</div>
                  <div>Functions: {systemInfo.resolver?.registeredFunctions?.length || 0}</div>
                  <div>Node: {systemInfo.backend?.nodeVersion || 'Unknown'}</div>
                </div>
              ) : (
                <div className="status-indicator status-warning">⚠️ Loading...</div>
              )}
            </div>
          </div>
        </div>

        {/* Diagnostic Results */}
        {diagnosticResults && (
          <div className="admin-section">
            <h3>🔍 Diagnostic Results</h3>
            <div className="diagnostic-summary">
              <div className="summary-stats">
                <span className="stat-item">
                  <strong>Total:</strong> {diagnosticResults.summary.total}
                </span>
                <span className="stat-item stat-passed">
                  <strong>Passed:</strong> {diagnosticResults.summary.passed}
                </span>
                <span className="stat-item stat-failed">
                  <strong>Failed:</strong> {diagnosticResults.summary.failed}
                </span>
                <span className="stat-item stat-warnings">
                  <strong>Warnings:</strong> {diagnosticResults.summary.warnings}
                </span>
              </div>
            </div>
            
            <div className="diagnostic-tests">
              {Object.entries(diagnosticResults.tests).map(([testName, result]) => (
                <div key={testName} className={`test-result test-${result.status}`}>
                  <div className="test-header">
                    <span className="test-name">{testName}</span>
                    <span className="test-status">
                      {result.status === 'passed' && '✅'}
                      {result.status === 'failed' && '❌'}
                      {result.status === 'warning' && '⚠️'}
                      {result.status}
                    </span>
                    {result.duration && (
                      <span className="test-duration">{result.duration}ms</span>
                    )}
                  </div>
                  
                  {result.error && (
                    <div className="test-error">
                      Error: {result.error}
                    </div>
                  )}
                  
                  {result.result && typeof result.result === 'object' && (
                    <div className="test-details">
                      <pre>{JSON.stringify(result.result, null, 2)}</pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Configuration */}
        <div className="admin-section">
          <h3>⚙️ Configuration</h3>
          {userConfig && (
            <div className="config-editor">
              <div className="config-section">
                <h4>User Preferences</h4>
                <div className="config-fields">
                  <div className="config-field">
                    <label>Default Meeting Type:</label>
                    <select
                      value={userConfig.config.preferences?.defaultMeetingType || 'general'}
                      onChange={(e) => handleConfigChange('preferences', 'defaultMeetingType', e.target.value)}
                    >
                      <option value="general">General Meeting</option>
                      <option value="standup">Daily Standup</option>
                      <option value="retrospective">Retrospective</option>
                      <option value="planning">Planning Session</option>
                      <option value="review">Review Meeting</option>
                      <option value="brainstorming">Brainstorming</option>
                    </select>
                  </div>
                  
                  <div className="config-field">
                    <label>
                      <input
                        type="checkbox"
                        checked={userConfig.config.preferences?.autoExtractActions || false}
                        onChange={(e) => handleConfigChange('preferences', 'autoExtractActions', e.target.checked)}
                      />
                      Auto-extract action items
                    </label>
                  </div>
                  
                  <div className="config-field">
                    <label>
                      <input
                        type="checkbox"
                        checked={userConfig.config.preferences?.emailNotifications || false}
                        onChange={(e) => handleConfigChange('preferences', 'emailNotifications', e.target.checked)}
                      />
                      Email notifications
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="config-section">
                <h4>Interface Settings</h4>
                <div className="config-fields">
                  <div className="config-field">
                    <label>Theme:</label>
                    <select
                      value={userConfig.config.settings?.theme || 'light'}
                      onChange={(e) => handleConfigChange('settings', 'theme', e.target.value)}
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                      <option value="auto">Auto</option>
                    </select>
                  </div>
                  
                  <div className="config-field">
                    <label>Language:</label>
                    <select
                      value={userConfig.config.settings?.language || 'en'}
                      onChange={(e) => handleConfigChange('settings', 'language', e.target.value)}
                    >
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                    </select>
                  </div>
                </div>
              </div>
              
              {Object.keys(configChanges).length > 0 && (
                <div className="config-actions">
                  <div className="pending-changes">
                    <strong>Pending changes:</strong>
                    <ul>
                      {Object.entries(configChanges).map(([key, value]) => (
                        <li key={key}>
                          {key}: {typeof value === 'boolean' ? (value ? 'enabled' : 'disabled') : value}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <button
                    onClick={saveConfiguration}
                    disabled={isSavingConfig}
                    className="save-config-btn primary-btn"
                  >
                    {isSavingConfig ? '💾 Saving...' : '💾 Save Configuration'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Error Management */}
        {errorReport && (
          <div className="admin-section">
            <h3>🚨 Error Management</h3>
            <div className="error-summary">
              <div className="error-stats">
                <div className="error-stat">
                  <span className="error-count">{errorReport.errors.total}</span>
                  <span className="error-label">Total Errors</span>
                </div>
                <div className="error-stat">
                  <span className="error-count">{errorReport.errors.constructor}</span>
                  <span className="error-label">Constructor Errors</span>
                </div>
                <div className="error-stat">
                  <span className="error-count">{errorReport.errors.bridge}</span>
                  <span className="error-label">Bridge Errors</span>
                </div>
                <div className="error-stat">
                  <span className="error-count">{errorReport.cspViolations.total}</span>
                  <span className="error-label">CSP Violations</span>
                </div>
              </div>
              
              <div className="error-actions">
                <button
                  onClick={loadErrorReport}
                  className="refresh-errors-btn secondary-btn"
                >
                  🔄 Refresh
                </button>
                
                <button
                  onClick={clearAllErrors}
                  className="clear-errors-btn tertiary-btn"
                >
                  🧹 Clear Errors
                </button>
              </div>
            </div>
            
            {errorReport.errors.recent.length > 0 && (
              <div className="recent-errors">
                <h4>Recent Errors:</h4>
                <div className="error-list">
                  {errorReport.errors.recent.map((error, index) => (
                    <div key={index} className="error-item">
                      <div className="error-type">{error.type}</div>
                      <div className="error-message">{error.message}</div>
                      <div className="error-time">{new Date(error.timestamp).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* System Information */}
        {systemInfo && (
          <div className="admin-section">
            <h3>💻 System Information</h3>
            <div className="system-details">
              <div className="info-section">
                <h4>Backend Information:</h4>
                <pre>{JSON.stringify(systemInfo.backend, null, 2)}</pre>
              </div>
              
              <div className="info-section">
                <h4>Resolver Information:</h4>
                <pre>{JSON.stringify(systemInfo.resolver, null, 2)}</pre>
              </div>
              
              <div className="info-section">
                <h4>Logging Statistics:</h4>
                <pre>{JSON.stringify(systemInfo.logging, null, 2)}</pre>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .admin-panel {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .admin-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 1px solid #e1e8ed;
        }

        .admin-header h2 {
          margin: 0;
          color: #2d3436;
        }

        .admin-actions {
          display: flex;
          gap: 10px;
        }

        .admin-actions button {
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

        .admin-actions button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .admin-actions button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .admin-content {
          display: flex;
          flex-direction: column;
          gap: 30px;
        }

        .admin-section {
          background: white;
          border: 1px solid #e1e8ed;
          border-radius: 8px;
          padding: 25px;
        }

        .admin-section h3 {
          margin: 0 0 20px 0;
          color: #2d3436;
          border-bottom: 1px solid #f1f3f4;
          padding-bottom: 10px;
        }

        .system-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
        }

        .system-card {
          background: #f8f9fa;
          border: 1px solid #e9ecef;
          border-radius: 6px;
          padding: 20px;
        }

        .system-card h4 {
          margin: 0 0 15px 0;
          color: #495057;
        }

        .status-info {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .status-indicator {
          padding: 6px 12px;
          border-radius: 4px;
          font-size: 14px;
          font-weight: 500;
        }

        .status-healthy {
          background: #d4edda;
          color: #155724;
        }

        .status-warning {
          background: #fff3cd;
          color: #856404;
        }

        .status-error {
          background: #f8d7da;
          color: #721c24;
        }

        .diagnostic-summary {
          margin-bottom: 20px;
        }

        .summary-stats {
          display: flex;
          gap: 20px;
          flex-wrap: wrap;
        }

        .stat-item {
          padding: 8px 16px;
          border-radius: 4px;
          background: #f8f9fa;
        }

        .stat-passed {
          background: #d4edda;
          color: #155724;
        }

        .stat-failed {
          background: #f8d7da;
          color: #721c24;
        }

        .stat-warnings {
          background: #fff3cd;
          color: #856404;
        }

        .diagnostic-tests {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .test-result {
          border: 1px solid #ddd;
          border-radius: 6px;
          padding: 15px;
        }

        .test-passed {
          border-color: #28a745;
          background: #f8fff9;
        }

        .test-failed {
          border-color: #dc3545;
          background: #fff8f8;
        }

        .test-warning {
          border-color: #ffc107;
          background: #fffdf5;
        }

        .test-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-weight: 500;
        }

        .test-error {
          margin-top: 10px;
          color: #dc3545;
          font-size: 14px;
        }

        .test-details {
          margin-top: 10px;
        }

        .test-details pre {
          background: #f8f9fa;
          padding: 10px;
          border-radius: 4px;
          font-size: 12px;
          overflow-x: auto;
          max-height: 200px;
          overflow-y: auto;
        }

        .config-editor {
          display: flex;
          flex-direction: column;
          gap: 25px;
        }

        .config-section h4 {
          margin: 0 0 15px 0;
          color: #495057;
        }

        .config-fields {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .config-field {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .config-field label {
          min-width: 150px;
          font-weight: 500;
        }

        .config-field select {
          padding: 6px 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          background: white;
        }

        .config-field input[type="checkbox"] {
          margin-right: 8px;
        }

        .config-actions {
          background: #f8f9fa;
          border: 1px solid #e9ecef;
          border-radius: 6px;
          padding: 20px;
        }

        .pending-changes {
          margin-bottom: 15px;
        }

        .pending-changes ul {
          margin: 10px 0;
          padding-left: 20px;
        }

        .error-summary {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .error-stats {
          display: flex;
          gap: 20px;
        }

        .error-stat {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .error-count {
          font-size: 24px;
          font-weight: bold;
          color: #dc3545;
        }

        .error-label {
          font-size: 12px;
          color: #6c757d;
        }

        .error-actions {
          display: flex;
          gap: 10px;
        }

        .recent-errors {
          margin-top: 20px;
        }

        .error-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: 300px;
          overflow-y: auto;
        }

        .error-item {
          background: #f8d7da;
          border: 1px solid #f5c6cb;
          border-radius: 4px;
          padding: 10px;
        }

        .error-type {
          font-weight: bold;
          color: #721c24;
        }

        .error-message {
          margin: 5px 0;
          color: #721c24;
        }

        .error-time {
          font-size: 12px;
          color: #856404;
        }

        .system-details {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .info-section h4 {
          margin: 0 0 10px 0;
          color: #495057;
        }

        .info-section pre {
          background: #f8f9fa;
          border: 1px solid #e9ecef;
          border-radius: 4px;
          padding: 15px;
          font-size: 12px;
          overflow-x: auto;
          max-height: 300px;
          overflow-y: auto;
        }
      `}</style>
    </div>
  );
};

export default AdminPanel;