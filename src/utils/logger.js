// Logger utility for structured logging
// Production-ready logging with different levels and security

export class Logger {
  static LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    CRITICAL: 4
  };

  static currentLevel = Logger.LOG_LEVELS[process.env.LOG_LEVEL?.toUpperCase()] || Logger.LOG_LEVELS.INFO;

  /**
   * Log debug messages (development only)
   */
  static debug(message, data = {}) {
    if (Logger.currentLevel <= Logger.LOG_LEVELS.DEBUG) {
      Logger.log('DEBUG', message, data);
    }
  }

  /**
   * Log informational messages
   */
  static info(message, data = {}) {
    if (Logger.currentLevel <= Logger.LOG_LEVELS.INFO) {
      Logger.log('INFO', message, data);
    }
  }

  /**
   * Log warning messages
   */
  static warn(message, data = {}) {
    if (Logger.currentLevel <= Logger.LOG_LEVELS.WARN) {
      Logger.log('WARN', message, data);
    }
  }

  /**
   * Log error messages
   */
  static error(message, data = {}) {
    if (Logger.currentLevel <= Logger.LOG_LEVELS.ERROR) {
      Logger.log('ERROR', message, data);
    }
  }

  /**
   * Log critical errors that need immediate attention
   */
  static critical(message, data = {}) {
    Logger.log('CRITICAL', message, data);
  }

  /**
   * Core logging function with structured output
   */
  static log(level, message, data = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...Logger.sanitizeLogData(data)
    };

    // Output to console with proper formatting
    const output = JSON.stringify(logEntry);
    
    switch (level) {
      case 'DEBUG':
        console.debug(output);
        break;
      case 'INFO':
        console.info(output);
        break;
      case 'WARN':
        console.warn(output);
        break;
      case 'ERROR':
      case 'CRITICAL':
        console.error(output);
        break;
      default:
        console.log(output);
    }
  }

  /**
   * Sanitize log data to prevent sensitive information leakage
   */
  static sanitizeLogData(data) {
    const sanitized = { ...data };

    // Remove or mask sensitive fields
    const sensitiveFields = [
      'password', 'apiKey', 'token', 'secret', 'authorization',
      'claude_api_key', 'auth_token', 'session_id', 'csrf_token'
    ];

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    // Mask email addresses partially
    if (sanitized.email) {
      sanitized.email = Logger.maskEmail(sanitized.email);
    }

    // Truncate long strings
    Object.keys(sanitized).forEach(key => {
      if (typeof sanitized[key] === 'string' && sanitized[key].length > 1000) {
        sanitized[key] = sanitized[key].substring(0, 1000) + '...[TRUNCATED]';
      }
    });

    return sanitized;
  }

  /**
   * Mask email addresses for privacy
   */
  static maskEmail(email) {
    const [local, domain] = email.split('@');
    if (local.length <= 2) {
      return `${local[0]}***@${domain}`;
    }
    return `${local[0]}***${local[local.length - 1]}@${domain}`;
  }

  /**
   * Log audit events for security monitoring
   */
  static audit(event, userId, data = {}) {
    const auditEntry = {
      type: 'audit',
      event,
      userId: userId || 'anonymous',
      timestamp: new Date().toISOString(),
      data: Logger.sanitizeLogData(data)
    };

    Logger.info('Security audit event', auditEntry);
  }

  /**
   * Log performance metrics
   */
  static performance(operation, duration, data = {}) {
    Logger.info('Performance metric', {
      operation,
      duration_ms: duration,
      ...Logger.sanitizeLogData(data)
    });
  }
}
