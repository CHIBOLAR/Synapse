// Jira Service - Native Forge API integration for issue creation
// Production-ready Jira integration with error handling and validation

import { asApp, route, storage } from '@forge/api';
import { Logger } from '../utils/logger.js';

export class JiraService {
  constructor() {
    this.apiClient = asApp();
  }

  /**
   * Create Jira issue using native Forge APIs
   * @param {Object} issueData - Issue creation data
   * @returns {Promise<Object>} Created issue details
   */
  async createIssue(issueData) {
    try {
      const {
        summary,
        description,
        issueType,
        priority = 'Medium',
        assignee = null,
        labels = [],
        projectKey = null
      } = issueData;

      // Validate required fields
      if (!summary || !description || !issueType) {
        throw new Error('Missing required fields: summary, description, issueType');
      }

      // Get or determine project key
      const resolvedProjectKey = projectKey || await this.getDefaultProject();
      
      if (!resolvedProjectKey) {
        throw new Error('No project specified and no default project configured');
      }

      // Get project details and validate issue type
      const project = await this.getProject(resolvedProjectKey);
      const validIssueType = await this.validateIssueType(project.id, issueType);
      
      // Resolve assignee if provided
      const assigneeAccountId = assignee ? await this.resolveUser(assignee) : null;

      // Build issue creation payload
      const issuePayload = {
        fields: {
          project: {
            key: resolvedProjectKey
          },
          summary: this.truncateText(summary, 255),
          description: {
            type: 'doc',
            version: 1,
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    text: description
                  }
                ]
              }
            ]
          },
          issuetype: {
            id: validIssueType.id
          },
          priority: {
            name: priority
          }
        }
      };

      // Add assignee if resolved
      if (assigneeAccountId) {
        issuePayload.fields.assignee = {
          accountId: assigneeAccountId
        };
      }

      // Add labels if provided
      if (labels && labels.length > 0) {
        issuePayload.fields.labels = labels.slice(0, 10); // Limit to 10 labels
      }

      // Create the issue
      const response = await this.apiClient.requestJira(
        route`/rest/api/3/issue`,
        {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(issuePayload)
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Jira API error: ${response.status} - ${errorText}`);
      }

      const createdIssue = await response.json();

      // Log successful creation
      Logger.info('Jira issue created successfully', {
        issueKey: createdIssue.key,
        projectKey: resolvedProjectKey,
        issueType: issueType,
        summary: summary.substring(0, 100)
      });

      // Update usage statistics
      await this.updateUsageStats(resolvedProjectKey, issueType);

      return {
        key: createdIssue.key,
        id: createdIssue.id,
        self: createdIssue.self,
        projectKey: resolvedProjectKey,
        issueType: issueType,
        summary: summary,
        created: true
      };

    } catch (error) {
      Logger.error('Jira issue creation failed', {
        error: error.message,
        summary: issueData.summary?.substring(0, 100),
        issueType: issueData.issueType,
        projectKey: issueData.projectKey
      });
      throw new Error(`Failed to create Jira issue: ${error.message}`);
    }
  }

  /**
   * Get project details by key
   */
  async getProject(projectKey) {
    try {
      const response = await this.apiClient.requestJira(
        route`/rest/api/3/project/${projectKey}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Project not found: ${projectKey} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Failed to get project ${projectKey}: ${error.message}`);
    }
  }

  /**
   * Validate and get issue type details
   */
  async validateIssueType(projectId, issueTypeName) {
    try {
      const response = await this.apiClient.requestJira(
        route`/rest/api/3/issuetype/project`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          },
          query: {
            projectId: projectId
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to get project issue types');
      }

      const issueTypes = await response.json();
      const matchingType = issueTypes.find(
        type => type.name.toLowerCase() === issueTypeName.toLowerCase()
      );

      if (!matchingType) {
        // Fallback to first available issue type
        const fallbackType = issueTypes[0];
        Logger.warn('Issue type not found, using fallback', {
          requested: issueTypeName,
          fallback: fallbackType.name,
          available: issueTypes.map(t => t.name)
        });
        return fallbackType;
      }

      return matchingType;
    } catch (error) {
      throw new Error(`Failed to validate issue type: ${error.message}`);
    }
  }

  /**
   * Resolve user by email or display name to account ID
   */
  async resolveUser(userIdentifier) {
    try {
      // If it's already an account ID, return as-is
      if (userIdentifier.startsWith('557058:') || userIdentifier.length === 28) {
        return userIdentifier;
      }

      // Search for user by email or display name
      const response = await this.apiClient.requestJira(
        route`/rest/api/3/user/search`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          },
          query: {
            query: userIdentifier,
            maxResults: 5
          }
        }
      );

      if (!response.ok) {
        Logger.warn('User search failed', { userIdentifier });
        return null;
      }

      const users = await response.json();
      
      if (users.length === 0) {
        Logger.warn('User not found', { userIdentifier });
        return null;
      }

      // Prefer exact email match, otherwise first result
      const exactMatch = users.find(user => 
        user.emailAddress?.toLowerCase() === userIdentifier.toLowerCase()
      );
      
      const selectedUser = exactMatch || users[0];
      
      Logger.info('User resolved', {
        identifier: userIdentifier,
        resolved: selectedUser.displayName,
        accountId: selectedUser.accountId
      });

      return selectedUser.accountId;

    } catch (error) {
      Logger.warn('User resolution failed', {
        userIdentifier,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Get default project for issue creation
   */
  async getDefaultProject() {
    try {
      // Check if admin has configured a default project
      const defaultProject = await storage.get('jira:default_project');
      if (defaultProject) {
        return defaultProject;
      }

      // Otherwise, get the first accessible project
      const response = await this.apiClient.requestJira(
        route`/rest/api/3/project/search`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          },
          query: {
            maxResults: 1,
            expand: 'insight'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to get projects');
      }

      const result = await response.json();
      
      if (result.values && result.values.length > 0) {
        const firstProject = result.values[0];
        
        // Cache as default for future use
        await storage.set('jira:default_project', firstProject.key, {
          ttl: 24 * 60 * 60 // 24 hours
        });

        Logger.info('Auto-selected default project', {
          projectKey: firstProject.key,
          projectName: firstProject.name
        });

        return firstProject.key;
      }

      throw new Error('No accessible projects found');

    } catch (error) {
      Logger.error('Failed to get default project', { error: error.message });
      return null;
    }
  }

  /**
   * Set default project for issue creation
   */
  async setDefaultProject(projectKey) {
    try {
      // Validate project exists and is accessible
      await this.getProject(projectKey);
      
      // Store as default
      await storage.set('jira:default_project', projectKey);
      
      Logger.info('Default project updated', { projectKey });
      return true;
    } catch (error) {
      Logger.error('Failed to set default project', {
        projectKey,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get available projects for the current context
   */
  async getAvailableProjects() {
    try {
      const response = await this.apiClient.requestJira(
        route`/rest/api/3/project/search`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          },
          query: {
            maxResults: 50,
            orderBy: 'name'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to get projects');
      }

      const result = await response.json();
      
      return result.values.map(project => ({
        key: project.key,
        name: project.name,
        id: project.id,
        projectTypeKey: project.projectTypeKey,
        simplified: project.simplified || false
      }));

    } catch (error) {
      Logger.error('Failed to get available projects', { error: error.message });
      throw error;
    }
  }

  /**
   * Get available issue types for a project
   */
  async getProjectIssueTypes(projectKey) {
    try {
      const project = await this.getProject(projectKey);
      
      const response = await this.apiClient.requestJira(
        route`/rest/api/3/issuetype/project`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          },
          query: {
            projectId: project.id
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to get issue types');
      }

      const issueTypes = await response.json();
      
      return issueTypes.map(type => ({
        id: type.id,
        name: type.name,
        description: type.description,
        iconUrl: type.iconUrl,
        subtask: type.subtask || false
      }));

    } catch (error) {
      Logger.error('Failed to get project issue types', {
        projectKey,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Update issue creation usage statistics
   */
  async updateUsageStats(projectKey, issueType) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const statsKey = `jira:stats:${today}`;
      
      const dailyStats = await storage.get(statsKey) || {
        totalIssues: 0,
        byProject: {},
        byIssueType: {}
      };

      dailyStats.totalIssues += 1;
      dailyStats.byProject[projectKey] = (dailyStats.byProject[projectKey] || 0) + 1;
      dailyStats.byIssueType[issueType] = (dailyStats.byIssueType[issueType] || 0) + 1;
      dailyStats.lastUpdated = new Date().toISOString();

      await storage.set(statsKey, dailyStats, {
        ttl: 90 * 24 * 60 * 60 // 90 days retention
      });

    } catch (error) {
      Logger.warn('Failed to update usage stats', {
        projectKey,
        issueType,
        error: error.message
      });
      // Don't fail the main operation for stats
    }
  }

  /**
   * Get Jira usage statistics
   */
  async getUsageStats(days = 7) {
    try {
      const stats = [];
      const today = new Date();

      for (let i = 0; i < days; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayStats = await storage.get(`jira:stats:${dateStr}`);
        if (dayStats) {
          stats.push({
            date: dateStr,
            ...dayStats
          });
        }
      }

      return stats;
    } catch (error) {
      Logger.error('Failed to get usage stats', { error: error.message });
      return [];
    }
  }

  /**
   * Validate Jira connectivity
   */
  async validateConnectivity() {
    try {
      const response = await this.apiClient.requestJira(
        route`/rest/api/3/myself`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Jira API not accessible: ${response.status}`);
      }

      const user = await response.json();
      
      Logger.info('Jira connectivity validated', {
        user: user.displayName,
        accountId: user.accountId
      });

      return {
        connected: true,
        user: {
          displayName: user.displayName,
          accountId: user.accountId,
          emailAddress: user.emailAddress
        }
      };

    } catch (error) {
      Logger.error('Jira connectivity validation failed', { error: error.message });
      return {
        connected: false,
        error: error.message
      };
    }
  }

  /**
   * Utility function to truncate text to specified length
   */
  truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * Batch create multiple issues
   */
  async createIssuesBatch(issuesData, options = {}) {
    const results = [];
    const { maxConcurrent = 3, delay = 1000 } = options;

    // Process in batches to avoid overwhelming Jira API
    for (let i = 0; i < issuesData.length; i += maxConcurrent) {
      const batch = issuesData.slice(i, i + maxConcurrent);
      
      const batchPromises = batch.map(async (issueData, index) => {
        try {
          // Add small delay between requests
          if (index > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
          }
          
          const result = await this.createIssue(issueData);
          return { success: true, result, original: issueData };
        } catch (error) {
          Logger.error('Batch issue creation failed', {
            summary: issueData.summary?.substring(0, 50),
            error: error.message
          });
          return { success: false, error: error.message, original: issueData };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Small delay between batches
      if (i + maxConcurrent < issuesData.length) {
        await new Promise(resolve => setTimeout(resolve, delay * 2));
      }
    }

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    Logger.info('Batch issue creation completed', {
      total: issuesData.length,
      successful: successful.length,
      failed: failed.length
    });

    return {
      total: issuesData.length,
      successful: successful.length,
      failed: failed.length,
      results
    };
  }
}
