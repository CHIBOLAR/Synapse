// Claude Sonnet 4 Service - OPTIMIZED VERSION
// Performance-optimized implementation with parallel processing, caching, and batching

import { storage } from '@forge/api';
import { Logger } from '../utils/logger.js';
import { SecurityService } from './securityService.js';
import { RateLimiter } from '../utils/rateLimiter.js';

export class ClaudeSonnet4ServiceOptimized {
  constructor() {
    // Optimized Claude Sonnet 4 configuration
    this.model = 'claude-sonnet-4-20250514';
    this.apiVersion = '2023-06-01';
    this.baseURL = 'https://api.anthropic.com/v1/messages';
    
    // Optimized token limits based on analysis type
    this.tokenLimits = {
      dailyStandup: 4096,    // Shorter meetings
      retrospective: 6144,   // Medium complexity
      sprintPlanning: 8192,  // Full complexity
      featurePlanning: 8192, // Full complexity
      bugTriage: 4096,       // Focused content
      general: 6144          // Default medium
    };
    
    // Enhanced rate limiting with burst support
    this.rateLimiter = new RateLimiter('claude-api', 4000, 60000);
    this.burstLimiter = new RateLimiter('claude-burst', 50, 1000); // 50/second burst
    
    // Security and caching
    this.security = new SecurityService();
    this.cache = new Map(); // In-memory cache for similar requests
    this.cacheMaxSize = 1000;
    this.cacheTTL = 10 * 60 * 1000; // 10 minutes
    
    // Parallel processing pools
    this.apiKeyPool = [];
    this.activeRequests = new Map();
    this.requestQueue = [];
    this.maxConcurrentRequests = 5;
    
    this.initializeOptimizations();
  }

  /**
   * Initialize performance optimizations
   */
  async initializeOptimizations() {
    try {
      // Pre-load API key pool
      await this.loadAPIKeyPool();
      
      // Start background cache cleanup
      this.startCacheCleanup();
      
      // Initialize request processor
      this.startRequestProcessor();
      
      Logger.info('Claude service optimizations initialized', {
        cacheSize: this.cache.size,
        apiKeyPoolSize: this.apiKeyPool.length,
        maxConcurrent: this.maxConcurrentRequests
      });
    } catch (error) {
      Logger.error('Failed to initialize optimizations', { error: error.message });
    }
  }

  /**
   * OPTIMIZED: Analyze meeting with performance enhancements
   */
  async analyzeMeeting(options) {
    const { notes, meetingType, issueType, userId } = options;

    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(notes, meetingType, issueType);
      const cachedResult = this.getCachedResult(cacheKey);
      
      if (cachedResult) {
        Logger.info('Returning cached analysis result', {
          userId,
          meetingType,
          cacheKey: cacheKey.substring(0, 16) + '...'
        });
        return {
          ...cachedResult,
          cached: true,
          processingTime: 0
        };
      }

      const startTime = Date.now();
      
      // Input validation and sanitization (parallel)
      const [sanitizedNotes, rateLimitCheck] = await Promise.all([
        Promise.resolve(this.security.sanitizeInput(notes, 'meetingNotes')),
        this.checkRateLimits(userId)
      ]);
      
      // Optimized prompt generation
      const prompt = this.buildOptimizedPrompt(sanitizedNotes, meetingType, issueType);
      
      // Queue request for parallel processing
      const result = await this.queueOptimizedRequest({
        prompt,
        meetingType,
        issueType,
        userId,
        cacheKey,
        sanitizedNotes
      });
      
      const processingTime = Date.now() - startTime;
      
      // Cache successful results
      if (result.success) {
        this.cacheResult(cacheKey, result, processingTime);
      }
      
      // Log performance metrics
      await this.logOptimizedUsage(userId, {
        ...result.usage,
        processingTime,
        meetingType,
        issueType,
        cached: false
      });

      return {
        ...result,
        processingTime,
        cached: false
      };

    } catch (error) {
      Logger.error('Optimized Claude analysis failed', {
        error: error.message,
        userId,
        meetingType,
        issueType
      });
      throw new Error(`Analysis failed: ${error.message}`);
    }
  }

  /**
   * OPTIMIZED: Batch analyze multiple meetings
   */
  async analyzeMeetingBatch(analyses) {
    try {
      const startTime = Date.now();
      
      // Group by similarity for potential caching
      const groups = this.groupSimilarAnalyses(analyses);
      
      // Process groups in parallel
      const results = await Promise.all(
        groups.map(group => this.processSimilarGroup(group))
      );
      
      // Flatten results
      const flatResults = results.flat();
      
      const totalTime = Date.now() - startTime;
      
      Logger.info('Batch analysis completed', {
        totalAnalyses: analyses.length,
        groups: groups.length,
        totalTime,
        averageTime: totalTime / analyses.length
      });
      
      return {
        success: true,
        results: flatResults,
        metadata: {
          totalAnalyses: analyses.length,
          processingGroups: groups.length,
          totalTime,
          averageTime: totalTime / analyses.length
        }
      };
      
    } catch (error) {
      Logger.error('Batch analysis failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Queue request for optimized parallel processing
   */
  async queueOptimizedRequest(requestData) {
    return new Promise((resolve, reject) => {
      const requestId = this.generateRequestId();
      
      const request = {
        id: requestId,
        data: requestData,
        resolve,
        reject,
        timestamp: Date.now()
      };
      
      this.requestQueue.push(request);
      
      // Process queue if space available
      this.processQueuedRequests();
    });
  }

  /**
   * Process queued requests with parallelization
   */
  async processQueuedRequests() {
    while (this.requestQueue.length > 0 && this.activeRequests.size < this.maxConcurrentRequests) {
      const request = this.requestQueue.shift();
      
      this.activeRequests.set(request.id, request);
      
      // Process request asynchronously
      this.processRequest(request)
        .then(result => {
          request.resolve(result);
          this.activeRequests.delete(request.id);
          // Continue processing queue
          setImmediate(() => this.processQueuedRequests());
        })
        .catch(error => {
          request.reject(error);
          this.activeRequests.delete(request.id);
          // Continue processing queue
          setImmediate(() => this.processQueuedRequests());
        });
    }
  }

  /**
   * Process individual request with optimizations
   */
  async processRequest(request) {
    const { prompt, meetingType, issueType, userId } = request.data;
    
    try {
      // Get optimal API key from pool
      const apiKey = await this.getOptimalAPIKey();
      
      // Make optimized API request
      const response = await this.makeOptimizedAPIRequest(prompt, apiKey, meetingType);
      
      // Process response
      const result = this.processResponse(response, meetingType, issueType);
      
      return result;
      
    } catch (error) {
      Logger.error('Request processing failed', {
        requestId: request.id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * OPTIMIZED: Build more efficient prompts
   */
  buildOptimizedPrompt(notes, meetingType, issueType) {
    // Compress system prompt for efficiency
    const compactSystemPrompt = this.getCompactSystemPrompt(meetingType, issueType);
    
    // Smart truncation if notes are too long
    const optimizedNotes = this.optimizeNotesLength(notes, meetingType);
    
    return `${compactSystemPrompt}

MEETING NOTES:
${optimizedNotes}

Extract actionable Jira issues using the create_jira_issues tool. Focus on high-confidence items (>0.8).`;
  }

  /**
   * Get compact system prompt optimized for token efficiency
   */
  getCompactSystemPrompt(meetingType, issueType) {
    const basePrompt = `Expert meeting analyst. Extract actionable Jira issues from notes.`;

    const meetingContexts = {
      dailyStandup: `Focus: blockers, handoffs, next steps.`,
      sprintPlanning: `Focus: user stories, tasks, acceptance criteria.`,
      retrospective: `Focus: action items, process improvements.`,
      featurePlanning: `Focus: requirements, technical tasks, dependencies.`,
      bugTriage: `Focus: bug reports, severity, assignments.`,
      general: `Focus: actionable items, decisions, follow-ups.`
    };

    const issueContexts = {
      Epic: `Create high-level epics for large initiatives.`,
      Story: `Create user stories with business value.`,
      Task: `Create technical implementation tasks.`,
      Bug: `Create bug reports with reproduction steps.`,
      Improvement: `Create enhancement items.`
    };

    return `${basePrompt} ${meetingContexts[meetingType] || meetingContexts.general} ${issueContexts[issueType] || ''}`;
  }

  /**
   * Optimize notes length based on meeting type
   */
  optimizeNotesLength(notes, meetingType) {
    const limits = {
      dailyStandup: 2000,    // Short meetings
      retrospective: 4000,   // Medium content
      sprintPlanning: 6000,  // Long content
      featurePlanning: 6000, // Long content
      bugTriage: 3000,       // Focused content
      general: 4000          // Default
    };
    
    const limit = limits[meetingType] || limits.general;
    
    if (notes.length <= limit) {
      return notes;
    }
    
    // Smart truncation - try to keep complete sentences
    const truncated = notes.substring(0, limit);
    const lastSentence = truncated.lastIndexOf('.');
    
    if (lastSentence > limit * 0.8) {
      return truncated.substring(0, lastSentence + 1);
    }
    
    return truncated + '...';
  }

  /**
   * OPTIMIZED: Make API request with dynamic token limits
   */
  async makeOptimizedAPIRequest(prompt, apiKey, meetingType) {
    const maxTokens = this.tokenLimits[meetingType] || this.tokenLimits.general;
    
    const requestBody = {
      model: this.model,
      max_tokens: maxTokens,
      temperature: 0.1, // Lower temperature for consistency and caching
      messages: [{
        role: 'user',
        content: prompt
      }],
      tools: [{
        name: "create_jira_issues",
        description: "Extract structured Jira issues from meeting notes",
        input_schema: {
          type: "object",
          properties: {
            issues: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  summary: { type: "string" },
                  description: { type: "string" },
                  issueType: { 
                    type: "string",
                    enum: ["Epic", "Story", "Task", "Bug", "Improvement"]
                  },
                  priority: {
                    type: "string",
                    enum: ["Highest", "High", "Medium", "Low", "Lowest"]
                  },
                  assignee: { type: "string" },
                  labels: { 
                    type: "array",
                    items: { type: "string" }
                  },
                  confidence_score: { 
                    type: "number",
                    minimum: 0,
                    maximum: 1
                  },
                  reasoning: { type: "string" }
                },
                required: ["summary", "description", "issueType", "confidence_score"]
              }
            },
            metadata: {
              type: "object",
              properties: {
                analysis_quality: { type: "string" },
                total_confidence: { type: "number" }
              }
            }
          },
          required: ["issues"]
        }
      }],
      tool_choice: { type: "auto" }
    };

    const response = await fetch(this.baseURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'anthropic-version': this.apiVersion,
        'anthropic-beta': 'tools-2024-04-04'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Claude API error: ${response.status} - ${errorText}`);
    }

    return await response.json();
  }

  /**
   * OPTIMIZED: Check rate limits with burst support
   */
  async checkRateLimits(userId) {
    // Check both standard and burst limits
    await Promise.all([
      this.rateLimiter.checkLimit(userId),
      this.burstLimiter.checkLimit(userId)
    ]);
  }

  /**
   * OPTIMIZED: Load and manage API key pool
   */
  async loadAPIKeyPool() {
    try {
      const activeKeys = await storage.get('claude:api_keys:active') || [];
      
      // Load keys with usage data
      this.apiKeyPool = await Promise.all(
        activeKeys.map(async keyId => {
          const keyData = await storage.secret.get(`claude:api_key:${keyId}`);
          const usage = await storage.get(`claude:usage:${keyId}:today`) || { requests: 0 };
          
          return {
            id: keyId,
            key: keyData,
            usage: usage.requests,
            lastUsed: Date.now(),
            healthy: true
          };
        })
      );
      
      // Sort by least used
      this.apiKeyPool.sort((a, b) => a.usage - b.usage);
      
    } catch (error) {
      Logger.error('Failed to load API key pool', { error: error.message });
      this.apiKeyPool = [];
    }
  }

  /**
   * OPTIMIZED: Get optimal API key from pool
   */
  async getOptimalAPIKey() {
    if (this.apiKeyPool.length === 0) {
      await this.loadAPIKeyPool();
    }
    
    if (this.apiKeyPool.length === 0) {
      throw new Error('No API keys available in pool');
    }
    
    // Find least used healthy key
    let optimalKey = this.apiKeyPool.find(k => k.healthy);
    
    if (!optimalKey) {
      // All keys unhealthy, reset and try again
      this.apiKeyPool.forEach(k => k.healthy = true);
      optimalKey = this.apiKeyPool[0];
    }
    
    // Update usage
    optimalKey.usage++;
    optimalKey.lastUsed = Date.now();
    
    // Re-sort pool
    this.apiKeyPool.sort((a, b) => a.usage - b.usage);
    
    return optimalKey.key;
  }

  /**
   * OPTIMIZED: Intelligent caching system
   */
  generateCacheKey(notes, meetingType, issueType) {
    // Create hash-like key from content
    const content = `${meetingType}:${issueType}:${notes}`;
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `cache_${Math.abs(hash).toString(36)}`;
  }

  getCachedResult(cacheKey) {
    const cached = this.cache.get(cacheKey);
    
    if (!cached) {
      return null;
    }
    
    // Check TTL
    if (Date.now() - cached.timestamp > this.cacheTTL) {
      this.cache.delete(cacheKey);
      return null;
    }
    
    // Update access time
    cached.lastAccessed = Date.now();
    cached.accessCount = (cached.accessCount || 1) + 1;
    
    return cached.result;
  }

  cacheResult(cacheKey, result, processingTime) {
    // Don't cache failed results
    if (!result.success) {
      return;
    }
    
    // Check cache size limit
    if (this.cache.size >= this.cacheMaxSize) {
      this.evictOldestCacheEntries();
    }
    
    this.cache.set(cacheKey, {
      result,
      timestamp: Date.now(),
      lastAccessed: Date.now(),
      accessCount: 1,
      processingTime
    });
  }

  evictOldestCacheEntries() {
    // Remove 20% of oldest entries
    const entriesToRemove = Math.floor(this.cacheMaxSize * 0.2);
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
    
    for (let i = 0; i < entriesToRemove && i < entries.length; i++) {
      this.cache.delete(entries[i][0]);
    }
  }

  startCacheCleanup() {
    // Clean expired entries every 5 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.cache.entries()) {
        if (now - entry.timestamp > this.cacheTTL) {
          this.cache.delete(key);
        }
      }
    }, 5 * 60 * 1000);
  }

  /**
   * OPTIMIZED: Group similar analyses for batch processing
   */
  groupSimilarAnalyses(analyses) {
    const groups = new Map();
    
    for (const analysis of analyses) {
      const groupKey = `${analysis.meetingType}:${analysis.issueType}`;
      
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      
      groups.get(groupKey).push(analysis);
    }
    
    return Array.from(groups.values());
  }

  /**
   * Process similar analyses as a group
   */
  async processSimilarGroup(group) {
    // For groups with similar content, we can optimize prompts
    if (group.length === 1) {
      return [await this.analyzeMeeting(group[0])];
    }
    
    // Batch similar analyses
    const results = await Promise.all(
      group.map(analysis => this.analyzeMeeting(analysis))
    );
    
    return results;
  }

  /**
   * Start request processor
   */
  startRequestProcessor() {
    // Process queue every 100ms
    setInterval(() => {
      this.processQueuedRequests();
    }, 100);
  }

  /**
   * Generate unique request ID
   */
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * OPTIMIZED: Enhanced usage logging with performance metrics
   */
  async logOptimizedUsage(userId, usageData) {
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        userId,
        model: this.model,
        ...usageData,
        optimized: true
      };

      // Log asynchronously to avoid blocking
      setImmediate(async () => {
        try {
          await storage.set(`usage:${userId}:${Date.now()}`, logEntry, {
            ttl: 30 * 24 * 60 * 60
          });

          // Update aggregated metrics
          await this.updateOptimizedMetrics(usageData);
        } catch (error) {
          Logger.warn('Failed to log optimized usage', { error: error.message });
        }
      });

    } catch (error) {
      Logger.warn('Failed to queue usage logging', { error: error.message });
    }
  }

  /**
   * Update optimized performance metrics
   */
  async updateOptimizedMetrics(usageData) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const metricsKey = `metrics:optimized:${today}`;
      
      const metrics = await storage.get(metricsKey) || {
        requests: 0,
        totalProcessingTime: 0,
        cachedResults: 0,
        batchProcessed: 0,
        averageProcessingTime: 0
      };

      metrics.requests += 1;
      metrics.totalProcessingTime += usageData.processingTime || 0;
      
      if (usageData.cached) {
        metrics.cachedResults += 1;
      }
      
      metrics.averageProcessingTime = metrics.totalProcessingTime / metrics.requests;

      await storage.set(metricsKey, metrics, {
        ttl: 90 * 24 * 60 * 60
      });

    } catch (error) {
      Logger.warn('Failed to update optimized metrics', { error: error.message });
    }
  }

  /**
   * Get performance statistics
   */
  async getPerformanceStats() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const metricsKey = `metrics:optimized:${today}`;
      const metrics = await storage.get(metricsKey) || {};
      
      return {
        ...metrics,
        cacheSize: this.cache.size,
        cacheHitRate: metrics.cachedResults / Math.max(metrics.requests, 1),
        apiKeyPoolSize: this.apiKeyPool.length,
        activeRequests: this.activeRequests.size,
        queuedRequests: this.requestQueue.length
      };
    } catch (error) {
      Logger.error('Failed to get performance stats', { error: error.message });
      return null;
    }
  }

  /**
   * Process response (inherited from original with minor optimizations)
   */
  processResponse(response, meetingType, issueType) {
    try {
      const content = response.content[0];
      
      if (content.type === 'tool_use') {
        const issues = content.input.issues || [];
        const metadata = content.input.metadata || {};
        
        // Optimized filtering
        const validIssues = issues.filter(issue => 
          issue.confidence_score >= 0.7 && 
          issue.summary && 
          issue.description &&
          issue.issueType
        );

        return {
          success: true,
          issues: validIssues,
          metadata: {
            ...metadata,
            originalCount: issues.length,
            filteredCount: validIssues.length,
            meetingType,
            issueType,
            modelUsed: this.model,
            optimized: true
          },
          usage: response.usage || {}
        };
      } else {
        return this.parseTextResponse(content.text, meetingType, issueType);
      }
    } catch (error) {
      Logger.error('Optimized response processing failed', { error: error.message });
      throw new Error('Failed to process Claude response');
    }
  }

  /**
   * Fallback text parsing (optimized)
   */
  parseTextResponse(text, meetingType, issueType) {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          success: true,
          issues: parsed.issues || [],
          metadata: {
            source: 'text_parsing_optimized',
            meetingType,
            issueType,
            confidence: 0.6,
            optimized: true
          },
          usage: {}
        };
      }
    } catch (parseError) {
      Logger.warn('Optimized text parsing failed', { error: parseError.message });
    }

    return {
      success: false,
      error: 'Could not extract structured data from response',
      rawResponse: text
    };
  }

  /**
   * Calculate cost (inherited from original)
   */
  calculateCost(usage) {
    if (!usage) return 0;
    
    const inputCost = (usage.input_tokens / 1000000) * 3;
    const outputCost = (usage.output_tokens / 1000000) * 15;
    
    return inputCost + outputCost;
  }

  /**
   * Health check for optimized service
   */
  async getHealthStatus() {
    try {
      const stats = await this.getPerformanceStats();
      
      return {
        healthy: true,
        optimizations: {
          caching: this.cache.size > 0,
          apiKeyPool: this.apiKeyPool.length > 0,
          parallelProcessing: this.maxConcurrentRequests > 1,
          requestQueue: this.requestQueue.length
        },
        performance: stats,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}
