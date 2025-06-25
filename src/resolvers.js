// Forge Resolver Handlers for Custom UI
// This file exports resolver functions for Custom UI bridge communication

import Resolver from '@forge/resolver';
import { AnalysisResolver } from './resolvers/analysisResolver.js';
import { AdminResolver } from './resolvers/adminResolver.js';
import { Logger } from './utils/logger.js';
import { ErrorHandler } from './utils/errorHandler.js';

// Initialize resolvers
const analysisResolver = new AnalysisResolver();
const adminResolver = new AdminResolver();

// Create Forge resolver instances
const mainResolver = new Resolver();
const adminResolverHandler = new Resolver();

// Main app resolver functions
mainResolver.define('startAnalysis', async ({ payload, context }) => {
  Logger.info('Custom UI: Start Analysis called', { payload, userId: context.accountId });
  return await analysisResolver.startAnalysis(payload, context);
});

mainResolver.define('getStatus', async ({ payload, context }) => {
  Logger.info('Custom UI: Get Status called', { payload, userId: context.accountId });
  return await analysisResolver.getStatus(payload, context);
});

mainResolver.define('getHistory', async ({ payload, context }) => {
  Logger.info('Custom UI: Get History called', { payload, userId: context.accountId });
  return await analysisResolver.getHistory(payload, context);
});

mainResolver.define('uploadFile', async ({ payload, context }) => {
  Logger.info('Custom UI: Upload File called', { payload, userId: context.accountId });
  return await analysisResolver.handleFileUpload(payload, context);
});

mainResolver.define('getUserContext', async ({ payload, context }) => {
  Logger.info('Custom UI: Get User Context called', { userId: context.accountId });
  return {
    accountId: context.accountId,
    cloudId: context.cloudId,
    userAgent: context.userAgent
  };
});

mainResolver.define('getUserConfig', async ({ payload, context }) => {
  Logger.info('Custom UI: Get User Config called', { userId: context.accountId });
  return await analysisResolver.getUserConfig(context);
});

mainResolver.define('checkAdminPermissions', async ({ payload, context }) => {
  Logger.info('Custom UI: Check Admin Permissions called', { userId: context.accountId });
  try {
    await adminResolver.verifyAdminAccess(context);
    return { isAdmin: true };
  } catch (error) {
    return { isAdmin: false, error: error.message };
  }
});

// Admin resolver functions
adminResolverHandler.define('verifyAdmin', async ({ payload, context }) => {
  Logger.info('Custom UI: Verify Admin called', { userId: context.accountId });
  try {
    await adminResolver.verifyAdminAccess(context);
    return { isAdmin: true };
  } catch (error) {
    return { isAdmin: false, error: error.message };
  }
});

adminResolverHandler.define('getSystemStatus', async ({ payload, context }) => {
  Logger.info('Custom UI: Get System Status called', { userId: context.accountId });
  return await adminResolver.getSystemStatus(payload, context);
});

adminResolverHandler.define('manageAPIKeys', async ({ payload, context }) => {
  Logger.info('Custom UI: Manage API Keys called', { payload, userId: context.accountId });
  return await adminResolver.manageAPIKeys(payload, context);
});

adminResolverHandler.define('getUsageMetrics', async ({ payload, context }) => {
  Logger.info('Custom UI: Get Usage Metrics called', { userId: context.accountId });
  return await adminResolver.getUsageMetrics(payload, context);
});

adminResolverHandler.define('getAuditLog', async ({ payload, context }) => {
  Logger.info('Custom UI: Get Audit Log called', { userId: context.accountId });
  return await adminResolver.getAuditLog(payload, context);
});

// Export the resolver handlers
export const mainHandler = mainResolver.getDefinitions();
export const adminHandler = adminResolverHandler.getDefinitions();
