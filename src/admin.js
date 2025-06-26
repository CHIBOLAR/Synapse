/**
 * 🔧 SYNAPSE ADMIN HANDLER
 * 
 * Admin functionality for Synapse AI Meeting Analysis
 */

import Resolver from '@forge/resolver';
import { storage } from '@forge/api';

const resolver = new Resolver();

// Admin verification function
resolver.define('verifyAdmin', async (req) => {
  try {
    const { context } = req;
    console.log('Verifying admin access');
    
    // Basic admin verification
    const isAdmin = context?.accountType === 'licensed' || true; // Allow for development
    
    return {
      success: true,
      isAdmin,
      accountType: context?.accountType || 'unknown'
    };
  } catch (error) {
    console.error('Admin verification error:', error);
    return { 
      success: false, 
      isAdmin: false, 
      error: error.message 
    };
  }
});

// System status function
resolver.define('getSystemStatus', async (req) => {
  try {
    console.log('Getting system status');
    
    return {
      success: true,
      status: 'operational',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptime: process.uptime?.() || 0,
      memory: process.memoryUsage?.() || {}
    };
  } catch (error) {
    console.error('System status error:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
});

// Configuration update function
resolver.define('updateConfiguration', async (req) => {
  try {
    const { payload } = req;
    console.log('Updating configuration');
    
    const configKey = 'app_configuration';
    const currentConfig = await storage.get(configKey) || {};
    const updatedConfig = { 
      ...currentConfig, 
      ...payload,
      lastUpdated: new Date().toISOString()
    };
    
    await storage.set(configKey, updatedConfig);
    
    return {
      success: true,
      config: updatedConfig,
      message: 'Configuration updated successfully'
    };
  } catch (error) {
    console.error('Configuration update error:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
});

console.log('Synapse admin handler initialized successfully');

export const handler = resolver.getDefinitions();
