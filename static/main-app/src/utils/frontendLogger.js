/**
 * 🔍 FRONTEND ERROR DETECTION & LOGGING SYSTEM
 * 
 * Comprehensive frontend logging to detect:
 * - CSP violations
 * - Constructor errors
 * - Webpack import issues
 * - Bridge connection problems
 * - Runtime exceptions
 */

class FrontendLogger {
  constructor() {
    this.sessionId = this.generateSessionId();
    this.startTime = Date.now();
    this.logCount = 0;
    this.errors = [];
    this.cspViolations = [];
    this.constructorErrors = [];
    this.bridgeErrors = [];
    
    this.initializeErrorDetection();
    this.log('INIT', 'Frontend Logger initialized', {
      sessionId: this.sessionId,
      userAgent: navigator.userAgent,
      url: window.location.href
    });
  }

  generateSessionId() {
    return `frontend_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  initializeErrorDetection() {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.handleGlobalError(event);
    });

    // Promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.handleUnhandledRejection(event);
    });

    // CSP violation handler
    document.addEventListener('securitypolicyviolation', (event) => {
      this.handleCSPViolation(event);
    });

    // Console override to catch console errors
    this.interceptConsole();
    
    this.log('INIT', 'Error detection systems initialized');
  }

  handleGlobalError(event) {
    const errorInfo = {
      type: 'global-error',
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack,
      timestamp: new Date().toISOString()
    };

    // Check for constructor errors
    if (event.message && event.message.includes('is not a constructor')) {
      this.constructorErrors.push(errorInfo);
      this.log('ERROR', '🚨 CONSTRUCTOR ERROR DETECTED', errorInfo);
      
      // Special handling for webpack constructor errors
      if (event.message.includes('WEBPACK_IMPORTED_MODULE')) {
        this.log('ERROR', '🔧 WEBPACK CONSTRUCTOR ERROR', {
          ...errorInfo,
          webpackSpecific: true,
          likelyImportIssue: true
        });
      }
    }

    // Check for Forge-related errors
    if (event.message && (event.message.includes('forge') || event.message.includes('bridge'))) {
      this.bridgeErrors.push(errorInfo);
      this.log('ERROR', '🌉 FORGE BRIDGE ERROR', errorInfo);
    }

    this.errors.push(errorInfo);
    this.log('ERROR', 'Global error caught', errorInfo);
  }

  handleUnhandledRejection(event) {
    const errorInfo = {
      type: 'unhandled-rejection',
      reason: event.reason?.toString(),
      stack: event.reason?.stack,
      timestamp: new Date().toISOString()
    };

    this.errors.push(errorInfo);
    this.log('ERROR', 'Unhandled promise rejection', errorInfo);
  }

  handleCSPViolation(event) {
    const violationInfo = {
      type: 'csp-violation',
      directive: event.violatedDirective,
      blockedURI: event.blockedURI,
      documentURI: event.documentURI,
      sourceFile: event.sourceFile,
      lineNumber: event.lineNumber,
      timestamp: new Date().toISOString()
    };

    this.cspViolations.push(violationInfo);
    this.log('SECURITY', '🛡️ CSP VIOLATION DETECTED', violationInfo);

    // Alert for critical CSP violations
    if (event.violatedDirective === 'script-src' || event.violatedDirective === 'script-src-elem') {
      this.log('SECURITY', '🚨 CRITICAL: Script blocked by CSP', violationInfo);
    }
  }

  interceptConsole() {
    const originalConsole = {
      error: console.error,
      warn: console.warn,
      log: console.log
    };

    console.error = (...args) => {
      this.log('CONSOLE', 'Console error intercepted', { args: args.map(String) });
      originalConsole.error.apply(console, args);
    };

    console.warn = (...args) => {
      this.log('CONSOLE', 'Console warning intercepted', { args: args.map(String) });
      originalConsole.warn.apply(console, args);
    };

    // Keep original console.log for our own logging
    this.originalLog = originalConsole.log;
  }

  log(category, message, data = {}) {
    this.logCount++;
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      category,
      message,
      logNumber: this.logCount,
      uptime: Date.now() - this.startTime,
      ...data
    };

    // Use original console.log to avoid recursion
    this.originalLog(`[FRONTEND:${category}]`, message, data);
    return logEntry;
  }

  // Specific logging methods
  init(message, data) { return this.log('INIT', message, data); }
  component(message, data) { return this.log('COMPONENT', message, data); }
  bridge(message, data) { return this.log('BRIDGE', message, data); }
  error(message, data) { return this.log('ERROR', message, data); }
  security(message, data) { return this.log('SECURITY', message, data); }
  performance(message, data) { return this.log('PERFORMANCE', message, data); }

  // Track Forge Bridge operations
  trackBridgeOperation(operation, payload) {
    const startTime = Date.now();
    this.bridge(`🌉 Bridge operation started: ${operation}`, {
      operation,
      payloadSize: JSON.stringify(payload || {}).length,
      startTime
    });

    return {
      complete: (result, error) => {
        const duration = Date.now() - startTime;
        if (error) {
          this.error(`❌ Bridge operation failed: ${operation}`, {
            operation,
            duration,
            error: error.message || error,
            stack: error.stack
          });
        } else {
          this.bridge(`✅ Bridge operation completed: ${operation}`, {
            operation,
            duration,
            resultSize: JSON.stringify(result || {}).length
          });
        }
      }
    };
  }

  // Get comprehensive error report
  getErrorReport() {
    return {
      sessionId: this.sessionId,
      uptime: Date.now() - this.startTime,
      totalLogs: this.logCount,
      errors: {
        total: this.errors.length,
        constructor: this.constructorErrors.length,
        bridge: this.bridgeErrors.length,
        recent: this.errors.slice(-5)
      },
      cspViolations: {
        total: this.cspViolations.length,
        recent: this.cspViolations.slice(-3)
      },
      browser: {
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString()
      }
    };
  }

  // Check for specific error patterns
  checkForKnownIssues() {
    const issues = [];

    // Check for constructor errors
    if (this.constructorErrors.length > 0) {
      issues.push({
        type: 'constructor-error',
        severity: 'critical',
        count: this.constructorErrors.length,
        message: 'Constructor errors detected - likely webpack import issue',
        recommendation: 'Check module imports and webpack configuration'
      });
    }

    // Check for CSP violations
    if (this.cspViolations.length > 0) {
      issues.push({
        type: 'csp-violation',
        severity: 'high',
        count: this.cspViolations.length,
        message: 'Content Security Policy violations detected',
        recommendation: 'Review CSP settings and blocked resources'
      });
    }

    // Check for bridge errors
    if (this.bridgeErrors.length > 0) {
      issues.push({
        type: 'bridge-error',
        severity: 'high',
        count: this.bridgeErrors.length,
        message: 'Forge Bridge errors detected',
        recommendation: 'Check backend connectivity and resolver functions'
      });
    }

    return issues;
  }

  // Monitor performance
  measurePerformance(name, fn) {
    const startTime = performance.now();
    const result = fn();
    const endTime = performance.now();
    
    this.performance(`⏱️ Performance: ${name}`, {
      operation: name,
      duration: endTime - startTime,
      timestamp: new Date().toISOString()
    });

    return result;
  }

  // Component lifecycle tracking
  trackComponent(componentName, lifecycle, data = {}) {
    this.component(`📱 ${componentName} - ${lifecycle}`, {
      component: componentName,
      lifecycle,
      timestamp: new Date().toISOString(),
      ...data
    });
  }
}

// Create global logger instance
const frontendLogger = new FrontendLogger();

// Export for use in components
window.frontendLogger = frontendLogger;

export default frontendLogger;

// Convenience exports
export const logInit = (message, data) => frontendLogger.init(message, data);
export const logComponent = (message, data) => frontendLogger.component(message, data);
export const logBridge = (message, data) => frontendLogger.bridge(message, data);
export const logError = (message, data) => frontendLogger.error(message, data);
export const logSecurity = (message, data) => frontendLogger.security(message, data);
export const logPerformance = (message, data) => frontendLogger.performance(message, data);
export const trackBridge = (operation, payload) => frontendLogger.trackBridgeOperation(operation, payload);
export const trackComponent = (name, lifecycle, data) => frontendLogger.trackComponent(name, lifecycle, data);
export const getErrorReport = () => frontendLogger.getErrorReport();
export const checkIssues = () => frontendLogger.checkForKnownIssues();

frontendLogger.init('Frontend error detection system ready', {
  errorHandlers: ['global', 'promise', 'csp', 'console'],
  readyAt: new Date().toISOString()
});