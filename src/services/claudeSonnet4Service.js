// Claude Sonnet 4 Service - Core AI Integration
// Production-ready implementation with tool calling and error handling

import { storage } from '@forge/api';
import { Logger } from '../utils/logger.js';
import { SecurityService } from './securityService.js';
import { RateLimiter } from '../utils/rateLimiter.js';

export class ClaudeSonnet4Service {
  constructor() {
    // Claude Sonnet 4 configuration
    this.model = 'claude-sonnet-4-20250514';
    this.apiVersion = '2023-06-01';
    this.maxTokens = 8192;
    this.baseURL = 'https://api.anthropic.com/v1/messages';
    
    // Rate limiting (4000 requests/minute for Sonnet 4)
    this.rateLimiter = new RateLimiter('claude-api', 4000, 60000);
    
    // Security service for input validation
    this.security = new SecurityService();
  }

  /**
   * Analyze meeting notes with Claude Sonnet 4
   * @param {Object} options - Analysis options
   * @param {string} options.notes - Meeting notes to analyze
   * @param {string} options.meetingType - Type of meeting
   * @param {string} options.issueType - Jira issue type
   * @param {string} options.userId - User ID for tracking
   * @returns {Promise<Object>} Analysis results
   */
  async analyzeMeeting(options) {
    const { notes, meetingType, issueType, userId } = options;

    try {
      // Input validation and sanitization
      const sanitizedNotes = this.security.sanitizeInput(notes, 'meetingNotes');
      
      // Check rate limits
      await this.rateLimiter.checkLimit(userId);
      
      // Get API key
      const apiKey = await this.getAPIKey();
      
      // Build context-aware prompt
      const prompt = this.buildPrompt(sanitizedNotes, meetingType, issueType);
      
      // Make API request with tool calling
      const response = await this.makeAPIRequest(prompt, apiKey);
      
      // Process and validate response
      const result = this.processResponse(response, meetingType, issueType);
      
      // Log usage for monitoring
      await this.logUsage(userId, {
        inputTokens: response.usage?.input_tokens || 0,
        outputTokens: response.usage?.output_tokens || 0,
        cost: this.calculateCost(response.usage),
        meetingType,
        issueType
      });

      return result;

    } catch (error) {
      Logger.error('Claude analysis failed', {
        error: error.message,
        userId,
        meetingType,
        issueType,
        notesLength: notes?.length
      });
      throw new Error(`Analysis failed: ${error.message}`);
    }
  }

  /**
   * Build context-aware prompt for specific meeting and issue types
   */
  buildPrompt(notes, meetingType, issueType) {
    const systemPrompt = this.getSystemPrompt(meetingType, issueType);
    
    return `${systemPrompt}

Meeting Notes:
${notes}

Please analyze the meeting notes and extract actionable Jira issues using the provided tool.`;
  }

  /**
   * Get specialized system prompt based on meeting and issue types
   */
  getSystemPrompt(meetingType, issueType) {
    const basePrompt = `You are an expert meeting analyst specialized in extracting actionable Jira issues from meeting notes. You have deep knowledge of agile methodologies, project management, and issue tracking.`;

    const meetingPrompts = {
      dailyStandup: `Focus on completed work, blockers, and next steps. Look for impediments that need resolution and tasks that are ready for handoff.`,
      sprintPlanning: `Identify user stories, tasks, and epics. Break down large items into manageable tasks with clear acceptance criteria.`,
      retrospective: `Extract improvement actions, process changes, and team decisions. Focus on actionable items that can be tracked.`,
      featurePlanning: `Identify requirements, technical tasks, and design decisions. Look for dependencies and prerequisites.`,
      bugTriage: `Focus on bug reports, severity assessment, and assignment decisions. Prioritize based on impact and urgency.`,
      general: `Extract any actionable items, decisions, or follow-up tasks mentioned in the meeting.`
    };

    const issuePrompts = {
      Epic: `Create high-level epics for large initiatives that span multiple sprints.`,
      Story: `Create user stories with clear business value and acceptance criteria.`,
      Task: `Create technical tasks with specific implementation details.`,
      Bug: `Create bug reports with reproduction steps and expected behavior.`,
      Improvement: `Create improvement items for process or technical enhancements.`
    };

    return `${basePrompt}

Meeting Context: ${meetingPrompts[meetingType] || meetingPrompts.general}
Issue Focus: ${issuePrompts[issueType] || 'Create appropriate issue types based on content.'}

Extract issues with high confidence scores (>0.8) and provide clear reasoning for each extraction.`;
  }

  /**
   * Make API request to Claude Sonnet 4 with tool calling
   */
  async makeAPIRequest(prompt, apiKey) {
    const requestBody = {
      model: this.model,
      max_tokens: this.maxTokens,
      temperature: 0.1,
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
                  summary: { 
                    type: "string",
                    description: "Brief, actionable issue summary"
                  },
                  description: { 
                    type: "string",
                    description: "Detailed issue description with context"
                  },
                  issueType: { 
                    type: "string",
                    enum: ["Epic", "Story", "Task", "Bug", "Improvement"]
                  },
                  priority: {
                    type: "string",
                    enum: ["Highest", "High", "Medium", "Low", "Lowest"]
                  },
                  assignee: { 
                    type: "string",
                    description: "Suggested assignee name or email"
                  },
                  labels: { 
                    type: "array",
                    items: { type: "string" },
                    description: "Relevant labels for categorization"
                  },
                  confidence_score: { 
                    type: "number",
                    minimum: 0,
                    maximum: 1,
                    description: "Confidence in extraction accuracy (0-1)"
                  },
                  reasoning: {
                    type: "string",
                    description: "Explanation for why this issue was extracted"
                  }
                },
                required: ["summary", "description", "issueType", "confidence_score"]
              }
            },
            metadata: {
              type: "object",
              properties: {
                analysis_quality: { type: "string" },
                total_confidence: { type: "number" },
                processing_notes: { type: "string" }
              }
            }
          },
          required: ["issues"]
        }
      }],
      tool_choice: { type: "auto" }
    };

    // CRITICAL FIX: Use fetch properly for Forge environment
    try {
      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'anthropic-version': this.apiVersion,
          'anthropic-beta': 'tools-2024-04-04',
          'User-Agent': 'Synapse-Forge-App/2.1.1'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        Logger.error('Claude API error response', {
          status: response.status,
          statusText: response.statusText,
          errorText
        });
        throw new Error(`Claude API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      Logger.info('Claude API success', {
        inputTokens: result.usage?.input_tokens || 0,
        outputTokens: result.usage?.output_tokens || 0
      });

      return result;

    } catch (error) {
      Logger.error('Claude API request failed', {
        error: error.message,
        stack: error.stack,
        baseURL: this.baseURL
      });
      
      if (error.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to Claude API. Please check your internet connection and try again.');
      }
      
      throw error;
    }
  }

  /**
   * Process Claude response and validate results
   */
  processResponse(response, meetingType, issueType) {
    try {
      const content = response.content[0];
      
      if (content.type === 'tool_use') {
        const issues = content.input.issues || [];
        const metadata = content.input.metadata || {};
        
        // Validate and filter issues by confidence
        const validIssues = issues.filter(issue => {
          return issue.confidence_score >= 0.7 && // Minimum confidence threshold
                 issue.summary && 
                 issue.description &&
                 issue.issueType;
        });

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
            processingTime: Date.now()
          },
          usage: response.usage || {}
        };
      } else {
        // Fallback to text parsing if tool use fails
        return this.parseTextResponse(content.text, meetingType, issueType);
      }
    } catch (error) {
      Logger.error('Response processing failed', { error: error.message });
      throw new Error('Failed to process Claude response');
    }
  }

  /**
   * Fallback text parsing for non-tool responses
   */
  parseTextResponse(text, meetingType, issueType) {
    // Basic JSON extraction as fallback
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          success: true,
          issues: parsed.issues || [],
          metadata: {
            source: 'text_parsing',
            meetingType,
            issueType,
            confidence: 0.6 // Lower confidence for text parsing
          },
          usage: {}
        };
      }
    } catch (parseError) {
      Logger.warn('Text parsing failed', { error: parseError.message });
    }

    return {
      success: false,
      error: 'Could not extract structured data from response',
      rawResponse: text
    };
  }

  /**
   * Get active API key with rotation support
   */
  async getAPIKey() {
    try {
      // First try environment variable (for development/testing)
      const envKey = process.env.CLAUDE_API_KEY;
      if (envKey) {
        Logger.debug('Using Claude API key from environment');
        return envKey;
      }

      // Fallback to storage for production deployment
      const activeKeys = await storage.get('claude:api_keys:active') || [];
      
      if (activeKeys.length === 0) {
        throw new Error('No Claude API keys configured in environment or storage');
      }

      // Select least used key for load balancing
      const keyId = await this.selectOptimalKey(activeKeys);
      const keyData = await storage.secret.get(`claude:api_key:${keyId}`);
      
      if (!keyData) {
        throw new Error('API key not found in secret storage');
      }

      return keyData;
    } catch (error) {
      Logger.error('Failed to get API key', { error: error.message });
      throw new Error('Claude API key unavailable');
    }
  }

  /**
   * Select optimal API key based on usage
   */
  async selectOptimalKey(activeKeys) {
    const keyUsage = await Promise.all(
      activeKeys.map(async keyId => {
        const usage = await storage.get(`claude:usage:${keyId}:today`);
        return { keyId, usage: usage?.requests || 0 };
      })
    );

    // Return least used key
    return keyUsage.sort((a, b) => a.usage - b.usage)[0].keyId;
  }

  /**
   * Calculate cost based on token usage
   */
  calculateCost(usage) {
    if (!usage) return 0;
    
    // Claude Sonnet 4 pricing: $3/$15 per million tokens
    const inputCost = (usage.input_tokens / 1000000) * 3;
    const outputCost = (usage.output_tokens / 1000000) * 15;
    
    return inputCost + outputCost;
  }

  /**
   * Log API usage for monitoring and billing
   */
  async logUsage(userId, usageData) {
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        userId,
        model: this.model,
        ...usageData
      };

      await storage.set(`usage:${userId}:${Date.now()}`, logEntry, {
        ttl: 30 * 24 * 60 * 60 // 30 days retention
      });

      // Update daily aggregates
      const today = new Date().toISOString().split('T')[0];
      const dailyKey = `usage:daily:${today}`;
      const dailyUsage = await storage.get(dailyKey) || { 
        requests: 0, 
        inputTokens: 0, 
        outputTokens: 0, 
        cost: 0 
      };

      dailyUsage.requests += 1;
      dailyUsage.inputTokens += usageData.inputTokens;
      dailyUsage.outputTokens += usageData.outputTokens;
      dailyUsage.cost += usageData.cost;

      await storage.set(dailyKey, dailyUsage, {
        ttl: 90 * 24 * 60 * 60 // 90 days retention
      });

    } catch (error) {
      Logger.warn('Failed to log usage', { error: error.message });
      // Don't fail the main operation for logging issues
    }
  }
}
