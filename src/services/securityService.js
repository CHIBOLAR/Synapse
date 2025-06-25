// Security Service - Production-ready security implementation
// XSS/CSRF protection, input validation, and audit logging

import { storage } from '@forge/api';
import crypto from 'crypto';
import DOMPurify from 'dompurify';
import validator from 'validator';
import { Logger } from '../utils/logger.js';

export class SecurityService {
  constructor() {
    // Security configuration
    this.config = {
      maxInputLength: {
        meetingNotes: 50000,
        email: 254,
        name: 100,
        jiraKey: 20,
        default: 1000
      },
      csrfTokenExpiry: 3600000, // 1 hour
      rateLimitWindow: 3600000,  // 1 hour
      encryptionAlgorithm: 'aes-256-gcm'
    };

    // Prompt injection patterns
    this.injectionPatterns = [
      /ignore\s+previous\s+instructions/i,
      /system\s*:\s*you\s+are/i,
      /\[INST\]/i,
      /\<\|.*?\|\>/i,
      /assistant\s*:\s*/i,
      /human\s*:\s*/i,
      /\{\{.*?\}\}/i, // Template injection
      /<%.*?%>/i      // Template injection
    ];
  }

  /**
   * Comprehensive input sanitization
   * @param {string} input - User input to sanitize
   * @param {string} type - Type of input for specific rules
   * @returns {string} Sanitized input
   */
  sanitizeInput(input, type = 'default') {
    if (!input || typeof input !== 'string') {
      throw new SecurityError('Invalid input type - string required');
    }

    try {
      switch (type) {
        case 'meetingNotes':
          return this.sanitizeMeetingNotes(input);
        
        case 'email':
          return this.sanitizeEmail(input);
        
        case 'jiraKey':
          return this.sanitizeJiraKey(input);
        
        case 'filename':
          return this.sanitizeFilename(input);
        
        case 'url':
          return this.sanitizeURL(input);
        
        default:
          return this.sanitizeDefault(input, type);
      }
    } catch (error) {
      Logger.error('Input sanitization failed', {
        type,
        inputLength: input.length,
        error: error.message
      });
      throw new SecurityError(`Input sanitization failed: ${error.message}`);
    }
  }

  /**
   * Sanitize meeting notes while preserving structure
   */
  sanitizeMeetingNotes(input) {
    // Check length
    if (input.length > this.config.maxInputLength.meetingNotes) {
      throw new SecurityError('Meeting notes exceed maximum length');
    }

    // Detect prompt injection attempts
    this.detectPromptInjection(input);

    // Sanitize HTML while preserving basic formatting
    const sanitized = DOMPurify.sanitize(input, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'h1', 'h2', 'h3'],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true,
      STRIP_COMMENTS: true
    });

    // Additional XSS protection
    return sanitized
      .replace(/javascript:/gi, 'script-removed:')
      .replace(/data:/gi, 'data-removed:')
      .replace(/vbscript:/gi, 'script-removed:')
      .trim();
  }

  /**
   * Sanitize and validate email addresses
   */
  sanitizeEmail(input) {
    const trimmed = input.trim().toLowerCase();
    
    if (!validator.isEmail(trimmed)) {
      throw new SecurityError('Invalid email format');
    }

    if (trimmed.length > this.config.maxInputLength.email) {
      throw new SecurityError('Email exceeds maximum length');
    }

    return validator.normalizeEmail(trimmed) || trimmed;
  }

  /**
   * Sanitize and validate Jira issue keys
   */
  sanitizeJiraKey(input) {
    const trimmed = input.trim().toUpperCase();
    const jiraKeyPattern = /^[A-Z][A-Z0-9]*-\d+$/;
    
    if (!jiraKeyPattern.test(trimmed)) {
      throw new SecurityError('Invalid Jira issue key format');
    }

    if (trimmed.length > this.config.maxInputLength.jiraKey) {
      throw new SecurityError('Jira key exceeds maximum length');
    }

    return trimmed;
  }

  /**
   * Sanitize filenames for security
   */
  sanitizeFilename(input) {
    const sanitized = input
      .trim()
      .replace(/[<>:"/\\|?*]/g, '') // Remove dangerous characters
      .replace(/\.\./g, '')         // Remove path traversal
      .replace(/^\./, '')           // Remove leading dot
      .substring(0, 255);           // Limit length

    if (!sanitized) {
      throw new SecurityError('Invalid filename after sanitization');
    }

    return sanitized;
  }

  /**
   * Sanitize and validate URLs
   */
  sanitizeURL(input) {
    const trimmed = input.trim();
    
    // Only allow HTTPS URLs
    if (!validator.isURL(trimmed, { 
      protocols: ['https'], 
      require_protocol: true 
    })) {
      throw new SecurityError('Invalid or insecure URL');
    }

    return trimmed;
  }

  /**
   * Default sanitization for general text
   */
  sanitizeDefault(input, type) {
    const maxLength = this.config.maxInputLength[type] || this.config.maxInputLength.default;
    
    if (input.length > maxLength) {
      throw new SecurityError(`Input exceeds maximum length for type: ${type}`);
    }

    return validator.escape(input).trim();
  }

  /**
   * Detect prompt injection attempts
   */
  detectPromptInjection(input) {
    for (const pattern of this.injectionPatterns) {
      if (pattern.test(input)) {
        Logger.warn('Prompt injection detected', {
          pattern: pattern.source,
          inputPreview: input.substring(0, 100)
        });
        throw new SecurityError('Potential prompt injection detected');
      }
    }
  }

  /**
   * Generate CSRF token for form protection
   */
  generateCSRFToken(userId, sessionId) {
    try {
      const timestamp = Date.now();
      const payload = `${userId}:${sessionId}:${timestamp}`;
      const secret = process.env.CSRF_SECRET || 'fallback-secret-change-in-production';
      
      const signature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
      
      return `${timestamp}:${signature}`;
    } catch (error) {
      Logger.error('CSRF token generation failed', { error: error.message });
      throw new SecurityError('Failed to generate CSRF token');
    }
  }

  /**
   * Validate CSRF token
   */
  validateCSRFToken(token, userId, sessionId, maxAge = this.config.csrfTokenExpiry) {
    try {
      if (!token || typeof token !== 'string') {
        throw new SecurityError('Invalid CSRF token format');
      }

      const [timestamp, signature] = token.split(':');
      
      if (!timestamp || !signature) {
        throw new SecurityError('Malformed CSRF token');
      }

      const tokenAge = Date.now() - parseInt(timestamp);
      
      if (tokenAge > maxAge) {
        throw new SecurityError('CSRF token expired');
      }

      const expectedPayload = `${userId}:${sessionId}:${timestamp}`;
      const secret = process.env.CSRF_SECRET || 'fallback-secret-change-in-production';
      
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(expectedPayload)
        .digest('hex');

      if (signature !== expectedSignature) {
        throw new SecurityError('Invalid CSRF token signature');
      }

      return true;
    } catch (error) {
      Logger.warn('CSRF validation failed', { 
        error: error.message,
        userId,
        sessionId 
      });
      throw new SecurityError('CSRF token validation failed');
    }
  }

  /**
   * User-based rate limiting
   */
  async checkRateLimit(userId, action, limit = 100, windowMs = this.config.rateLimitWindow) {
    try {
      const windowStart = Math.floor(Date.now() / windowMs) * windowMs;
      const key = `ratelimit:${userId}:${action}:${windowStart}`;
      
      const current = await storage.get(key) || 0;
      
      if (current >= limit) {
        await this.logSecurityEvent({
          type: 'rate_limit_exceeded',
          userId,
          action,
          current,
          limit,
          severity: 'medium'
        });
        
        throw new SecurityError(`Rate limit exceeded for ${action}: ${current}/${limit} requests per hour`);
      }

      await storage.set(key, current + 1, {
        ttl: Math.ceil(windowMs / 1000)
      });

      return {
        current: current + 1,
        limit,
        remaining: limit - current - 1,
        resetTime: windowStart + windowMs
      };
    } catch (error) {
      if (error instanceof SecurityError) {
        throw error;
      }
      Logger.error('Rate limit check failed', { error: error.message });
      throw new SecurityError('Rate limit check failed');
    }
  }

  /**
   * Encrypt sensitive data
   */
  encryptData(data, key = null) {
    try {
      const algorithm = this.config.encryptionAlgorithm;
      const secretKey = key || process.env.ENCRYPTION_KEY || crypto.randomBytes(32);
      const iv = crypto.randomBytes(16);
      
      const cipher = crypto.createCipher(algorithm, secretKey);
      cipher.setAutoPadding(true);
      
      let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      return {
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        algorithm
      };
    } catch (error) {
      Logger.error('Data encryption failed', { error: error.message });
      throw new SecurityError('Failed to encrypt data');
    }
  }

  /**
   * Decrypt sensitive data
   */
  decryptData(encryptedData, key = null) {
    try {
      const { encrypted, iv, authTag, algorithm } = encryptedData;
      const secretKey = key || process.env.ENCRYPTION_KEY;
      
      const decipher = crypto.createDecipher(algorithm, secretKey);
      decipher.setAuthTag(Buffer.from(authTag, 'hex'));
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (error) {
      Logger.error('Data decryption failed', { error: error.message });
      throw new SecurityError('Failed to decrypt data');
    }
  }

  /**
   * Log security events for audit trail
   */
  async logSecurityEvent(event) {
    try {
      const auditEntry = {
        eventId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        type: 'security',
        severity: event.severity || 'medium',
        userId: event.userId || 'anonymous',
        action: event.action || 'unknown',
        details: event.details || {},
        userAgent: event.userAgent,
        ipAddress: event.ipAddress,
        success: event.success !== false
      };

      const auditKey = `audit:${new Date().toISOString().split('T')[0]}:${auditEntry.eventId}`;
      
      await storage.set(auditKey, auditEntry, {
        ttl: 365 * 24 * 60 * 60 // 1 year retention
      });

      // Alert on critical events
      if (event.severity === 'critical') {
        await this.sendSecurityAlert(auditEntry);
      }

      Logger.info('Security event logged', {
        eventId: auditEntry.eventId,
        type: auditEntry.action,
        severity: auditEntry.severity
      });

    } catch (error) {
      Logger.error('Failed to log security event', { error: error.message });
      // Don't throw - logging failures shouldn't break the app
    }
  }

  /**
   * Send security alerts for critical events
   */
  async sendSecurityAlert(auditEntry) {
    // For MVP: Log critical alerts
    // TODO: Implement email/Slack notifications in post-MVP
    Logger.error('CRITICAL SECURITY ALERT', {
      eventId: auditEntry.eventId,
      type: auditEntry.action,
      userId: auditEntry.userId,
      details: auditEntry.details
    });

    // Store alert for admin dashboard
    await storage.set(`security:alert:${auditEntry.eventId}`, auditEntry, {
      ttl: 30 * 24 * 60 * 60 // 30 days
    });
  }

  /**
   * Validate user authorization
   */
  validateUserContext(context, requiredAction = 'read') {
    if (!context || !context.accountId) {
      throw new SecurityError('User not authenticated');
    }

    // Check admin requirements
    if (requiredAction === 'admin') {
      const isAdmin = context.principal?.type === 'admin' || 
                     context.extension?.permissions?.includes('ADMINISTER') ||
                     this.isAdminUser(context.accountId);
      
      if (!isAdmin) {
        this.logSecurityEvent({
          type: 'unauthorized_admin_access',
          userId: context.accountId,
          severity: 'high',
          success: false
        });
        throw new SecurityError('Administrator access required');
      }
    }

    return true;
  }

  /**
   * Check if user has admin privileges
   */
  async isAdminUser(userId) {
    try {
      const adminUsers = await storage.get('admin:users') || [];
      return adminUsers.includes(userId);
    } catch (error) {
      Logger.warn('Failed to check admin status', { error: error.message });
      return false;
    }
  }
}

/**
 * Custom security error class
 */
export class SecurityError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SecurityError';
  }
}
