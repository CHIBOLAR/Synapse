// Main Forge function exports for Synapse - COMPLETELY FIXED
// Supports ALL frontend invoke() calls with proper database integration

import { AnalysisResolver } from './resolvers/analysisResolver.js';
import { AdminResolver } from './resolvers/adminResolver.js';
import { Logger } from './utils/logger.js';
import { ErrorHandler } from './utils/errorHandler.js';
import { storage } from '@forge/api'; // ADDED: Missing storage import

// Initialize resolvers
const analysisResolver = new AnalysisResolver();
const adminResolver = new AdminResolver();

// Main application handler (handles ALL frontend invoke calls)
export const mainHandler = async (req, context) => {
  try {
    Logger.info('Main handler invoked', {
      method: req.method,
      path: req.path,
      body: req.body ? 'present' : 'none',
      userId: context.accountId
    });

    // Parse the request to determine the method being called
    let methodName, payload;
    
    if (req.body) {
      try {
        const parsed = JSON.parse(req.body);
        // For Forge bridge calls, the method name might be in different places        methodName = parsed.methodName || parsed.action || req.path?.replace('/', '') || 'default';
        payload = parsed.payload || parsed.data || parsed;
      } catch (e) {
        methodName = req.path?.replace('/', '') || 'default';
        payload = {};
      }
    } else {
      methodName = req.path?.replace('/', '') || 'default';
      payload = req.queryParameters || {};
    }

    Logger.info('Processing method', { methodName, hasPayload: !!payload });

    // Route to the appropriate method - COVERS ALL FRONTEND CALLS
    switch (methodName) {
      
      // === CORE ANALYSIS METHODS ===
      case 'validateContent':
        return await handleMethodCall(() => analysisResolver.validateContent(payload, context));
      
      case 'startAnalysis':
        return await handleMethodCall(() => analysisResolver.startAnalysis(payload, context));
      
      case 'getAnalysisStatus':
        return await handleMethodCall(() => analysisResolver.getAnalysisStatus(payload, context));
      
      case 'getAnalysisResults':
        return await handleMethodCall(() => analysisResolver.getAnalysisResults(payload, context));
      
      // === TEXT INPUT METHODS ===
      case 'processDirectText':
        return await handleMethodCall(() => analysisResolver.processDirectText(payload, context));
      
      // === FILE UPLOAD METHODS ===
      case 'uploadFile':
      case 'handleFileUpload':
        return await handleMethodCall(() => analysisResolver.handleFileUpload(payload, context));      
      // === JIRA INTEGRATION ===
      case 'createJiraIssues':
        return await handleMethodCall(() => analysisResolver.createJiraIssues(payload, context));
      
      // === USER CONTEXT METHODS ===
      case 'getUserContext':
        return await handleMethodCall(() => getUserContext(context));
      
      case 'getUserConfig':
        return await handleMethodCall(() => getUserConfig(context));
      
      case 'checkAdminPermissions':
        return await handleMethodCall(() => checkAdminPermissions(context));
      
      // === ADMIN METHODS ===
      case 'getAdminSettings':
        return await handleMethodCall(() => adminResolver.getAdminSettings(payload, context));
      
      case 'getSystemMetrics':
        return await handleMethodCall(() => adminResolver.getSystemMetrics(payload, context));
      
      case 'getUserMetrics':
        return await handleMethodCall(() => adminResolver.getUserMetrics(payload, context));
      
      case 'saveAdminSettings':
        return await handleMethodCall(() => adminResolver.saveAdminSettings(payload, context));
      
      // === LEGACY HTTP ROUTES (backwards compatibility) ===
      case 'analyze':
        return await handleMethodCall(() => analysisResolver.startAnalysis(payload, context));
      
      case 'status':
        return await handleMethodCall(() => analysisResolver.getAnalysisStatus(payload, context));
      
      case 'upload':
        return await handleMethodCall(() => analysisResolver.handleFileUpload(payload, context));      
      case 'history':
        return await handleMethodCall(() => analysisResolver.getHistory(payload, context));
      
      // === DEFAULT RESPONSE ===
      case 'default':
      default:
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: 'Synapse AI Meeting Analyzer - Backend Ready',
            version: '2.0.0',
            status: 'operational',
            timestamp: new Date().toISOString(),
            supportedMethods: [
              'validateContent',      // ✅ Fixes security validation error
              'startAnalysis',        // ✅ Core analysis functionality  
              'processDirectText',    // ✅ Copy-paste functionality
              'getAnalysisStatus',    // ✅ Real-time status checking
              'getAnalysisResults',   // ✅ Results retrieval
              'uploadFile',           // ✅ File upload support
              'createJiraIssues',     // ✅ Jira integration
              'getUserContext',       // ✅ User context
              'getUserConfig',        // ✅ User configuration
              'checkAdminPermissions' // ✅ Admin access control
            ],
            features: [
              '🧠 Claude Sonnet 4 Integration',
              '📝 Direct Text Input (Copy-Paste)',
              '📁 File Upload Support (.txt, .docx)',
              '⚡ Real-time Processing',
              '🎯 Jira Integration',
              '🔒 Security Validation',
              '📊 Database Integration (Forge KVS)',
              '🚫 No Graceful Fallback (Robust Processing)'
            ]
          })
        };
    }
  } catch (error) {    Logger.error('Main handler error', { 
      error: error.message, 
      stack: error.stack,
      method: req.method,
      path: req.path,
      userId: context.accountId
    });
    return ErrorHandler.handleError(error, req, context);
  }
};

// Helper function to standardize method call responses
async function handleMethodCall(methodFunction) {
  try {
    const result = await methodFunction();
    
    // If result is already a proper HTTP response, return it
    if (result && result.statusCode) {
      return result;
    }
    
    // Otherwise, wrap it in a standard response
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result)
    };
  } catch (error) {
    Logger.error('Method call failed', { error: error.message, stack: error.stack });
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
}

// === USER CONTEXT HELPER FUNCTIONS ===

async function getUserContext(context) {
  try {    return {
      success: true,
      userContext: {
        accountId: context.accountId,
        cloudId: context.cloudId,
        principal: context.principal,
        timezone: context.timezone || 'UTC',
        locale: context.locale || 'en-US',
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    Logger.error('getUserContext error', { error: error.message });
    throw error;
  }
}

async function getUserConfig(context) {
  try {
    // Get user configuration from storage
    const userConfig = await storage.get(`user:${context.accountId}:config`) || {
      preferences: {
        defaultMeetingType: 'general',
        defaultIssueType: 'task',
        autoCreateJiraIssues: true,
        assignToSelf: false
      },
      settings: {
        notifications: true,
        emailUpdates: false,
        theme: 'light'
      },
      version: '2.0.0'
    };
    
    return {
      success: true,
      config: userConfig
    };
  } catch (error) {
    Logger.error('getUserConfig error', { error: error.message });
    throw error;
  }
}
async function checkAdminPermissions(context) {
  try {
    // Check if user has admin permissions
    const isAdmin = context.principal?.type === 'app' || 
                   context.accountId === process.env.ADMIN_USER_ID ||
                   false; // Add your admin logic here
    
    return {
      success: true,
      isAdmin,
      permissions: {
        canViewMetrics: isAdmin,
        canManageSettings: isAdmin,
        canViewAuditLog: isAdmin,
        canAccessAdminPanel: isAdmin
      },
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    Logger.error('checkAdminPermissions error', { error: error.message });
    throw error;
  }
}

// === OTHER HANDLERS (keeping for manifest.yml compatibility) ===

export const adminHandler = async (req, context) => {
  try {
    Logger.info('Admin handler invoked', {
      method: req.method,
      path: req.path,
      userId: context.accountId
    });

    // Verify admin permissions first
    const permCheck = await checkAdminPermissions(context);
    if (!permCheck.isAdmin) {
      return {
        statusCode: 403,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Admin access required' })
      };
    }

    // Delegate to main handler
    return await mainHandler(req, context);
  } catch (error) {
    Logger.error('Admin handler error', { error: error.message, stack: error.stack });
    return ErrorHandler.handleError(error, req, context);
  }
};
export const asyncHandler = async (req, context) => {
  try {
    Logger.info('Async handler invoked', {
      queueName: req.queueName,
      eventType: req.eventType
    });

    // Process queue events
    switch (req.queueName) {
      case 'analysis-processing-queue':
        return await analysisResolver.processAnalysisQueue(req, context);
      
      default:
        Logger.warn('Unknown queue event', { queueName: req.queueName });
        return { statusCode: 200, body: JSON.stringify({ processed: true }) };
    }
  } catch (error) {
    Logger.error('Async handler error', { error: error.message, stack: error.stack });
    return ErrorHandler.handleError(error, req, context);
  }
};

export const webhookHandler = async (req, context) => {
  try {
    Logger.info('Webhook handler invoked', {
      method: req.method,
      eventType: req.pathParameters?.eventType
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        received: true, 
        timestamp: new Date().toISOString(),
        version: '2.0.0'
      })
    };
  } catch (error) {
    Logger.error('Webhook handler error', { error: error.message, stack: error.stack });
    return ErrorHandler.handleError(error, req, context);
  }
};

export const metricsHandler = async (req, context) => {
  try {
    Logger.info('Metrics handler invoked');
    return await adminResolver.getUsageMetrics(req, context);
  } catch (error) {
    Logger.error('Metrics handler error', { error: error.message, stack: error.stack });
    return ErrorHandler.handleError(error, req, context);
  }
};
export const cleanupHandler = async (req, context) => {
  try {
    Logger.info('Cleanup handler invoked');
    
    const results = await Promise.allSettled([
      analysisResolver.cleanupOldAnalyses(),
      adminResolver.cleanupAuditLogs()
    ]);

    const summary = {
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      tasks: results.map((result, index) => ({
        task: ['analyses', 'audit'][index],
        status: result.status,
        result: result.status === 'fulfilled' ? result.value : result.reason
      }))
    };

    Logger.info('Cleanup completed', summary);
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(summary)
    };
  } catch (error) {
    Logger.error('Cleanup handler error', { error: error.message, stack: error.stack });
    return ErrorHandler.handleError(error, req, context);
  }
};

export const healthHandler = async (req, context) => {
  try {
    Logger.debug('Health check invoked');
    
    const healthStatus = await adminResolver.getHealthStatus();
    
    return {
      statusCode: healthStatus.healthy ? 200 : 503,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...healthStatus,
        version: '2.0.0',
        timestamp: new Date().toISOString()
      })
    };
  } catch (error) {
    Logger.error('Health handler error', { error: error.message, stack: error.stack });
    return {
      statusCode: 503,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        healthy: false,
        error: error.message,
        version: '2.0.0',
        timestamp: new Date().toISOString()
      })
    };
  }
};

// Export all handlers for manifest.yml
export default {
  mainHandler,
  adminHandler,
  asyncHandler,
  webhookHandler,
  metricsHandler,
  cleanupHandler,
  healthHandler
};