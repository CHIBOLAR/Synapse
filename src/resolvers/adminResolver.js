/**
 * 🔧 SIMPLIFIED ADMIN RESOLVER
 * 
 * Essential admin functions with minimal logging
 */

import api, { route } from '@forge/api';
import { storage } from '@forge/api';
import { logInfo, logError } from '../utils/logger.js';

// Simple admin verification
export const verifyAdmin = async (req) => {
  try {
    logInfo('ADMIN', 'Checking admin permissions');
    
    const response = await api.asUser().requestJira(
      route`/rest/api/3/mypermissions?permissions=ADMINISTER`
    );
    
    if (!response.ok) {
      throw new Error(`Permissions API returned ${response.status}`);
    }
    
    const permissions = await response.json();
    const isAdmin = permissions.permissions?.ADMINISTER?.havePermission || false;
    
    return {
      success: true,
      isAdmin: isAdmin,
      message: isAdmin ? 'Admin access confirmed' : 'Admin access required'
    };
  } catch (error) {
    logError('ADMIN', 'Admin verification failed', error.message);
    return {
      success: false,
      isAdmin: false,
      error: error.message
    };
  }
};

// System status check
export const getSystemStatus = async (req) => {
  try {
    logInfo('ADMIN', 'Getting system status');
    
    // Basic system checks
    const status = {
      timestamp: new Date().toISOString(),
      version: '8.0.0',
      storage: 'connected',
      api: 'connected',
      health: 'good'
    };
    
    // Test storage
    try {
      await storage.get('health-check');
      status.storage = 'connected';
    } catch (error) {
      status.storage = 'error';
      status.health = 'degraded';
    }
    
    // Test API
    try {
      const testResponse = await api.asUser().requestJira(route`/rest/api/3/myself`);
      status.api = testResponse.ok ? 'connected' : 'error';
      if (!testResponse.ok) status.health = 'degraded';
    } catch (error) {
      status.api = 'error';
      status.health = 'degraded';
    }
    
    return {
      success: true,
      status: status
    };
  } catch (error) {
    logError('ADMIN', 'System status failed', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

// Configuration management
export const updateConfiguration = async (req) => {
  try {
    logInfo('ADMIN', 'Updating configuration');
    
    const { config } = req.payload || {};
    if (!config) {
      throw new Error('No configuration provided');
    }
    
    // Save configuration
    await storage.set('synapse:admin:config', {
      ...config,
      updatedAt: new Date().toISOString(),
      version: '8.0.0'
    });
    
    return {
      success: true,
      message: 'Configuration updated successfully'
    };
  } catch (error) {
    logError('ADMIN', 'Configuration update failed', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

// User statistics
export const getUserStats = async (req) => {
  try {
    logInfo('ADMIN', 'Getting user statistics');
    
    // Basic user stats
    const stats = {
      totalAnalyses: await storage.get('stats:total_analyses') || 0,
      activeUsers: await storage.get('stats:active_users') || 0,
      lastActivity: await storage.get('stats:last_activity') || null,
      timestamp: new Date().toISOString()
    };
    
    return {
      success: true,
      stats: stats
    };
  } catch (error) {
    logError('ADMIN', 'User stats failed', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

// Export as class for compatibility
export class AdminResolver {
  verifyAdmin = verifyAdmin;
  getSystemStatus = getSystemStatus;
  updateConfiguration = updateConfiguration;
  getUserStats = getUserStats;
}

// Default export
export default {
  verifyAdmin,
  getSystemStatus,
  updateConfiguration,
  getUserStats
};
