// Analysis Resolver - OPTIMIZED VERSION
// High-performance meeting analysis with parallel processing and intelligent batching

import { ClaudeSonnet4ServiceOptimized } from '../services/claudeSonnet4ServiceOptimized.js';
import { SecurityService } from '../services/securityService.js';
import { QueueManagerOptimized } from '../services/queueManagerOptimized.js';
import { JiraService } from '../services/jiraService.js';
import { Logger } from '../utils/logger.js';
import { ErrorHandler } from '../utils/errorHandler.js';
import { storage } from '@forge/api';

export class AnalysisResolverOptimized {
  constructor() {
    this.claudeService = new ClaudeSonnet4ServiceOptimized();
    this.securityService = new SecurityService();
    this.queueManager = new QueueManagerOptimized();
    this.jiraService = new JiraService();
    
    // OPTIMIZATION: Performance tracking
    this.performanceMetrics = {
      totalRequests: 0,
      averageResponseTime: 0,
      cacheHitRate: 0,
      batchProcessingRate: 0
    };
    
    this.initializeOptimizations();
  }

  /**
   * Initialize performance optimizations
   */
  async initializeOptimizations() {
    try {
      // Pre-warm services
      await Promise.all([
        this.claudeService.initializeOptimizations(),
        this.queueManager.initializeOptimizations()
      ]);
      
      Logger.info('Analysis resolver optimizations initialized');
    } catch (error) {
      Logger.error('Failed to initialize analysis resolver optimizations', { 
        error: error.message 
      });
    }
  }

  /**
   * OPTIMIZED: Start analysis with intelligent processing
   */
  async startOptimizedAnalysis(req, context) {
    const startTime = Date.now();
    
    try {
      // OPTIMIZATION: Parallel security validation and request parsing
      const [validationResult, requestData] = await Promise.all([
        this.validateRequestSecurity(context),
        this.parseAndValidateRequest(req)
      ]);

      const { notes, meetingType, issueType, options = {} } = requestData;

      // OPTIMIZATION: Check for immediate processing vs queuing
      const shouldProcessImmediately = await this.shouldProcessImmediately(
        notes, meetingType, issueType, context.accountId
      );

      if (shouldProcessImmediately) {
        // OPTIMIZATION: Process immediately for fast response
        return await this.processImmediateAnalysis(
          notes, meetingType, issueType, options, context, startTime
        );
      } else {
        // OPTIMIZATION: Queue for batch processing
        return await this.queueOptimizedAnalysis(
          notes, meetingType, issueType, options, context, startTime
        );
      }

    } catch (error) {
      Logger.error('Optimized analysis start failed', {
        error: error.message,
        userId: context.accountId,
        processingTime: Date.now() - startTime
      });
      return ErrorHandler.handleError(error, req, context);
    }
  }

  /**
   * Validate request security in parallel
   */
  async validateRequestSecurity(context) {
    await Promise.all([
      Promise.resolve(this.securityService.validateUserContext(context)),
      this.securityService.checkRateLimit(context.accountId, 'analysis', 20, 3600000) // Increased limit for optimized version
    ]);
    
    return true;
  }

  /**
   * Parse and validate request data
   */
  async parseAndValidateRequest(req) {
    const data = JSON.parse(req.body || '{}');
    const { notes, meetingType, issueType, options = {} } = data;
    
    if (!notes || !meetingType || !issueType) {
      throw new Error('Missing required fields: notes, meetingType, issueType');
    }

    // OPTIMIZATION: Parallel sanitization
    const [sanitizedNotes, sanitizedMeetingType, sanitizedIssueType] = await Promise.all([
      Promise.resolve(this.securityService.sanitizeInput(notes, 'meetingNotes')),
      Promise.resolve(this.securityService.sanitizeInput(meetingType, 'default')),
      Promise.resolve(this.securityService.sanitizeInput(issueType, 'default'))
    ]);

    return {
      notes: sanitizedNotes,
      meetingType: sanitizedMeetingType,
      issueType: sanitizedIssueType,
      options
    };
  }

  /**
   * OPTIMIZATION: Determine if analysis should be processed immediately
   */
  async shouldProcessImmediately(notes, meetingType, issueType, userId) {
    // Criteria for immediate processing:
    // 1. Small content (< 2000 characters)
    // 2. Simple meeting types
    // 3. Low current queue load
    // 4. Premium user tier
    
    const isSmallContent = notes.length < 2000;
    const isSimpleMeeting = ['dailyStandup', 'bugTriage'].includes(meetingType);
    
    // Check current queue load
    const queueStats = await this.queueManager.getOptimizedQueueStats();
    const isLowQueueLoad = queueStats?.performance?.pendingAnalyses < 5;
    
    // Check user tier (future enhancement)
    const userTier = await this.getUserTier(userId);
    const isPremiumUser = ['premium', 'enterprise'].includes(userTier);
    
    return (isSmallContent && isSimpleMeeting) || 
           (isLowQueueLoad && isPremiumUser) ||
           (isSmallContent && isLowQueueLoad);
  }

  /**
   * OPTIMIZATION: Process analysis immediately for fast response
   */
  async processImmediateAnalysis(notes, meetingType, issueType, options, context, startTime) {
    try {
      const analysisId = this.generateAnalysisId();
      
      // Create analysis record
      const analysisRecord = this.createAnalysisRecord(
        analysisId, context, notes, meetingType, issueType, options
      );
      
      // OPTIMIZATION: Parallel storage and analysis
      const [storageResult, analysisResult] = await Promise.all([
        storage.set(`analysis:${analysisId}`, analysisRecord),
        this.claudeService.analyzeMeeting({
          notes,
          meetingType,
          issueType,
          userId: context.accountId
        })
      ]);

      if (!analysisResult.success) {
        throw new Error('Claude analysis failed');
      }

      // OPTIMIZATION: Parallel Jira creation if requested
      let jiraResults = [];
      if (options.createJiraIssues && analysisResult.issues.length > 0) {
        jiraResults = await this.createJiraIssuesOptimized(
          analysisResult.issues,
          options,
          context.accountId
        );
      }

      // Complete analysis
      const finalResult = {
        ...analysisResult,
        jiraIssues: jiraResults,
        completedAt: new Date().toISOString(),
        processingTime: Date.now() - startTime,
        processedImmediately: true
      };

      // Update record
      await this.updateAnalysisWithResults(analysisId, finalResult);
      await this.addToUserHistory(context.accountId, analysisId);

      // Update performance metrics
      this.updatePerformanceMetrics('immediate', finalResult.processingTime, analysisResult.cached);

      Logger.info('Immediate analysis completed', {
        analysisId,
        userId: context.accountId,
        processingTime: finalResult.processingTime,
        cached: analysisResult.cached,
        issuesExtracted: analysisResult.issues.length,
        jiraIssuesCreated: jiraResults.filter(r => r.success).length
      });

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          analysisId,
          status: 'completed',
          result: finalResult,
          processingTime: finalResult.processingTime,
          processedImmediately: true,
          cached: analysisResult.cached
        })
      };

    } catch (error) {
      Logger.error('Immediate analysis processing failed', {
        error: error.message,
        processingTime: Date.now() - startTime
      });
      throw error;
    }
  }

  /**
   * OPTIMIZATION: Queue analysis for batch processing
   */
  async queueOptimizedAnalysis(notes, meetingType, issueType, options, context, startTime) {
    try {
      const analysisId = this.generateAnalysisId();
      
      // Create analysis record
      const analysisRecord = this.createAnalysisRecord(
        analysisId, context, notes, meetingType, issueType, options
      );

      // OPTIMIZATION: Parallel storage and queuing
      const [storageResult, queueEntryId] = await Promise.all([
        storage.set(`analysis:${analysisId}`, analysisRecord),
        this.queueManager.queueAnalysisOptimized({
          analysisId,
          userId: context.accountId,
          notes,
          meetingType,
          issueType,
          options: analysisRecord.options
        })
      ]);

      const processingTime = Date.now() - startTime;
      
      // Update performance metrics
      this.updatePerformanceMetrics('queued', processingTime, false);

      Logger.info('Analysis queued for optimized processing', {
        analysisId,
        userId: context.accountId,
        queueEntryId,
        processingTime
      });

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          analysisId,
          queueEntryId,
          status: 'queued',
          estimatedCompletion: this.estimateOptimizedCompletionTime(),
          processingTime,
          queuedForBatch: true,
          message: 'Analysis queued for optimized batch processing'
        })
      };

    } catch (error) {
      Logger.error('Optimized queuing failed', {
        error: error.message,
        processingTime: Date.now() - startTime
      });
      throw error;
    }
  }

  /**
   * Create analysis record
   */
  createAnalysisRecord(analysisId, context, notes, meetingType, issueType, options) {
    return {
      id: analysisId,
      userId: context.accountId,
      siteId: context.cloudId,
      createdAt: new Date().toISOString(),
      status: 'queued',
      progress: 0,
      meetingType,
      issueType,
      notesLength: notes.length,
      options: {
        createJiraIssues: options.createJiraIssues !== false,
        assignToCurrentUser: options.assignToCurrentUser || false,
        projectKey: options.projectKey || null
      },
      optimized: true
    };
  }

  /**
   * OPTIMIZED: Get status with enhanced performance info
   */
  async getOptimizedStatus(req, context) {
    try {
      this.securityService.validateUserContext(context);

      const analysisId = req.query?.analysisId || req.pathParameters?.analysisId;
      
      if (!analysisId) {
        throw new Error('Analysis ID required');
      }

      // OPTIMIZATION: Parallel data fetching
      const [analysisRecord, queueStats, performanceStats] = await Promise.all([
        storage.get(`analysis:${analysisId}`),
        this.queueManager.getOptimizedQueueStats(),
        this.claudeService.getPerformanceStats()
      ]);
      
      if (!analysisRecord) {
        return {
          statusCode: 404,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: false,
            error: 'Analysis not found'
          })
        };
      }

      // Verify ownership
      if (analysisRecord.userId !== context.accountId) {
        throw new SecurityError('Access denied to analysis record');
      }

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          analysis: {
            id: analysisRecord.id,
            status: analysisRecord.status,
            progress: analysisRecord.progress,
            createdAt: analysisRecord.createdAt,
            completedAt: analysisRecord.completedAt,
            meetingType: analysisRecord.meetingType,
            issueType: analysisRecord.issueType,
            issuesCreated: analysisRecord.issuesCreated || 0,
            errors: analysisRecord.errors || [],
            result: analysisRecord.result || null,
            optimized: true,
            processingTime: analysisRecord.result?.processingTime
          },
          performance: {
            queueStats: queueStats?.performance,
            claudeStats: performanceStats
          }
        })
      };

    } catch (error) {
      Logger.error('Optimized status check failed', {
        error: error.message,
        userId: context.accountId
      });
      return ErrorHandler.handleError(error, req, context);
    }
  }

  /**
   * OPTIMIZED: Create Jira issues with parallel processing
   */
  async createJiraIssuesOptimized(issues, options, userId) {
    try {
      // Filter high-confidence issues
      const validIssues = issues.filter(issue => issue.confidence_score >= 0.7);

      if (validIssues.length === 0) {
        return [];
      }

      // OPTIMIZATION: Process in parallel batches
      const batchSize = 3; // Process 3 issues at a time
      const results = [];

      for (let i = 0; i < validIssues.length; i += batchSize) {
        const batch = validIssues.slice(i, i + batchSize);
        
        const batchResults = await Promise.allSettled(
          batch.map(issue => 
            this.jiraService.createIssue({
              summary: issue.summary,
              description: issue.description,
              issueType: issue.issueType,
              priority: issue.priority,
              assignee: options.assignToCurrentUser ? userId : issue.assignee,
              labels: issue.labels || [],
              projectKey: options.projectKey
            })
          )
        );

        // Process batch results
        batchResults.forEach((result, idx) => {
          if (result.status === 'fulfilled') {
            results.push({
              original: batch[idx],
              jiraIssue: result.value,
              success: true
            });
          } else {
            results.push({
              original: batch[idx],
              success: false,
              error: result.reason?.message || 'Unknown error'
            });
          }
        });

        // Small delay between batches
        if (i + batchSize < validIssues.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      return results;

    } catch (error) {
      Logger.error('Optimized Jira issue creation failed', { error: error.message });
      return [];
    }
  }

  /**
   * Update performance metrics
   */
  updatePerformanceMetrics(type, processingTime, cached) {
    this.performanceMetrics.totalRequests++;
    
    // Update average response time
    const currentAvg = this.performanceMetrics.averageResponseTime;
    const newAvg = ((currentAvg * (this.performanceMetrics.totalRequests - 1)) + processingTime) / 
                   this.performanceMetrics.totalRequests;
    this.performanceMetrics.averageResponseTime = newAvg;
    
    // Update cache hit rate
    if (cached) {
      const cacheHits = this.performanceMetrics.cacheHitRate * (this.performanceMetrics.totalRequests - 1) + 1;
      this.performanceMetrics.cacheHitRate = cacheHits / this.performanceMetrics.totalRequests;
    } else {
      const cacheHits = this.performanceMetrics.cacheHitRate * (this.performanceMetrics.totalRequests - 1);
      this.performanceMetrics.cacheHitRate = cacheHits / this.performanceMetrics.totalRequests;
    }
    
    // Update batch processing rate
    if (type === 'queued') {
      const batchProcessed = this.performanceMetrics.batchProcessingRate * (this.performanceMetrics.totalRequests - 1) + 1;
      this.performanceMetrics.batchProcessingRate = batchProcessed / this.performanceMetrics.totalRequests;
    } else {
      const batchProcessed = this.performanceMetrics.batchProcessingRate * (this.performanceMetrics.totalRequests - 1);
      this.performanceMetrics.batchProcessingRate = batchProcessed / this.performanceMetrics.totalRequests;
    }
  }

  /**
   * Get user tier (future enhancement)
   */
  async getUserTier(userId) {
    // In MVP, all users are 'standard'
    // Future: implement actual tier checking
    return 'standard';
  }

  /**
   * Estimate optimized completion time
   */
  estimateOptimizedCompletionTime() {
    // Optimized estimation based on current queue load and performance
    const baseTime = 15; // 15 seconds base (improved from 30)
    const queueMultiplier = Math.min(2, this.performanceMetrics.totalRequests / 10); // Max 2x for queue
    const estimatedSeconds = baseTime * queueMultiplier;
    
    return new Date(Date.now() + estimatedSeconds * 1000).toISOString();
  }

  // Inherited methods with optimization markers
  async getHistory(req, context) {
    // Enhanced version of original getHistory method
    // (Implementation would be similar to original but with performance optimizations)
    return this.getOptimizedHistory(req, context);
  }

  async getOptimizedHistory(req, context) {
    // Implementation similar to original but with performance enhancements
    // This would include parallel data fetching and enhanced filtering
    // For brevity, using original implementation with optimization markers
    try {
      this.securityService.validateUserContext(context);

      const { limit = 50, offset = 0, filter = {} } = req.query || {};
      const userId = context.accountId;

      const historyKey = `user:${userId}:analyses`;
      const analysisIds = await storage.get(historyKey) || [];

      const paginatedIds = analysisIds
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(offset, offset + parseInt(limit));

      // OPTIMIZATION: Parallel data fetching
      const analyses = await Promise.all(
        paginatedIds.map(async (id) => {
          const record = await storage.get(`analysis:${id}`);
          return record ? this.sanitizeAnalysisForHistory(record) : null;
        })
      );

      const validAnalyses = analyses.filter(Boolean);

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          analyses: validAnalyses,
          total: analysisIds.length,
          offset: parseInt(offset),
          limit: parseInt(limit),
          hasMore: offset + limit < analysisIds.length,
          optimized: true,
          performance: this.performanceMetrics
        })
      };

    } catch (error) {
      Logger.error('Optimized history retrieval failed', {
        error: error.message,
        userId: context.accountId
      });
      return ErrorHandler.handleError(error, req, context);
    }
  }

  // Utility methods (inherited with optimization markers)
  generateAnalysisId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `analysis_opt_${timestamp}_${random}`;
  }

  async updateAnalysisWithResults(analysisId, result) {
    // Enhanced version with performance tracking
    try {
      const analysisRecord = await storage.get(`analysis:${analysisId}`);
      
      if (analysisRecord) {
        analysisRecord.status = 'completed';
        analysisRecord.progress = 100;
        analysisRecord.result = result;
        analysisRecord.completedAt = new Date().toISOString();
        analysisRecord.issuesCreated = result.jiraIssues?.filter(r => r.success).length || 0;
        analysisRecord.optimized = true;

        await storage.set(`analysis:${analysisId}`, analysisRecord);
      }
    } catch (error) {
      Logger.error('Failed to update analysis with optimized results', {
        analysisId,
        error: error.message
      });
    }
  }

  async addToUserHistory(userId, analysisId) {
    // Optimized version with better performance
    try {
      const historyKey = `user:${userId}:analyses`;
      const history = await storage.get(historyKey) || [];
      
      history.unshift(analysisId);
      const trimmedHistory = history.slice(0, 100);
      
      await storage.set(historyKey, trimmedHistory);
    } catch (error) {
      Logger.error('Failed to update optimized user history', {
        userId,
        analysisId,
        error: error.message
      });
    }
  }

  sanitizeAnalysisForHistory(record) {
    return {
      id: record.id,
      status: record.status,
      progress: record.progress,
      createdAt: record.createdAt,
      completedAt: record.completedAt,
      meetingType: record.meetingType,
      issueType: record.issueType,
      issuesCreated: record.issuesCreated || 0,
      notesLength: record.notesLength,
      hasErrors: (record.errors && record.errors.length > 0) || false,
      optimized: record.optimized || false,
      processingTime: record.result?.processingTime
    };
  }

  /**
   * Get performance insights
   */
  async getPerformanceInsights() {
    try {
      const [queueStats, claudeStats] = await Promise.all([
        this.queueManager.getOptimizedQueueStats(),
        this.claudeService.getPerformanceStats()
      ]);

      return {
        resolver: this.performanceMetrics,
        queue: queueStats,
        claude: claudeStats,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      Logger.error('Failed to get performance insights', { error: error.message });
      return null;
    }
  }
}

/**
 * Custom error for security violations (inherited)
 */
class SecurityError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SecurityError';
  }
}
