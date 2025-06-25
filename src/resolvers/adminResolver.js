// Admin Resolver - Administration panel functionality
// API key management, system monitoring, and audit logging

import { SecurityService } from '../services/securityService.js';
import { Logger } from '../utils/logger.js';
import { ErrorHandler } from '../utils/errorHandler.js';
import { storage } from '@forge/api';
import crypto from 'crypto';

export class AdminResolver {
  constructor() {
    this.securityService = new SecurityService();
  }

  /**
   * Verify admin access before any admin operations
   * @param {Object} context - Forge context
   * @throws {SecurityError} If user is not admin
   */
  async verifyAdminAccess(context) {
    this.securityService.validateUserContext(context, 'admin');
    
    // Log admin access attempt
    await this.securityService.logSecurityEvent({
      type: 'admin_access',
      userId: context.accountId,
      success: true,
      severity: 'medium'
    });
  }

  /**
   * Manage API keys (create, list, delete, rotate)
   * @param {Object} req - Request object
   * @param {Object} context - Forge context
   * @returns {Promise<Object>} API key management response
   */
  async manageAPIKeys(req, context) {
    try {
      await this.verifyAdminAccess(context);
      
      const { action, keyName, apiKey } = JSON.parse(req.body || '{}');

      switch (action) {
        case 'list':
          return await this.listAPIKeys();
        
        case 'create':
          return await this.createAPIKey(keyName, apiKey, context.accountId);
        
        case 'delete':
          return await this.deleteAPIKey(keyName, context.accountId);
        
        case 'rotate':
          return await this.rotateAPIKey(keyName, apiKey, context.accountId);
        
        case 'test':
          return await this.testAPIKey(keyName);
        
        default:
          throw new Error('Invalid action specified');
      }

    } catch (error) {
      Logger.error('API key management failed', {
        error: error.message,
        action: req.body?.action,
        userId: context.accountId
      });
      return ErrorHandler.handleError(error, req, context);
    }
  }

  /**
   * List API keys (without revealing actual keys)
   */
  async listAPIKeys() {
    try {
      const activeKeys = await storage.get('claude:api_keys:active') || [];
      const keyList = [];

      for (const keyId of activeKeys) {
        const keyMeta = await storage.get(`claude:api_key:meta:${keyId}`);
        if (keyMeta) {
          keyList.push({
            id: keyId,
            name: keyMeta.name,
            isActive: keyMeta.isActive,
            createdAt: keyMeta.createdAt,
            lastUsed: keyMeta.lastUsed,
            usageCount: keyMeta.usageCount || 0,
            rateLimit: keyMeta.rateLimit || 4000
          });
        }
      }

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          apiKeys: keyList,
          total: keyList.length
        })
      };

    } catch (error) {
      throw new Error(`Failed to list API keys: ${error.message}`);
    }
  }

  /**
   * Create new API key
   */
  async createAPIKey(name, apiKey, createdBy) {
    try {
      if (!name || !apiKey) {
        throw new Error('API key name and key are required');
      }

      // Validate API key format
      if (!apiKey.startsWith('sk-ant-')) {
        throw new Error('Invalid Claude API key format');
      }

      const keyId = crypto.randomUUID();
      
      // Test the API key before storing
      const isValid = await this.testClaudeAPIKey(apiKey);
      if (!isValid) {
        throw new Error('API key validation failed - key may be invalid or expired');
      }

      // Store API key securely using Forge secrets
      await storage.secret.set(`claude:api_key:${keyId}`, apiKey);
      
      // Store metadata separately
      const keyMeta = {
        id: keyId,
        name: name,
        isActive: true,
        createdAt: new Date().toISOString(),
        createdBy: createdBy,
        usageCount: 0,
        rateLimit: 4000, // Claude Sonnet 4 limit
        lastUsed: null
      };

      await storage.set(`claude:api_key:meta:${keyId}`, keyMeta);

      // Update active keys list
      const activeKeys = await storage.get('claude:api_keys:active') || [];
      activeKeys.push(keyId);
      await storage.set('claude:api_keys:active', activeKeys);

      Logger.info('API key created', {
        keyId,
        name,
        createdBy
      });

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          message: 'API key created successfully',
          keyId,
          name
        })
      };

    } catch (error) {
      throw new Error(`Failed to create API key: ${error.message}`);
    }
  }

  /**
   * Delete API key
   */
  async deleteAPIKey(keyId, deletedBy) {
    try {
      if (!keyId) {
        throw new Error('Key ID is required');
      }

      // Remove from active keys
      const activeKeys = await storage.get('claude:api_keys:active') || [];
      const updatedKeys = activeKeys.filter(id => id !== keyId);
      await storage.set('claude:api_keys:active', updatedKeys);

      // Mark as deleted (don't actually delete for audit trail)
      const keyMeta = await storage.get(`claude:api_key:meta:${keyId}`);
      if (keyMeta) {
        keyMeta.isActive = false;
        keyMeta.deletedAt = new Date().toISOString();
        keyMeta.deletedBy = deletedBy;
        await storage.set(`claude:api_key:meta:${keyId}`, keyMeta);
      }

      Logger.info('API key deleted', {
        keyId,
        deletedBy
      });

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          message: 'API key deleted successfully'
        })
      };

    } catch (error) {
      throw new Error(`Failed to delete API key: ${error.message}`);
    }
  }

  /**
   * Rotate API key (replace with new key)
   */
  async rotateAPIKey(keyId, newApiKey, rotatedBy) {
    try {
      if (!keyId || !newApiKey) {
        throw new Error('Key ID and new API key are required');
      }

      // Test new API key
      const isValid = await this.testClaudeAPIKey(newApiKey);
      if (!isValid) {
        throw new Error('New API key validation failed');
      }

      // Update the secret
      await storage.secret.set(`claude:api_key:${keyId}`, newApiKey);

      // Update metadata
      const keyMeta = await storage.get(`claude:api_key:meta:${keyId}`);
      if (keyMeta) {
        keyMeta.rotatedAt = new Date().toISOString();
        keyMeta.rotatedBy = rotatedBy;
        keyMeta.usageCount = 0; // Reset usage count
        await storage.set(`claude:api_key:meta:${keyId}`, keyMeta);
      }

      Logger.info('API key rotated', {
        keyId,
        rotatedBy
      });

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          message: 'API key rotated successfully'
        })
      };

    } catch (error) {
      throw new Error(`Failed to rotate API key: ${error.message}`);
    }
  }

  /**
   * Test API key validity
   */
  async testAPIKey(keyId) {
    try {
      const apiKey = await storage.secret.get(`claude:api_key:${keyId}`);
      if (!apiKey) {
        throw new Error('API key not found');
      }

      const isValid = await this.testClaudeAPIKey(apiKey);

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          valid: isValid,
          message: isValid ? 'API key is valid' : 'API key is invalid or expired'
        })
      };

    } catch (error) {
      throw new Error(`Failed to test API key: ${error.message}`);
    }
  }

  /**
   * Test Claude API key by making a minimal request
   */
  async testClaudeAPIKey(apiKey) {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Test' }]
        })
      });

      return response.ok || response.status === 400; // 400 is also valid (means auth worked)
    } catch (error) {
      Logger.warn('API key test failed', { error: error.message });
      return false;
    }
  }

  /**
   * Get system status and health metrics
   * @param {Object} req - Request object
   * @param {Object} context - Forge context
   * @returns {Promise<Object>} System status response
   */
  async getSystemStatus(req, context) {
    try {
      await this.verifyAdminAccess(context);

      const status = await this.getHealthStatus();

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          status
        })
      };

    } catch (error) {
      Logger.error('System status check failed', {
        error: error.message,
        userId: context.accountId
      });
      return ErrorHandler.handleError(error, req, context);
    }
  }

  /**
   * Get comprehensive health status
   */
  async getHealthStatus() {
    try {
      const health = {
        timestamp: new Date().toISOString(),
        healthy: true,
        services: {},
        metrics: {}
      };

      // Check Claude API connectivity
      try {
        const activeKeys = await storage.get('claude:api_keys:active') || [];
        health.services.claude = {
          status: activeKeys.length > 0 ? 'available' : 'no_keys',
          activeKeys: activeKeys.length,
          healthy: activeKeys.length > 0
        };
      } catch (error) {
        health.services.claude = {
          status: 'error',
          error: error.message,
          healthy: false
        };
        health.healthy = false;
      }

      // Check storage connectivity
      try {
        const testKey = `health_check_${Date.now()}`;
        await storage.set(testKey, { test: true }, { ttl: 60 });
        await storage.delete(testKey);
        
        health.services.storage = {
          status: 'available',
          healthy: true
        };
      } catch (error) {
        health.services.storage = {
          status: 'error',
          error: error.message,
          healthy: false
        };
        health.healthy = false;
      }

      // Get basic metrics
      try {
        const today = new Date().toISOString().split('T')[0];
        const dailyUsage = await storage.get(`usage:daily:${today}`) || {};
        
        health.metrics = {
          dailyRequests: dailyUsage.requests || 0,
          dailyTokens: (dailyUsage.inputTokens || 0) + (dailyUsage.outputTokens || 0),
          dailyCost: dailyUsage.cost || 0
        };
      } catch (error) {
        Logger.warn('Failed to get metrics for health check', { error: error.message });
        health.metrics = { error: 'Metrics unavailable' };
      }

      return health;

    } catch (error) {
      Logger.error('Health status check failed', { error: error.message });
      return {
        timestamp: new Date().toISOString(),
        healthy: false,
        error: error.message
      };
    }
  }

  /**
   * Get audit log entries
   * @param {Object} req - Request object
   * @param {Object} context - Forge context
   * @returns {Promise<Object>} Audit log response
   */
  async getAuditLog(req, context) {
    try {
      await this.verifyAdminAccess(context);

      const { limit = 100, offset = 0, severity = null, startDate = null, endDate = null } = req.query || {};

      // Get audit entries (simplified - in production, you'd need better querying)
      const auditEntries = await this.queryAuditEntries({
        limit: parseInt(limit),
        offset: parseInt(offset),
        severity,
        startDate,
        endDate
      });

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          auditEntries,
          total: auditEntries.length, // In production, get actual count
          offset: parseInt(offset),
          limit: parseInt(limit)
        })
      };

    } catch (error) {
      Logger.error('Audit log retrieval failed', {
        error: error.message,
        userId: context.accountId
      });
      return ErrorHandler.handleError(error, req, context);
    }
  }

  /**
   * Query audit entries with filters
   */
  async queryAuditEntries({ limit, offset, severity, startDate, endDate }) {
    try {
      // This is a simplified implementation
      // In production, you'd need a more sophisticated querying mechanism
      
      const entries = [];
      const today = new Date();
      const searchDays = 30; // Search last 30 days

      for (let i = 0; i < searchDays; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        try {
          // Get all audit entries for this date
          const dayEntries = await this.getAuditEntriesForDate(dateStr);
          entries.push(...dayEntries);
        } catch (error) {
          // Skip days with no entries
          continue;
        }
      }

      // Apply filters
      let filteredEntries = entries;

      if (severity) {
        filteredEntries = filteredEntries.filter(entry => entry.severity === severity);
      }

      if (startDate) {
        filteredEntries = filteredEntries.filter(entry => entry.timestamp >= startDate);
      }

      if (endDate) {
        filteredEntries = filteredEntries.filter(entry => entry.timestamp <= endDate);
      }

      // Sort by timestamp (newest first)
      filteredEntries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      // Apply pagination
      return filteredEntries.slice(offset, offset + limit);

    } catch (error) {
      Logger.error('Audit query failed', { error: error.message });
      return [];
    }
  }

  /**
   * Get audit entries for a specific date
   */
  async getAuditEntriesForDate(dateStr) {
    // In a production system, you'd use a more efficient storage pattern
    // This is a simplified implementation for the MVP
    try {
      const entries = await storage.get(`audit:${dateStr}`) || [];
      return entries;
    } catch (error) {
      return [];
    }
  }

  /**
   * Clean up old audit logs (called by cleanup job)
   */
  async cleanupAuditLogs() {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 365); // Keep 1 year

      // This is a simplified cleanup - in production, implement proper cleanup
      Logger.info('Audit log cleanup completed', {
        cutoffDate: cutoffDate.toISOString(),
        message: 'Cleanup logic would be implemented here'
      });

      return { cleaned: 0, message: 'Audit cleanup functionality ready' };
    } catch (error) {
      Logger.error('Audit cleanup failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Add admin user
   */
  async addAdminUser(userId, addedBy) {
    try {
      const adminUsers = await storage.get('admin:users') || [];
      
      if (!adminUsers.includes(userId)) {
        adminUsers.push(userId);
        await storage.set('admin:users', adminUsers);

        await this.securityService.logSecurityEvent({
          type: 'admin_user_added',
          userId: addedBy,
          details: { newAdminUserId: userId },
          severity: 'high'
        });

        Logger.info('Admin user added', { userId, addedBy });
      }

      return true;
    } catch (error) {
      Logger.error('Failed to add admin user', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * Remove admin user
   */
  async removeAdminUser(userId, removedBy) {
    try {
      const adminUsers = await storage.get('admin:users') || [];
      const updatedUsers = adminUsers.filter(id => id !== userId);
      
      if (updatedUsers.length < adminUsers.length) {
        await storage.set('admin:users', updatedUsers);

        await this.securityService.logSecurityEvent({
          type: 'admin_user_removed',
          userId: removedBy,
          details: { removedAdminUserId: userId },
          severity: 'high'
        });

        Logger.info('Admin user removed', { userId, removedBy });
      }

      return true;
    } catch (error) {
      Logger.error('Failed to remove admin user', { userId, error: error.message });
      throw error;
    }
  }
}
