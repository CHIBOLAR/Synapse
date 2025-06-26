/**
 * 🛡️ ENHANCED ERROR BOUNDARY
 * 
 * Comprehensive error boundary that catches:
 * - Constructor errors
 * - Webpack import issues
 * - React rendering errors
 * - Runtime exceptions
 */

import React from 'react';
import frontendLogger from '../utils/frontendLogger';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      errorCount: 0
    };
    
    this.logError = this.logError.bind(this);
    this.resetError = this.resetError.bind(this);
    
    frontendLogger.component('ErrorBoundary initialized');
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    frontendLogger.error('🛡️ Error boundary caught error', {
      errorId,
      errorName: error.name,
      errorMessage: error.message,
      isConstructorError: error.message?.includes('is not a constructor'),
      isWebpackError: error.message?.includes('WEBPACK_IMPORTED_MODULE'),
      isBridgeError: error.message?.includes('bridge') || error.message?.includes('forge'),
      timestamp: new Date().toISOString()
    });

    return {
      hasError: true,
      error,
      errorId,
      errorCount: 1
    };
  }

  componentDidCatch(error, errorInfo) {
    this.logError(error, errorInfo);
    
    this.setState(prevState => ({
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));
    
    // Report to error tracking service if available
    if (window.reportError) {
      window.reportError(error, errorInfo);
    }
  }

  logError(error, errorInfo) {
    const errorData = {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
      componentStack: errorInfo?.componentStack,
      errorBoundary: true,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // Analyze error type
    const errorAnalysis = this.analyzeError(error);
    
    frontendLogger.error('🛡️ Error boundary detailed analysis', {
      ...errorData,
      analysis: errorAnalysis
    });

    // Special handling for critical errors
    if (errorAnalysis.isCritical) {
      frontendLogger.error('🚨 CRITICAL ERROR DETECTED', {
        ...errorData,
        analysis: errorAnalysis,
        recommendedAction: errorAnalysis.recommendation
      });
    }
    
    // Log to console for immediate visibility
    console.error('🛡️ ERROR BOUNDARY CAUGHT ERROR:', error);
    console.error('📍 Error Info:', errorInfo);
    console.error('🔍 Analysis:', errorAnalysis);
  }

  analyzeError(error) {
    const message = error.message || '';
    const stack = error.stack || '';
    const name = error.name || '';

    const analysis = {
      isCritical: false,
      isConstructorError: false,
      isWebpackError: false,
      isBridgeError: false,
      isImportError: false,
      isCSPError: false,
      recommendation: 'Standard error recovery'
    };

    // Constructor error detection
    if (message.includes('is not a constructor')) {
      analysis.isConstructorError = true;
      analysis.isCritical = true;
      analysis.recommendation = 'Check module imports and exports. Verify webpack configuration.';
      
      if (message.includes('WEBPACK_IMPORTED_MODULE')) {
        analysis.isWebpackError = true;
        analysis.recommendation = 'Webpack import issue detected. Check module resolution and build configuration.';
      }
    }

    // Bridge/Forge error detection
    if (message.includes('bridge') || message.includes('forge') || message.includes('invoke')) {
      analysis.isBridgeError = true;
      analysis.isCritical = true;
      analysis.recommendation = 'Forge Bridge connectivity issue. Check backend resolver functions.';
    }

    // Import error detection
    if (message.includes('import') || message.includes('module') || stack.includes('import(')) {
      analysis.isImportError = true;
      analysis.recommendation = 'Module import failed. Check file paths and dependencies.';
    }

    // CSP error detection
    if (message.includes('Content Security Policy') || message.includes('CSP')) {
      analysis.isCSPError = true;
      analysis.isCritical = true;
      analysis.recommendation = 'Content Security Policy violation. Check CSP headers and script sources.';
    }

    // React-specific errors
    if (name === 'ChunkLoadError' || message.includes('Loading chunk')) {
      analysis.isChunkError = true;
      analysis.isCritical = true;
      analysis.recommendation = 'Chunk loading failed. Check network connectivity and build output.';
    }

    return analysis;
  }

  resetError() {
    frontendLogger.component('🔄 Error boundary reset requested');
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    });
  }

  getErrorReport() {
    return {
      errorId: this.state.errorId,
      error: {
        name: this.state.error?.name,
        message: this.state.error?.message,
        stack: this.state.error?.stack
      },
      errorInfo: this.state.errorInfo,
      errorCount: this.state.errorCount,
      analysis: this.state.error ? this.analyzeError(this.state.error) : null,
      timestamp: new Date().toISOString(),
      browser: {
        userAgent: navigator.userAgent,
        url: window.location.href
      }
    };
  }

  exportErrorReport() {
    const report = this.getErrorReport();
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-report-${this.state.errorId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    frontendLogger.component('📥 Error report exported', { errorId: this.state.errorId });
  }

  render() {
    if (this.state.hasError) {
      const analysis = this.state.error ? this.analyzeError(this.state.error) : null;
      
      return (
        <div className="error-boundary-container">
          <div className="error-boundary-content">
            <h1>🛡️ Application Error Caught</h1>
            <p>The error boundary has caught an error to prevent the entire application from crashing.</p>
            
            <div className="error-details">
              <h2>Error Information:</h2>
              <div className="error-summary">
                <p><strong>Error ID:</strong> {this.state.errorId}</p>
                <p><strong>Error Type:</strong> {this.state.error?.name}</p>
                <p><strong>Error Count:</strong> {this.state.errorCount}</p>
              </div>
              
              <div className="error-message">
                <h3>Message:</h3>
                <pre>{this.state.error?.message}</pre>
              </div>
              
              {analysis && (
                <div className="error-analysis">
                  <h3>Error Analysis:</h3>
                  <ul>
                    {analysis.isConstructorError && <li className="critical">🚨 Constructor Error Detected</li>}
                    {analysis.isWebpackError && <li className="critical">🔧 Webpack Import Issue</li>}
                    {analysis.isBridgeError && <li className="critical">🌉 Forge Bridge Problem</li>}
                    {analysis.isImportError && <li className="warning">📦 Import Error</li>}
                    {analysis.isCSPError && <li className="critical">🛡️ CSP Violation</li>}
                    {analysis.isCritical && <li className="critical">⚠️ Critical Error</li>}
                  </ul>
                  
                  <div className="recommendation">
                    <h4>Recommended Action:</h4>
                    <p>{analysis.recommendation}</p>
                  </div>
                </div>
              )}
              
              {this.state.errorInfo && (
                <div className="component-stack">
                  <h3>Component Stack:</h3>
                  <pre>{this.state.errorInfo.componentStack}</pre>
                </div>
              )}
              
              <div className="error-stack">
                <h3>Error Stack:</h3>
                <pre>{this.state.error?.stack}</pre>
              </div>
            </div>
            
            <div className="error-actions">
              <button onClick={this.resetError} className="retry-btn primary-btn">
                🔄 Try Again
              </button>
              
              <button onClick={() => window.location.reload()} className="reload-btn secondary-btn">
                🔃 Reload Page
              </button>
              
              <button onClick={() => this.exportErrorReport()} className="export-btn tertiary-btn">
                📥 Export Error Report
              </button>
              
              <button 
                onClick={() => {
                  const report = this.getErrorReport();
                  console.error('FULL ERROR REPORT:', report);
                  frontendLogger.error('📊 Full error report logged to console', report);
                }}
                className="debug-btn tertiary-btn"
              >
                🔍 Log to Console
              </button>
            </div>
            
            {analysis?.isCritical && (
              <div className="critical-error-notice">
                <h3>🚨 Critical Error Detected</h3>
                <p>This appears to be a critical system error that may require developer attention.</p>
                <p>Please consider exporting the error report and contacting support.</p>
              </div>
            )}
          </div>
          
          <style jsx>{`
            .error-boundary-container {
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              background: linear-gradient(135deg, #ff6b6b, #ffd93d);
              padding: 20px;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            
            .error-boundary-content {
              background: white;
              border-radius: 12px;
              padding: 30px;
              max-width: 800px;
              width: 100%;
              box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
              max-height: 90vh;
              overflow-y: auto;
            }
            
            .error-details {
              margin: 20px 0;
            }
            
            .error-summary {
              background: #f8f9fa;
              padding: 15px;
              border-radius: 8px;
              margin: 10px 0;
            }
            
            .error-message, .component-stack, .error-stack {
              margin: 15px 0;
            }
            
            .error-message pre, .component-stack pre, .error-stack pre {
              background: #f1f3f4;
              padding: 10px;
              border-radius: 4px;
              overflow-x: auto;
              font-size: 12px;
              max-height: 200px;
              overflow-y: auto;
            }
            
            .error-analysis {
              background: #fff3cd;
              border: 1px solid #ffeaa7;
              border-radius: 8px;
              padding: 15px;
              margin: 15px 0;
            }
            
            .error-analysis ul {
              list-style: none;
              padding: 0;
            }
            
            .error-analysis li {
              padding: 5px 0;
            }
            
            .error-analysis li.critical {
              color: #d63031;
              font-weight: bold;
            }
            
            .error-analysis li.warning {
              color: #e17055;
            }
            
            .recommendation {
              background: #dff0d8;
              border: 1px solid #d6e9c6;
              border-radius: 4px;
              padding: 10px;
              margin: 10px 0;
            }
            
            .error-actions {
              display: flex;
              gap: 10px;
              flex-wrap: wrap;
              margin: 20px 0;
            }
            
            .error-actions button {
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
            
            .error-actions button:hover {
              transform: translateY(-1px);
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            }
            
            .critical-error-notice {
              background: #ff6b6b;
              color: white;
              padding: 15px;
              border-radius: 8px;
              margin: 20px 0;
            }
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;