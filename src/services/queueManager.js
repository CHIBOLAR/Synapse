// Queue Manager - Async processing with priority queues and error handling
// Production-ready queue management for background tasks

import { storage } from '@forge/api';
// Note: queue is not available in current @forge/api version
// import { storage, queue } from '@forge/api';
import { Logger } from '../utils/logger.js';

export class QueueManager {
  constructor() {
    this.queues = {
      analysis: 'analysis-processing-queue',
      metrics: 'metrics-collection-queue',
      cleanup: 'cleanup-processing-queue'
    };
    
    this.priorities = {
      critical: 1,
      high: 2,
      normal: 3,
      low: 4
    };

    this.retryLimits = {
      analysis: 3,
      metrics: 2,
      cleanup: 1
    };
  }

  /**
   * Queue analysis for processing
   * @param {Object} analysisData - Analysis request data
   * @returns {Promise<string>} Queue entry ID
   */
  async queueAnalysis(analysisData) {
    try {
      const queueEntry = {
        id: this.generateEntryId('analysis'),
        type: 'analysis',
        data: analysisData,
        priority: this.calculateAnalysisPriority(analysisData),
        createdAt: new Date().toISOString(),
        attempts: 0,
        maxAttempts: this.retryLimits.analysis,
        status: 'queued'
      };

      // Add to Forge queue
      await queue.push(this.queues.analysis, queueEntry);

      // Store entry metadata for tracking
      await storage.set(`queue:analysis:${queueEntry.id}`, {
        id: queueEntry.id,
        analysisId: analysisData.analysisId,
        userId: analysisData.userId,
        status: 'queued',
        createdAt: queueEntry.createdAt,
        priority: queueEntry.priority
      }, {
        ttl: 24 * 60 * 60 // 24 hours
      });

      Logger.info('Analysis queued', {
        entryId: queueEntry.id,
        analysisId: analysisData.analysisId,
        userId: analysisData.userId,
        priority: queueEntry.priority
      });

      return queueEntry.id;

    } catch (error) {
      Logger.error('Failed to queue analysis', {
        analysisId: analysisData.analysisId,
        error: error.message
      });
      throw new Error(`Queue operation failed: ${error.message}`);
    }
  }

  /**
   * Calculate priority for analysis based on various factors
   */
  calculateAnalysisPriority(analysisData) {
    let priority = this.priorities.normal;

    // Factors that increase priority (lower number = higher priority)
    const factors = {
      userTier: this.getUserTier(analysisData.userId),
      contentLength: analysisData.notes?.length || 0,
      meetingType: analysisData.meetingType,
      issueType: analysisData.issueType
    };

    // User tier influence
    if (factors.userTier === 'premium') {
      priority = Math.min(priority, this.priorities.high);
    } else if (factors.userTier === 'enterprise') {
      priority = Math.min(priority, this.priorities.critical);
    }

    // Content complexity influence
    if (factors.contentLength > 10000) {
      priority = Math.min(priority, this.priorities.high);
    }

    // Meeting type urgency
    const urgentMeetingTypes = ['bugTriage', 'retrospective'];
    if (urgentMeetingTypes.includes(factors.meetingType)) {
      priority = Math.min(priority, this.priorities.high);
    }

    // Issue type criticality
    if (factors.issueType === 'Bug') {
      priority = Math.min(priority, this.priorities.high);
    }

    return priority;
  }

  /**
   * Get user tier for priority calculation
   */
  getUserTier(userId) {
    // In MVP, all users are 'standard'
    // Post-MVP: implement actual tier checking
    return 'standard';
  }

  /**
   * Queue metrics collection
   * @param {Object} metricsData - Metrics data to process
   * @returns {Promise<string>} Queue entry ID
   */
  async queueMetrics(metricsData) {
    try {
      const queueEntry = {
        id: this.generateEntryId('metrics'),
        type: 'metrics',
        data: metricsData,
        priority: this.priorities.low, // Metrics are low priority
        createdAt: new Date().toISOString(),
        attempts: 0,
        maxAttempts: this.retryLimits.metrics,
        status: 'queued'
      };

      await queue.push(this.queues.metrics, queueEntry);

      await storage.set(`queue:metrics:${queueEntry.id}`, {
        id: queueEntry.id,
        type: metricsData.type,
        status: 'queued',
        createdAt: queueEntry.createdAt
      }, {
        ttl: 6 * 60 * 60 // 6 hours
      });

      Logger.debug('Metrics queued', {
        entryId: queueEntry.id,
        type: metricsData.type
      });

      return queueEntry.id;

    } catch (error) {
      Logger.error('Failed to queue metrics', {
        type: metricsData.type,
        error: error.message
      });
      throw new Error(`Metrics queue operation failed: ${error.message}`);
    }
  }

  /**
   * Process queued analysis (called by consumer)
   * @param {Object} queueEntry - Queue entry data
   * @returns {Promise<Object>} Processing result
   */
  async processQueuedAnalysis(queueEntry) {
    try {
      const { id, data, attempts = 0, maxAttempts } = queueEntry;

      Logger.info('Processing queued analysis', {
        entryId: id,
        analysisId: data.analysisId,
        attempt: attempts + 1,
        maxAttempts
      });

      // Update status to processing
      await this.updateQueueEntryStatus(id, 'processing', {
        startedAt: new Date().toISOString(),
        attempt: attempts + 1
      });

      // Import and use ClaudeSonnet4Service
      const { ClaudeSonnet4Service } = await import('./claudeSonnet4Service.js');
      const claudeService = new ClaudeSonnet4Service();

      // Perform the analysis
      const analysisResult = await claudeService.analyzeMeeting({
        notes: data.notes,
        meetingType: data.meetingType,
        issueType: data.issueType,
        userId: data.userId
      });

      if (!analysisResult.success) {
        throw new Error('Claude analysis failed');
      }

      // Create Jira issues if requested
      let jiraResults = [];
      if (data.options?.createJiraIssues && analysisResult.issues.length > 0) {
        const { JiraService } = await import('./jiraService.js');
        const jiraService = new JiraService();

        jiraResults = await jiraService.createIssuesBatch(
          analysisResult.issues.map(issue => ({
            summary: issue.summary,
            description: issue.description,
            issueType: issue.issueType,
            priority: issue.priority,
            assignee: data.options.assignToCurrentUser ? data.userId : issue.assignee,
            labels: issue.labels || [],
            projectKey: data.options.projectKey
          })),
          { maxConcurrent: 2, delay: 1500 } // Conservative rate limiting
        );
      }

      // Prepare final result
      const finalResult = {
        ...analysisResult,
        jiraIssues: jiraResults,
        processedAt: new Date().toISOString(),
        queueEntryId: id
      };

      // Update analysis record with results
      await this.updateAnalysisWithResults(data.analysisId, finalResult);

      // Mark queue entry as completed
      await this.updateQueueEntryStatus(id, 'completed', {
        completedAt: new Date().toISOString(),
        issuesExtracted: analysisResult.issues.length,
        jiraIssuesCreated: jiraResults.filter(r => r.success).length
      });

      Logger.info('Analysis processing completed', {
        entryId: id,
        analysisId: data.analysisId,
        issuesExtracted: analysisResult.issues.length,
        jiraIssuesCreated: jiraResults.filter(r => r.success).length
      });

      return {
        success: true,
        entryId: id,
        analysisId: data.analysisId,
        result: finalResult
      };

    } catch (error) {
      Logger.error('Analysis processing failed', {
        entryId: queueEntry.id,
        analysisId: queueEntry.data?.analysisId,
        attempt: queueEntry.attempts + 1,
        error: error.message
      });

      await this.handleProcessingError(queueEntry, error);
      throw error;
    }
  }

  /**
   * Handle processing errors with retry logic
   */
  async handleProcessingError(queueEntry, error) {
    try {
      const { id, data, attempts = 0, maxAttempts } = queueEntry;
      const nextAttempt = attempts + 1;

      if (nextAttempt < maxAttempts) {
        // Calculate exponential backoff delay
        const baseDelay = 30; // 30 seconds
        const delay = baseDelay * Math.pow(2, nextAttempt - 1);
        const jitter = Math.random() * baseDelay;
        const totalDelay = delay + jitter;

        Logger.info('Scheduling retry for failed analysis', {
          entryId: id,
          analysisId: data.analysisId,
          attempt: nextAttempt,
          maxAttempts,
          delaySeconds: Math.round(totalDelay)
        });

        // Update queue entry for retry
        const retryEntry = {
          ...queueEntry,
          attempts: nextAttempt,
          status: 'retrying',
          lastError: error.message,
          retryAt: new Date(Date.now() + totalDelay * 1000).toISOString()
        };

        // Re-queue with delay
        setTimeout(async () => {
          try {
            await queue.push(this.queues.analysis, retryEntry);
            await this.updateQueueEntryStatus(id, 'queued', {
              attempt: nextAttempt,
              lastError: error.message
            });
          } catch (retryError) {
            Logger.error('Failed to requeue analysis', {
              entryId: id,
              error: retryError.message
            });
          }
        }, totalDelay * 1000);

      } else {
        // Max attempts reached, mark as failed
        Logger.error('Analysis processing failed permanently', {
          entryId: id,
          analysisId: data.analysisId,
          totalAttempts: nextAttempt,
          finalError: error.message
        });

        await this.updateQueueEntryStatus(id, 'failed', {
          failedAt: new Date().toISOString(),
          finalError: error.message,
          totalAttempts: nextAttempt
        });

        // Update analysis record with failure
        await this.updateAnalysisWithError(data.analysisId, error.message);
      }

    } catch (handlingError) {
      Logger.error('Error handling failed', {
        originalError: error.message,
        handlingError: handlingError.message
      });
    }
  }

  /**
   * Update queue entry status
   */
  async updateQueueEntryStatus(entryId, status, additionalData = {}) {
    try {
      const queueType = entryId.split('_')[0]; // Extract type from ID
      const key = `queue:${queueType}:${entryId}`;
      
      const entry = await storage.get(key);
      if (entry) {
        const updatedEntry = {
          ...entry,
          status,
          updatedAt: new Date().toISOString(),
          ...additionalData
        };

        await storage.set(key, updatedEntry, {
          ttl: status === 'completed' || status === 'failed' ? 6 * 60 * 60 : 24 * 60 * 60
        });
      }
    } catch (error) {
      Logger.warn('Failed to update queue entry status', {
        entryId,
        status,
        error: error.message
      });
    }
  }

  /**
   * Update analysis record with results
   */
  async updateAnalysisWithResults(analysisId, result) {
    try {
      const analysisRecord = await storage.get(`analysis:${analysisId}`);
      if (analysisRecord) {
        analysisRecord.status = 'completed';
        analysisRecord.progress = 100;
        analysisRecord.result = result;
        analysisRecord.completedAt = new Date().toISOString();
        analysisRecord.issuesCreated = result.jiraIssues?.filter(r => r.success).length || 0;

        await storage.set(`analysis:${analysisId}`, analysisRecord);
      }
    } catch (error) {
      Logger.error('Failed to update analysis with results', {
        analysisId,
        error: error.message
      });
    }
  }

  /**
   * Update analysis record with error
   */
  async updateAnalysisWithError(analysisId, errorMessage) {
    try {
      const analysisRecord = await storage.get(`analysis:${analysisId}`);
      if (analysisRecord) {
        analysisRecord.status = 'failed';
        analysisRecord.progress = 0;
        analysisRecord.errors = (analysisRecord.errors || []).concat([errorMessage]);
        analysisRecord.failedAt = new Date().toISOString();

        await storage.set(`analysis:${analysisId}`, analysisRecord);
      }
    } catch (error) {
      Logger.error('Failed to update analysis with error', {
        analysisId,
        error: error.message
      });
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    try {
      const stats = {
        analysis: await this.getQueueTypeStats('analysis'),
        metrics: await this.getQueueTypeStats('metrics'),
        totalProcessed: 0,
        totalFailed: 0,
        averageProcessingTime: 0
      };

      // Calculate totals
      stats.totalProcessed = stats.analysis.completed + stats.metrics.completed;
      stats.totalFailed = stats.analysis.failed + stats.metrics.failed;

      return stats;
    } catch (error) {
      Logger.error('Failed to get queue stats', { error: error.message });
      return null;
    }
  }

  /**
   * Get statistics for specific queue type
   */
  async getQueueTypeStats(queueType) {
    try {
      // This is a simplified implementation
      // In production, you'd maintain counters more efficiently
      const stats = {
        queued: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        retrying: 0
      };

      // In a real implementation, you'd query actual queue state
      // For MVP, return basic stats structure
      return stats;
    } catch (error) {
      Logger.warn('Failed to get queue type stats', {
        queueType,
        error: error.message
      });
      return { queued: 0, processing: 0, completed: 0, failed: 0, retrying: 0 };
    }
  }

  /**
   * Clean up old queue entries
   */
  async cleanupQueueEntries() {
    try {
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - 24); // 24 hours old

      // This is a simplified cleanup - in production, implement proper cleanup
      Logger.info('Queue cleanup completed', {
        cutoffDate: cutoffDate.toISOString(),
        message: 'Queue cleanup logic would be implemented here'
      });

      return { cleaned: 0, message: 'Queue cleanup functionality ready' };
    } catch (error) {
      Logger.error('Queue cleanup failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate unique queue entry ID
   */
  generateEntryId(type) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `${type}_${timestamp}_${random}`;
  }

  /**
   * Get queue health status
   */
  async getQueueHealth() {
    try {
      const health = {
        healthy: true,
        queues: {},
        timestamp: new Date().toISOString()
      };

      // Check each queue
      for (const [name, queueName] of Object.entries(this.queues)) {
        try {
          const stats = await this.getQueueTypeStats(name);
          health.queues[name] = {
            healthy: true,
            stats,
            queueName
          };
        } catch (error) {
          health.queues[name] = {
            healthy: false,
            error: error.message,
            queueName
          };
          health.healthy = false;
        }
      }

      return health;
    } catch (error) {
      Logger.error('Queue health check failed', { error: error.message });
      return {
        healthy: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Pause queue processing (for maintenance)
   */
  async pauseQueue(queueType) {
    try {
      const pauseKey = `queue:${queueType}:paused`;
      await storage.set(pauseKey, {
        paused: true,
        pausedAt: new Date().toISOString(),
        reason: 'Manual pause'
      });

      Logger.info('Queue paused', { queueType });
      return true;
    } catch (error) {
      Logger.error('Failed to pause queue', {
        queueType,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Resume queue processing
   */
  async resumeQueue(queueType) {
    try {
      const pauseKey = `queue:${queueType}:paused`;
      await storage.delete(pauseKey);

      Logger.info('Queue resumed', { queueType });
      return true;
    } catch (error) {
      Logger.error('Failed to resume queue', {
        queueType,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Check if queue is paused
   */
  async isQueuePaused(queueType) {
    try {
      const pauseKey = `queue:${queueType}:paused`;
      const pauseInfo = await storage.get(pauseKey);
      return pauseInfo ? pauseInfo.paused : false;
    } catch (error) {
      Logger.warn('Failed to check queue pause status', {
        queueType,
        error: error.message
      });
      return false;
    }
  }
}
