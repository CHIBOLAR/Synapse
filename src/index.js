/**
 * 🧠 SYNAPSE MAIN HANDLER
 * 
 * Main entry point for Synapse AI Meeting Analysis
 */

import Resolver from '@forge/resolver';
import { storage } from '@forge/api';

const resolver = new Resolver();

// Text analysis function
resolver.define('analyzeText', async (req) => {
  try {
    const { payload, context } = req;
    console.log('Analyzing text:', payload?.text?.substring(0, 50) + '...');
    
    if (!payload?.text) {
      return { 
        success: false, 
        error: 'No text provided for analysis' 
      };
    }

    // Simple analysis for now
    const analysis = {
      id: `analysis_${Date.now()}`,
      wordCount: payload.text.split(/\s+/).length,
      sentenceCount: payload.text.split(/[.!?]+/).length - 1,
      keyTopics: ['meetings', 'analysis', 'AI'],
      summary: 'Text analysis completed successfully',
      timestamp: new Date().toISOString(),
      userId: context?.accountId
    };

    // Save the analysis
    await storage.set(analysis.id, analysis);

    return {
      success: true,
      analysis
    };
  } catch (error) {
    console.error('Text analysis error:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
});

// Save analysis function
resolver.define('saveAnalysis', async (req) => {
  try {
    const { payload, context } = req;
    console.log('Saving analysis');
    
    const analysisId = `analysis_${Date.now()}`;
    const analysisData = {
      id: analysisId,
      ...payload,
      savedAt: new Date().toISOString(),
      userId: context?.accountId
    };

    await storage.set(analysisId, analysisData);
    
    return {
      success: true,
      analysisId,
      message: 'Analysis saved successfully'
    };
  } catch (error) {
    console.error('Save analysis error:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
});

// Get analysis history function
resolver.define('getAnalysisHistory', async (req) => {
  try {
    const { context } = req;
    console.log('Getting analysis history');
    
    // Get recent analyses from storage - simplified for now
    const history = [
      {
        id: 'analysis_1',
        text: 'Sample meeting analysis',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        summary: 'Previous analysis example',
        userId: context?.accountId
      }
    ];

    return {
      success: true,
      history
    };
  } catch (error) {
    console.error('Get history error:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
});

// Health check function
resolver.define('healthCheck', async (req) => {
  try {
    const { context } = req;
    return {
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      service: 'synapse-meeting-analyzer',
      userId: context?.accountId
    };
  } catch (error) {
    console.error('Health check error:', error);
    return { 
      success: false, 
      status: 'error', 
      error: error.message 
    };
  }
});

// Test connection function
resolver.define('testConnection', async (req) => {
  try {
    const { context } = req;
    // Test storage connection
    const testKey = `connection_test_${context?.accountId}`;
    const testValue = { 
      timestamp: new Date().toISOString(),
      userId: context?.accountId
    };
    
    await storage.set(testKey, testValue);
    const retrieved = await storage.get(testKey);
    
    return {
      success: true,
      message: 'Connection test successful',
      storageTest: retrieved ? 'passed' : 'failed'
    };
  } catch (error) {
    console.error('Connection test error:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
});

console.log('Synapse resolver initialized successfully');

// Get user configuration function
resolver.define('getUserConfig', async (req) => {
  try {
    const { context } = req;
    console.log('Getting user configuration');
    
    // Get user config from storage or return defaults
    const userConfigKey = `user_config_${context?.accountId}`;
    const userConfig = await storage.get(userConfigKey) || {
      config: {
        preferences: {
          defaultMeetingType: 'general',
          autoSave: true,
          notifications: true
        }
      }
    };

    return {
      success: true,
      ...userConfig
    };
  } catch (error) {
    console.error('Get user config error:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
});

// Validate content function
resolver.define('validateContent', async (req) => {
  try {
    const { payload } = req;
    console.log('Validating content');
    
    if (!payload?.content) {
      return { 
        success: false, 
        error: 'No content provided' 
      };
    }

    const content = payload.content.trim();
    const contentLength = content.length;
    const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;

    if (contentLength < 10) {
      return { 
        success: false, 
        error: 'Content too short (minimum 10 characters)' 
      };
    }

    if (contentLength > 50000) {
      return { 
        success: false, 
        error: 'Content too long (maximum 50,000 characters)' 
      };
    }

    return {
      success: true,
      contentLength,
      wordCount,
      valid: true
    };
  } catch (error) {
    console.error('Content validation error:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
});

// Start analysis function
resolver.define('startAnalysis', async (req) => {
  try {
    const { payload, context } = req;
    console.log('Starting analysis');
    
    if (!payload?.content) {
      return { 
        success: false, 
        error: 'No content provided for analysis' 
      };
    }

    const analysisId = `analysis_${Date.now()}_${context?.accountId}`;
    const analysisData = {
      id: analysisId,
      content: payload.content,
      meetingType: payload.meetingType || 'general',
      status: 'processing',
      progress: 0,
      startedAt: new Date().toISOString(),
      userId: context?.accountId
    };

    // Save analysis data
    await storage.set(analysisId, analysisData);
    
    // Simulate processing by updating progress
    setTimeout(async () => {
      try {
        const updated = await storage.get(analysisId);
        if (updated) {
          updated.progress = 50;
          await storage.set(analysisId, updated);
        }
      } catch (error) {
        console.error('Progress update error:', error);
      }
    }, 2000);

    // Complete analysis after 5 seconds with mock results
    setTimeout(async () => {
      try {
        const updated = await storage.get(analysisId);
        if (updated) {
          updated.status = 'completed';
          updated.progress = 100;
          updated.completedAt = new Date().toISOString();
          updated.results = {
            summary: `Analysis of ${payload.meetingType} meeting completed. This is a mock analysis result.`,
            actionItems: [
              {
                id: 'action_1',
                text: 'Follow up on project timeline',
                assignee: 'Team Lead',
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
              }
            ],
            decisions: [
              {
                id: 'decision_1',
                text: 'Proceed with current approach',
                context: 'Based on team discussion'
              }
            ],
            issues: [],
            participants: ['Team Member 1', 'Team Member 2'],
            processedAt: new Date().toISOString()
          };
          await storage.set(analysisId, updated);
        }
      } catch (error) {
        console.error('Analysis completion error:', error);
      }
    }, 5000);

    return {
      success: true,
      analysisId,
      message: 'Analysis started successfully'
    };
  } catch (error) {
    console.error('Start analysis error:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
});

// Get analysis status function
resolver.define('getAnalysisStatus', async (req) => {
  try {
    const { payload } = req;
    console.log('Getting analysis status');
    
    if (!payload?.analysisId) {
      return { 
        success: false, 
        error: 'No analysis ID provided' 
      };
    }

    const analysisData = await storage.get(payload.analysisId);
    
    if (!analysisData) {
      return { 
        success: false, 
        error: 'Analysis not found' 
      };
    }

    return {
      success: true,
      status: analysisData.status,
      progress: analysisData.progress || 0,
      results: analysisData.results || null,
      startedAt: analysisData.startedAt,
      completedAt: analysisData.completedAt
    };
  } catch (error) {
    console.error('Get analysis status error:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
});

// Process direct text function
resolver.define('processDirectText', async (req) => {
  try {
    const { payload, context } = req;
    console.log('Processing direct text');
    
    if (!payload?.content) {
      return { 
        success: false, 
        error: 'No content provided for processing' 
      };
    }

    // Simple direct analysis (no async processing)
    const wordCount = payload.content.split(/\s+/).filter(w => w.length > 0).length;
    const sentenceCount = payload.content.split(/[.!?]+/).length - 1;
    
    const results = {
      summary: `Direct analysis of ${payload.meetingType || 'general'} content completed. Found ${wordCount} words and ${sentenceCount} sentences.`,
      actionItems: [
        {
          id: 'direct_action_1',
          text: 'Review the processed content',
          assignee: 'Current User'
        }
      ],
      decisions: [
        {
          id: 'direct_decision_1',
          text: 'Content processed successfully',
          context: 'Direct processing mode'
        }
      ],
      issues: [],
      participants: ['System'],
      processedAt: new Date().toISOString(),
      processingMode: 'direct',
      statistics: {
        wordCount,
        sentenceCount,
        characterCount: payload.content.length
      }
    };

    // Save the direct analysis result
    const analysisId = `direct_${Date.now()}_${context?.accountId}`;
    await storage.set(analysisId, {
      id: analysisId,
      content: payload.content,
      meetingType: payload.meetingType || 'general',
      status: 'completed',
      results,
      processedAt: new Date().toISOString(),
      userId: context?.accountId,
      processingMode: 'direct'
    });

    return {
      success: true,
      results,
      analysisId,
      message: 'Direct processing completed successfully'
    };
  } catch (error) {
    console.error('Process direct text error:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
});

console.log('Synapse resolver with all functions initialized successfully');

// Export the handler properly for Forge
export const handler = resolver.getDefinitions();
