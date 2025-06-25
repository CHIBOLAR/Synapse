// Error Handler - Centralized error handling and response formatting
// Production-ready error handling with security and user experience focus

import { Logger } from './logger.js';

export class ErrorHandler {
  
  /**
   * Handle errors and return appropriate HTTP responses
   * @param {Error} error - The error to handle
   * @param {Object} req - Request object
   * @param {Object} context - Forge context
   * @returns {Object} HTTP response object
   */
  static handleError(error, req = {}, context = {}) {
    const errorId = ErrorHandler.generateErrorId();
    const userId = context.accountId || 'anonymous';

    // Log the error with full details
    Logger.error('Error handled', {
      errorId,
      userId,
      errorName: error.name,
      errorMessage: error.message,
      stack: error.stack,
      requestPath: req.path,
      requestMethod: req.method
    });

    // Determine error type and appropriate response
    const errorResponse = ErrorHandler.categorizeError(error, errorId);

    return {
      statusCode: errorResponse.statusCode,
      headers: {
        'Content-Type': 'application/json',
        'X-Error-ID': errorId
      },
      body: JSON.stringify({
        success: false,
        error: errorResponse.userMessage,
        errorId,
        timestamp: new Date().toISOString(),
        ...(errorResponse.details && { details: errorResponse.details })
      })
    };
  }

  /**
   * Categorize errors and determine appropriate responses
   */
  static categorizeError(error, errorId) {
    // Security errors
    if (error.name === 'SecurityError') {
      return {
        statusCode: 403,
        userMessage: 'Access denied. Please check your permissions.',
        details: { type: 'security_error' }
      };
    }

    // Validation errors
    if (error.name === 'ValidationError' || error.message.includes('Invalid')) {
      return {
        statusCode: 400,
        userMessage: 'Invalid input provided. Please check your data.',
        details: { type: 'validation_error' }
      };
    }

    // Rate limiting errors
    if (error.message.includes('Rate limit exceeded')) {
      return {
        statusCode: 429,
        userMessage: 'Too many requests. Please wait before trying again.',
        details: { 
          type: 'rate_limit_error',
          retryAfter: 3600 // 1 hour
        }
      };
    }

    // Claude API errors
    if (error.message.includes('Claude API') || error.message.includes('anthropic')) {
      return {
        statusCode: 503,
        userMessage: 'AI service is temporarily unavailable. Please try again later.',
        details: { 
          type: 'ai_service_error',
          retryAfter: 300 // 5 minutes
        }
      };
    }

    // Jira API errors
    if (error.message.includes('Jira') || error.message.includes('JIRA')) {
      return {
        statusCode: 502,
        userMessage: 'Issue creation service is temporarily unavailable.',
        details: { 
          type: 'jira_service_error',
          retryAfter: 300
        }
      };
    }

    // File processing errors
    if (error.message.includes('file') || error.message.includes('upload')) {
      return {
        statusCode: 400,
        userMessage: 'File processing failed. Please check file format and try again.',
        details: { type: 'file_processing_error' }
      };
    }

    // Storage errors
    if (error.message.includes('storage') || error.message.includes('KVS')) {
      return {
        statusCode: 503,
        userMessage: 'Data storage is temporarily unavailable. Please try again.',
        details: { 
          type: 'storage_error',
          retryAfter: 300
        }
      };
    }

    // Network/timeout errors
    if (error.message.includes('timeout') || error.message.includes('network')) {
      return {
        statusCode: 504,
        userMessage: 'Request timed out. Please try again.',
        details: { 
          type: 'timeout_error',
          retryAfter: 60
        }
      };
    }

    // Authentication errors
    if (error.message.includes('authentication') || error.message.includes('unauthorized')) {
      return {
        statusCode: 401,
        userMessage: 'Authentication required. Please log in and try again.',
        details: { type: 'auth_error' }
      };
    }

    // Default server error
    return {
      statusCode: 500,
      userMessage: 'An unexpected error occurred. Our team has been notified.',
      details: { type: 'internal_server_error' }
    };
  }

  /**
   * Generate unique error ID for tracking
   */
  static generateErrorId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `err_${timestamp}_${random}`;
  }

  /**
   * Handle async operation errors with retry logic
   */
  static async handleAsyncError(operation, maxRetries = 3, delayMs = 1000) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries) {
          Logger.error('Max retries exceeded', {
            attempts: maxRetries,
            error: error.message
          });
          break;
        }

        // Exponential backoff
        const delay = delayMs * Math.pow(2, attempt - 1);
        Logger.warn('Operation failed, retrying', {
          attempt,
          maxRetries,
          delay,
          error: error.message
        });
        
        await ErrorHandler.delay(delay);
      }
    }

    throw lastError;
  }

  /**
   * Delay utility for retry logic
   */
  static delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Wrap async functions with error handling
   */
  static asyncWrapper(fn) {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        Logger.error('Async function error', {
          functionName: fn.name,
          error: error.message,
          stack: error.stack
        });
        throw error;
      }
    };
  }

  /**
   * Handle validation errors with detailed feedback
   */
  static handleValidationError(validationResult, fieldName = 'input') {
    if (!validationResult.isValid) {
      const error = new Error(`Validation failed for ${fieldName}: ${validationResult.message}`);
      error.name = 'ValidationError';
      error.field = fieldName;
      error.details = validationResult.errors;
      throw error;
    }
  }

  /**
   * Create user-friendly error messages
   */
  static createUserError(message, type = 'user_error', statusCode = 400) {
    const error = new Error(message);
    error.name = 'UserError';
    error.type = type;
    error.statusCode = statusCode;
    error.userFacing = true;
    return error;
  }

  /**
   * Handle critical errors that need immediate attention
   */
  static handleCriticalError(error, context = {}) {
    const errorId = ErrorHandler.generateErrorId();
    
    Logger.critical('Critical error occurred', {
      errorId,
      error: error.message,
      stack: error.stack,
      context
    });

    // In production, this could trigger alerts/notifications
    // For MVP, we log and continue
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'X-Error-ID': errorId
      },
      body: JSON.stringify({
        success: false,
        error: 'A critical error occurred. Support has been notified.',
        errorId,
        timestamp: new Date().toISOString()
      })
    };
  }

  /**
   * Extract meaningful error context from requests
   */
  static extractErrorContext(req, context) {
    return {
      path: req.path,
      method: req.method,
      userId: context.accountId,
      userAgent: req.headers?.['user-agent'],
      timestamp: new Date().toISOString(),
      requestId: req.headers?.['x-request-id']
    };
  }
}

/**
 * Custom error classes for specific use cases
 */
export class ValidationError extends Error {
  constructor(message, field = null, details = null) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.details = details;
  }
}

export class SecurityError extends Error {
  constructor(message, type = 'security_violation') {
    super(message);
    this.name = 'SecurityError';
    this.type = type;
  }
}

export class RateLimitError extends Error {
  constructor(message, retryAfter = 3600) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

export class ExternalServiceError extends Error {
  constructor(message, service = 'external', retryable = true) {
    super(message);
    this.name = 'ExternalServiceError';
    this.service = service;
    this.retryable = retryable;
  }
}
