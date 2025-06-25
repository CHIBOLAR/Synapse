// Enhanced AnalysisResolver - ALL MISSING METHODS ADDED
// Fixes: validateContent, startAnalysis, getAnalysisStatus, etc.
// Adds: Direct copy-paste support, proper database integration

import { ClaudeSonnet4Service } from '../services/claudeSonnet4Service.js';
import { SecurityService } from '../services/securityService.js';
import { QueueManager } from '../services/queueManager.js';
import { JiraService } from '../services/jiraService.js';
import { Logger } from '../utils/logger.js';
import { ErrorHandler } from '../utils/errorHandler.js';
import { storage } from '@forge/api';

export class AnalysisResolver {
  constructor() {
    this.claudeService = new ClaudeSonnet4Service();
    this.securityService = new SecurityService();
    this.queueManager = new QueueManager();
    this.jiraService = new JiraService();
  }

  // === MISSING METHOD 1: validateContent (FIXES SECURITY ERROR) ===
  async validateContent(payload, context) {
    try {
      this.securityService.validateUserContext(context);
      
      const { content } = payload;
      
      if (!content || typeof content !== 'string') {
        return {
          success: false,
          isValid: false,
          error: 'Invalid content type'
        };
      }

      // Basic validation
      if (content.length < 10) {
        return {
          success: false,
          isValid: false,
          error: 'Content too short'
        };
      }
      if (content.length > 100000) {
        return {
          success: false,
          isValid: false,
          error: 'Content too large (max 100KB)'
        };
      }

      // Security validation
      const sanitizedContent = this.securityService.sanitizeInput(content, 'meetingNotes');
      
      Logger.info('Content validation passed', {
        userId: context.accountId,
        contentLength: content.length
      });

      return {
        success: true,
        isValid: true,
        sanitizedContent,
        metadata: {
          originalLength: content.length,
          sanitizedLength: sanitizedContent.length,
          wordCount: sanitizedContent.split(/\s+/).length
        }
      };

    } catch (error) {
      Logger.error('Content validation error', { 
        error: error.message, 
        userId: context.accountId 
      });
      
      return {
        success: false,
        isValid: false,
        error: 'Validation failed'
      };
    }
  }

  // === MISSING METHOD 2: startAnalysis (PROPER DATABASE INTEGRATION) ===
  async startAnalysis(payload, context) {
    try {
      this.securityService.validateUserContext(context);
      await this.securityService.checkRateLimit(context.accountId, 'analysis', 10, 3600000);
      const { notes, meetingType = 'general', issueType = 'task', options = {} } = payload;
      
      if (!notes) {
        throw new Error('Missing required field: notes');
      }

      // Validate content first
      const validation = await this.validateContent({ content: notes }, context);
      if (!validation.isValid) {
        throw new Error(`Content validation failed: ${validation.error}`);
      }

      // Create analysis record with proper database structure
      const analysisId = this.generateAnalysisId();
      const analysisRecord = {
        id: analysisId,
        userId: context.accountId,
        siteId: context.cloudId,
        createdAt: new Date().toISOString(),
        status: 'queued',
        progress: 0,
        meetingType,
        issueType,
        notesLength: validation.sanitizedContent.length,
        wordCount: validation.metadata.wordCount,
        options: {
          createJiraIssues: options.createJiraIssues !== false,
          assignToCurrentUser: options.assignToCurrentUser || false,
          projectKey: options.projectKey || null
        },
        metadata: {
          source: 'manual',
          version: '2.0.0'
        }
      };

      // Store in database (Forge KVS)
      await storage.set(`analysis:${analysisId}`, analysisRecord);
      
      // Also store in user's analysis list for history
      const userAnalyses = await storage.get(`user:${context.accountId}:analyses`) || [];
      userAnalyses.unshift(analysisId);
      if (userAnalyses.length > 50) userAnalyses.splice(50); // Keep last 50
      await storage.set(`user:${context.accountId}:analyses`, userAnalyses);
      // Start async processing
      await this.startAsyncAnalysis(analysisId, validation.sanitizedContent, meetingType, issueType, analysisRecord.options);

      Logger.info('Analysis started', {
        analysisId,
        userId: context.accountId,
        meetingType,
        issueType,
        wordCount: validation.metadata.wordCount
      });

      return {
        success: true,
        analysisId,
        status: 'queued',
        estimatedCompletion: new Date(Date.now() + 10000).toISOString(),
        message: 'Analysis started successfully'
      };

    } catch (error) {
      Logger.error('Analysis start failed', {
        error: error.message,
        userId: context.accountId,
        stack: error.stack
      });
      throw error;
    }
  }

  // === MISSING METHOD 3: getAnalysisStatus ===
  async getAnalysisStatus(payload, context) {
    try {
      const { analysisId } = payload;
      
      if (!analysisId) {
        throw new Error('Analysis ID required');
      }

      // Get from database
      const analysis = await storage.get(`analysis:${analysisId}`);
      
      if (!analysis) {
        return {
          success: false,
          error: 'Analysis not found'
        };
      }
      // Check if user owns this analysis
      if (analysis.userId !== context.accountId) {
        throw new Error('Unauthorized access to analysis');
      }

      return {
        success: true,
        status: analysis.status,
        progress: analysis.progress || 0,
        createdAt: analysis.createdAt,
        lastUpdate: analysis.lastUpdate || analysis.createdAt,
        error: analysis.error || null,
        estimatedCompletion: analysis.estimatedCompletion || null
      };

    } catch (error) {
      Logger.error('Get analysis status failed', {
        error: error.message,
        analysisId: payload.analysisId,
        userId: context.accountId
      });
      throw error;
    }
  }

  // === MISSING METHOD 4: getAnalysisResults ===
  async getAnalysisResults(payload, context) {
    try {
      const { analysisId } = payload;
      
      if (!analysisId) {
        throw new Error('Analysis ID required');
      }

      // Get from database
      const analysis = await storage.get(`analysis:${analysisId}`);
      
      if (!analysis) {
        return {
          success: false,
          error: 'Analysis not found'
        };
      }

      // Check if user owns this analysis
      if (analysis.userId !== context.accountId) {
        throw new Error('Unauthorized access to analysis');
      }
      if (analysis.status !== 'completed') {
        return {
          success: false,
          error: 'Analysis not completed yet',
          status: analysis.status,
          progress: analysis.progress || 0
        };
      }

      return {
        success: true,
        analysisId,
        results: analysis.results || [],
        issues: analysis.extractedIssues || [],
        summary: analysis.summary || '',
        confidence: analysis.confidence || 0,
        processingTime: analysis.processingTimeMs || 0,
        createdAt: analysis.createdAt,
        completedAt: analysis.completedAt
      };

    } catch (error) {
      Logger.error('Get analysis results failed', {
        error: error.message,
        analysisId: payload.analysisId,
        userId: context.accountId
      });
      throw error;
    }
  }

  // === MISSING METHOD 5: processDirectText (COPY-PASTE FUNCTIONALITY) ===
  async processDirectText(payload, context) {
    try {
      this.securityService.validateUserContext(context);
      
      const { textContent, meetingType = 'general', issueType = 'task', options = {} } = payload;
      
      if (!textContent || textContent.trim().length < 10) {
        throw new Error('Text content too short. Minimum 10 characters required.');
      }

      // Use the startAnalysis method with the text content
      return await this.startAnalysis({
        notes: textContent,
        meetingType,
        issueType,
        options: {
          ...options,
          source: 'direct_input'
        }
      }, context);
    } catch (error) {
      Logger.error('Direct text processing failed', { 
        error: error.message, 
        userId: context.accountId 
      });
      throw error;
    }
  }

  // === MISSING METHOD 6: createJiraIssues ===
  async createJiraIssues(payload, context) {
    try {
      const { issues, projectKey, assignee } = payload;
      
      if (!issues || !Array.isArray(issues) || issues.length === 0) {
        throw new Error('No issues provided for creation');
      }

      const results = {
        success: [],
        failed: [],
        total: issues.length
      };

      for (const issue of issues) {
        try {
          const jiraIssue = await this.jiraService.createIssue({
            projectKey: projectKey || 'SYNAPSE',
            summary: issue.title || issue.summary,
            description: issue.description,
            issueType: issue.type || 'Task',
            assignee: assignee,
            labels: ['synapse-ai', 'meeting-analysis']
          });

          results.success.push({
            originalIssue: issue,
            jiraKey: jiraIssue.key,
            jiraId: jiraIssue.id
          });

        } catch (createError) {
          results.failed.push({
            originalIssue: issue,
            error: createError.message
          });
        }
      }

      Logger.info('Jira issues creation completed', {
        total: results.total,
        successful: results.success.length,
        failed: results.failed.length,
        userId: context.accountId
      });
      return {
        success: true,
        results,
        summary: `Created ${results.success.length}/${results.total} issues successfully`
      };

    } catch (error) {
      Logger.error('Jira issues creation failed', {
        error: error.message,
        userId: context.accountId
      });
      throw error;
    }
  }

  // === ASYNC PROCESSING METHOD ===
  async startAsyncAnalysis(analysisId, notes, meetingType, issueType, options) {
    try {
      // Update status to processing
      await this.updateAnalysisStatus(analysisId, 'processing', 25);

      // Call Claude Sonnet 4 for analysis
      const analysisResult = await this.claudeService.analyzeNotes({
        notes,
        meetingType,
        issueType,
        analysisId
      });

      // Update progress
      await this.updateAnalysisStatus(analysisId, 'processing', 75);

      // Store results in database
      const analysis = await storage.get(`analysis:${analysisId}`);
      analysis.status = 'completed';
      analysis.progress = 100;
      analysis.completedAt = new Date().toISOString();
      analysis.results = analysisResult.analysis || {};
      analysis.extractedIssues = analysisResult.issues || [];
      analysis.summary = analysisResult.summary || '';
      analysis.confidence = analysisResult.confidence || 0;
      analysis.processingTimeMs = Date.now() - new Date(analysis.createdAt);

      await storage.set(`analysis:${analysisId}`, analysis);

      Logger.info('Analysis processing completed', {
        analysisId,
        issuesFound: analysis.extractedIssues.length,
        processingTime: analysis.processingTimeMs
      });
    } catch (error) {
      Logger.error('Async analysis failed', {
        error: error.message,
        analysisId,
        stack: error.stack
      });

      // Update status to error
      await this.updateAnalysisStatus(analysisId, 'error', 0, error.message);
    }
  }

  // === HELPER METHODS ===
  async updateAnalysisStatus(analysisId, status, progress, error = null) {
    try {
      const record = await storage.get(`analysis:${analysisId}`);
      if (record) {
        record.status = status;
        record.progress = progress;
        record.lastUpdate = new Date().toISOString();
        if (error) record.error = error;
        
        await storage.set(`analysis:${analysisId}`, record);
      }
    } catch (updateError) {
      Logger.error('Failed to update analysis status', {
        analysisId,
        error: updateError.message
      });
    }
  }

  generateAnalysisId() {
    return `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // === ENHANCED EXISTING METHOD ===  async handleFileUpload(payload, context) {
    try {
      this.securityService.validateUserContext(context);
      
      const { fileContent, fileName, fileType, meetingType = 'general', issueType = 'task' } = payload;
      
      if (!fileContent) {
        throw new Error('No file content provided');
      }
      
      // Validate file type
      const allowedTypes = [
        'text/plain',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      
      if (fileType && !allowedTypes.includes(fileType)) {
        throw new Error('Unsupported file type. Please upload .txt or .docx files.');
      }
      
      // Validate content
      const validation = await this.validateContent({ content: fileContent }, context);
      if (!validation.isValid) {
        throw new Error(`Content validation failed: ${validation.error}`);
      }
      
      // Start analysis with the file content
      const analysisResult = await this.startAnalysis({
        notes: validation.sanitizedContent,
        meetingType,
        issueType,
        options: {
          source: 'file_upload',
          fileName
        }
      }, context);

      Logger.info('File upload successful', { 
        userId: context.accountId, 
        fileName,
        contentLength: validation.sanitizedContent.length
      });
      
      return {
        success: true,
        fileName,
        contentLength: validation.sanitizedContent.length,
        analysisResult
      };
      
    } catch (error) {
      Logger.error('File upload failed', { 
        error: error.message, 
        userId: context.accountId,
        fileName: payload.fileName 
      });
      throw error;
    }
  }
  // === ADDITIONAL HELPER METHODS ===
  
  /**
   * Estimate completion time based on queue length
   */
  estimateCompletionTime() {
    // Simple estimation - in production, this would check actual queue length
    const baseTime = 30; // 30 seconds base processing time
    const estimatedSeconds = baseTime + Math.random() * 60; // Add up to 60 seconds for queue
    
    return new Date(Date.now() + estimatedSeconds * 1000).toISOString();
  }

  /**
   * Sanitize analysis record for history display
   */
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
      hasErrors: (record.errors && record.errors.length > 0) || false
    };
  }

  /**
   * Get analysis history for user
   */
  async getHistory(payload, context) {
    try {
      this.securityService.validateUserContext(context);
      
      const userAnalyses = await storage.get(`user:${context.accountId}:analyses`) || [];
      const historyRecords = [];
      
      for (const analysisId of userAnalyses.slice(0, 20)) { // Last 20 analyses
        const record = await storage.get(`analysis:${analysisId}`);
        if (record) {
          historyRecords.push(this.sanitizeAnalysisForHistory(record));
        }
      }
      
      return {
        success: true,
        history: historyRecords,
        total: userAnalyses.length
      };
      
    } catch (error) {
      Logger.error('Get history failed', { error: error.message, userId: context.accountId });
      throw error;
    }
  }

  /**
   * Cleanup old analyses (for maintenance)
   */
  async cleanupOldAnalyses() {
    try {
      // This would be implemented to clean up old analysis records
      // For now, just return a success message
      return { cleaned: 0, message: 'Cleanup not implemented yet' };
    } catch (error) {
      Logger.error('Cleanup failed', { error: error.message });
      throw error;
    }
  }
}

/**
 * Custom error for security violations
 */
class SecurityError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SecurityError';
  }
}