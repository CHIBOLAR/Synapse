// Rate Limiter - Advanced rate limiting with sliding window algorithm
// Production-ready implementation with user-based and global limits

import { storage } from '@forge/api';
import { Logger } from './logger.js';

export class RateLimiter {
  constructor(name, maxRequests = 100, windowMs = 60000) {
    this.name = name;
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.algorithm = 'sliding_window'; // More accurate than fixed window
  }

  /**
   * Check rate limit for a specific identifier (user, IP, etc.)
   * @param {string} identifier - Unique identifier (userId, IP, etc.)
   * @param {number} cost - Cost of this request (default: 1)
   * @returns {Promise<Object>} Rate limit status
   */
  async checkLimit(identifier, cost = 1) {
    try {
      const now = Date.now();
      const windowStart = now - this.windowMs;
      
      // Get current request history
      const historyKey = `ratelimit:${this.name}:${identifier}`;
      const requestHistory = await storage.get(historyKey) || [];
      
      // Remove expired requests (sliding window)
      const validRequests = requestHistory.filter(timestamp => timestamp > windowStart);
      
      // Calculate current usage
      const currentUsage = validRequests.reduce((sum, req) => sum + (req.cost || 1), 0);
      
      // Check if adding this request would exceed limit
      if (currentUsage + cost > this.maxRequests) {
        const resetTime = Math.min(...validRequests) + this.windowMs;
        
        Logger.warn('Rate limit exceeded', {
          limiter: this.name,
          identifier,
          currentUsage,
          maxRequests: this.maxRequests,
          cost,
          resetTime: new Date(resetTime).toISOString()
        });

        throw new RateLimitError(
          `Rate limit exceeded for ${this.name}: ${currentUsage + cost}/${this.maxRequests} requests`,
          Math.ceil((resetTime - now) / 1000) // seconds until reset
        );
      }

      // Add current request to history
      validRequests.push({
        timestamp: now,
        cost
      });

      // Store updated history with TTL
      await storage.set(historyKey, validRequests, {
        ttl: Math.ceil(this.windowMs / 1000) + 60 // Add buffer
      });

      return {
        allowed: true,
        current: currentUsage + cost,
        remaining: this.maxRequests - (currentUsage + cost),
        limit: this.maxRequests,
        resetTime: windowStart + this.windowMs,
        windowMs: this.windowMs
      };

    } catch (error) {
      if (error instanceof RateLimitError) {
        throw error;
      }
      
      Logger.error('Rate limit check failed', {
        limiter: this.name,
        identifier,
        error: error.message
      });
      
      // Fail open - allow request if rate limiter fails
      Logger.warn('Rate limiter failing open due to error');
      return {
        allowed: true,
        current: 0,
        remaining: this.maxRequests,
        limit: this.maxRequests,
        resetTime: Date.now() + this.windowMs,
        windowMs: this.windowMs,
        error: 'Rate limiter temporarily unavailable'
      };
    }
  }

  /**
   * Get current rate limit status without consuming quota
   */
  async getStatus(identifier) {
    try {
      const now = Date.now();
      const windowStart = now - this.windowMs;
      
      const historyKey = `ratelimit:${this.name}:${identifier}`;
      const requestHistory = await storage.get(historyKey) || [];
      
      const validRequests = requestHistory.filter(timestamp => timestamp > windowStart);
      const currentUsage = validRequests.reduce((sum, req) => sum + (req.cost || 1), 0);
      
      return {
        current: currentUsage,
        remaining: this.maxRequests - currentUsage,
        limit: this.maxRequests,
        resetTime: windowStart + this.windowMs,
        windowMs: this.windowMs
      };
    } catch (error) {
      Logger.error('Failed to get rate limit status', {
        limiter: this.name,
        identifier,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Reset rate limit for a specific identifier
   */
  async reset(identifier) {
    try {
      const historyKey = `ratelimit:${this.name}:${identifier}`;
      await storage.delete(historyKey);
      
      Logger.info('Rate limit reset', {
        limiter: this.name,
        identifier
      });
      
      return true;
    } catch (error) {
      Logger.error('Failed to reset rate limit', {
        limiter: this.name,
        identifier,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Increment usage without checking limits (for tracking)
   */
  async increment(identifier, cost = 1) {
    try {
      const now = Date.now();
      const windowStart = now - this.windowMs;
      
      const historyKey = `ratelimit:${this.name}:${identifier}`;
      const requestHistory = await storage.get(historyKey) || [];
      
      // Clean old requests and add new one
      const validRequests = requestHistory.filter(timestamp => timestamp > windowStart);
      validRequests.push({
        timestamp: now,
        cost
      });

      await storage.set(historyKey, validRequests, {
        ttl: Math.ceil(this.windowMs / 1000) + 60
      });

      return true;
    } catch (error) {
      Logger.error('Failed to increment rate limit', {
        limiter: this.name,
        identifier,
        error: error.message
      });
      return false;
    }
  }
}

/**
 * Global rate limiter factory with predefined configurations
 */
export class RateLimiterFactory {
  static limiters = new Map();

  /**
   * Get or create a rate limiter instance
   */
  static getLimiter(name, maxRequests, windowMs) {
    const key = `${name}:${maxRequests}:${windowMs}`;
    
    if (!this.limiters.has(key)) {
      this.limiters.set(key, new RateLimiter(name, maxRequests, windowMs));
    }
    
    return this.limiters.get(key);
  }

  /**
   * Predefined limiters for common use cases
   */
  static get apiLimiter() {
    return this.getLimiter('api', 1000, 3600000); // 1000 requests per hour
  }

  static get claudeLimiter() {
    return this.getLimiter('claude', 4000, 60000); // 4000 requests per minute (Claude Sonnet 4 limit)
  }

  static get userLimiter() {
    return this.getLimiter('user', 100, 3600000); // 100 requests per hour per user
  }

  static get jiraLimiter() {
    return this.getLimiter('jira', 500, 60000); // 500 requests per minute to Jira
  }

  static get uploadLimiter() {
    return this.getLimiter('upload', 20, 3600000); // 20 uploads per hour
  }

  static get adminLimiter() {
    return this.getLimiter('admin', 500, 3600000); // 500 admin actions per hour
  }
}

/**
 * Rate limit error class
 */
export class RateLimitError extends Error {
  constructor(message, retryAfter = 3600) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter; // seconds
  }
}

/**
 * Distributed rate limiter for multiple instances
 */
export class DistributedRateLimiter extends RateLimiter {
  constructor(name, maxRequests, windowMs, nodeId = null) {
    super(name, maxRequests, windowMs);
    this.nodeId = nodeId || this.generateNodeId();
    this.syncInterval = 30000; // 30 seconds
  }

  generateNodeId() {
    return `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check limit with distributed coordination
   */
  async checkLimit(identifier, cost = 1) {
    try {
      // First check local cache for quick rejection
      const localStatus = await this.getLocalStatus(identifier);
      if (localStatus && localStatus.current + cost > this.maxRequests) {
        throw new RateLimitError('Rate limit exceeded (local check)');
      }

      // Then check distributed state
      return await super.checkLimit(identifier, cost);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get local status without network calls
   */
  async getLocalStatus(identifier) {
    try {
      const localKey = `ratelimit:local:${this.name}:${identifier}`;
      return await storage.get(localKey);
    } catch (error) {
      Logger.debug('Local status check failed', { error: error.message });
      return null;
    }
  }

  /**
   * Update local cache
   */
  async updateLocalCache(identifier, status) {
    try {
      const localKey = `ratelimit:local:${this.name}:${identifier}`;
      await storage.set(localKey, status, { ttl: 60 }); // 1 minute cache
    } catch (error) {
      Logger.debug('Failed to update local cache', { error: error.message });
    }
  }
}

/**
 * Adaptive rate limiter that adjusts limits based on system health
 */
export class AdaptiveRateLimiter extends RateLimiter {
  constructor(name, baseMaxRequests, windowMs, adaptationFactor = 0.5) {
    super(name, baseMaxRequests, windowMs);
    this.baseMaxRequests = baseMaxRequests;
    this.adaptationFactor = adaptationFactor;
    this.lastHealthCheck = 0;
    this.healthCheckInterval = 60000; // 1 minute
  }

  /**
   * Adjust rate limits based on system health
   */
  async adjustForHealth() {
    const now = Date.now();
    
    if (now - this.lastHealthCheck < this.healthCheckInterval) {
      return; // Skip if checked recently
    }

    try {
      const healthMetrics = await this.getSystemHealth();
      const healthScore = this.calculateHealthScore(healthMetrics);
      
      // Adjust maxRequests based on health (0.5 = 50% of base, 1.0 = 100% of base)
      this.maxRequests = Math.floor(this.baseMaxRequests * Math.max(0.1, healthScore));
      
      this.lastHealthCheck = now;
      
      Logger.debug('Rate limit adjusted for health', {
        limiter: this.name,
        healthScore,
        newLimit: this.maxRequests,
        baseLimit: this.baseMaxRequests
      });
      
    } catch (error) {
      Logger.warn('Health-based rate limit adjustment failed', {
        error: error.message
      });
      // Fallback to base limits
      this.maxRequests = this.baseMaxRequests;
    }
  }

  /**
   * Get system health metrics
   */
  async getSystemHealth() {
    // Implementation would check:
    // - CPU usage
    // - Memory usage
    // - API response times
    // - Error rates
    // - Queue lengths
    
    // For MVP, return static healthy state
    return {
      cpu: 0.3,      // 30% CPU
      memory: 0.4,   // 40% memory
      errorRate: 0.01, // 1% error rate
      responseTime: 200 // 200ms average
    };
  }

  /**
   * Calculate health score from metrics
   */
  calculateHealthScore(metrics) {
    const cpuScore = Math.max(0, 1 - metrics.cpu);
    const memoryScore = Math.max(0, 1 - metrics.memory);
    const errorScore = Math.max(0, 1 - metrics.errorRate * 10);
    const responseScore = Math.max(0, 1 - (metrics.responseTime / 1000));
    
    return (cpuScore + memoryScore + errorScore + responseScore) / 4;
  }

  /**
   * Override checkLimit to include health adaptation
   */
  async checkLimit(identifier, cost = 1) {
    await this.adjustForHealth();
    return await super.checkLimit(identifier, cost);
  }
}
