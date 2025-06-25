/**
 * 🧪 SYNAPSE - Claude Sonnet 4 Service Integration Tests
 * 
 * Integration tests for Claude Sonnet 4 AI service
 * Tests real API interactions and response handling
 * 
 * Note: These tests require actual API key for full integration testing
 * Mock tests are provided for CI/CD environments
 */

import { jest } from '@jest/globals';
import { ClaudeSonnet4Service } from '../../src/services/claudeSonnet4Service.js';

describe('Claude Sonnet 4 Service Integration Tests', () => {
  let claudeService;
  const mockApiKey = 'sk-ant-test-key-123';

  beforeEach(() => {
    claudeService = new ClaudeSonnet4Service();
    
    // Mock console methods
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('API Integration Tests', () => {
    it('should successfully analyze meeting notes with real API', async () => {
      // Skip if no real API key available
      if (!process.env.CLAUDE_API_KEY) {
        console.log('Skipping real API test - no API key provided');
        return;
      }

      // Arrange
      const meetingNotes = `
        Daily Standup Meeting - June 25, 2025
        
        Team Updates:
        - Alice: Completed user authentication module, moving to payment integration
        - Bob: Working on dashboard UI, need help with responsive design
        - Carol: Code review done, found security vulnerability in API endpoint
        
        Blockers:
        - Payment gateway sandbox access needed (Alice)
        - Design system guidelines missing (Bob)
        - Security audit required before deployment (Carol)
        
        Action Items:
        - Set up payment gateway sandbox environment
        - Create responsive design guidelines
        - Schedule security audit with InfoSec team
      `;

      // Act
      const result = await claudeService.analyzeNotes(
        meetingNotes,
        'standup',
        'mixed',
        { confidenceThreshold: 0.7 }
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.analysis).toBeDefined();
      expect(result.analysis.issues).toBeInstanceOf(Array);
      expect(result.analysis.issues.length).toBeGreaterThan(0);
      expect(result.analysis.confidence).toBeGreaterThan(0);
      expect(result.analysis.processingTime).toBeGreaterThan(0);

      // Verify issue structure
      const firstIssue = result.analysis.issues[0];
      expect(firstIssue).toHaveProperty('id');
      expect(firstIssue).toHaveProperty('title');
      expect(firstIssue).toHaveProperty('description');
      expect(firstIssue).toHaveProperty('issueType');
      expect(firstIssue).toHaveProperty('priority');
      expect(firstIssue).toHaveProperty('confidence');
    }, 30000); // 30 second timeout for API calls

    it('should handle API rate limiting gracefully', async () => {
      // Mock rate limiting response
      const mockFetch = jest.spyOn(global, 'fetch').mockRejectedValue(
        new Error('Rate limit exceeded. Please try again in 60 seconds.')
      );

      // Act & Assert
      await expect(claudeService.analyzeNotes(
        'Test meeting notes',
        'general',
        'task'
      )).rejects.toThrow('Rate limit exceeded');

      mockFetch.mockRestore();
    });

    it('should handle API authentication errors', async () => {
      // Temporarily use invalid API key
      const originalApiKey = claudeService.apiKey;
      claudeService.apiKey = 'invalid-key';

      // Mock authentication error
      const mockFetch = jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Invalid API key' })
      });

      // Act & Assert
      await expect(claudeService.analyzeNotes(
        'Test meeting notes',
        'general',
        'task'
      )).rejects.toThrow('Authentication failed');

      // Restore
      claudeService.apiKey = originalApiKey;
      mockFetch.mockRestore();
    });
  });

  describe('Response Processing Tests', () => {
    it('should correctly parse Claude API response', async () => {
      // Arrange
      const mockClaudeResponse = {
        type: 'message',
        content: [{
          type: 'text',
          text: JSON.stringify({
            issues: [
              {
                id: 'issue-1',
                title: 'Fix authentication bug',
                description: 'User authentication is failing on mobile devices',
                issueType: 'Bug',
                priority: 'High',
                confidence: 0.95,
                acceptanceCriteria: [
                  'Authentication works on all mobile devices',
                  'Error messages are user-friendly'
                ]
              }
            ],
            confidence: 0.95,
            insights: 'High confidence analysis with clear action items identified'
          })
        }],
        usage: {
          input_tokens: 150,
          output_tokens: 200
        }
      };

      // Mock successful API call
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => mockClaudeResponse
      });

      // Act
      const result = await claudeService.analyzeNotes(
        'Test meeting notes with authentication issues',
        'general',
        'bug'
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.analysis.issues).toHaveLength(1);
      expect(result.analysis.issues[0].confidence).toBe(0.95);
      expect(result.analysis.insights).toBeDefined();
      expect(result.usage.inputTokens).toBe(150);
      expect(result.usage.outputTokens).toBe(200);
    });

    it('should handle malformed Claude responses', async () => {
      // Mock malformed response
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          type: 'message',
          content: [{
            type: 'text',
            text: 'Invalid JSON response'
          }]
        })
      });

      // Act & Assert
      await expect(claudeService.analyzeNotes(
        'Test notes',
        'general',
        'task'
      )).rejects.toThrow('Failed to parse Claude response');
    });
  });

  describe('Prompt Engineering Tests', () => {
    it('should generate appropriate prompts for different meeting types', () => {
      // Test standup prompt
      const standupPrompt = claudeService.buildPrompt(
        'Standup meeting notes',
        'standup',
        'mixed'
      );
      expect(standupPrompt).toContain('daily standup');
      expect(standupPrompt).toContain('blockers');
      expect(standupPrompt).toContain('sprint');

      // Test retrospective prompt
      const retroPrompt = claudeService.buildPrompt(
        'Retrospective notes',
        'retrospective',
        'improvement'
      );
      expect(retroPrompt).toContain('retrospective');
      expect(retroPrompt).toContain('went well');
      expect(retroPrompt).toContain('improve');
    });

    it('should include appropriate context for issue types', () => {
      // Test bug-focused analysis
      const bugPrompt = claudeService.buildPrompt(
        'Meeting about bugs',
        'technical',
        'bug'
      );
      expect(bugPrompt).toContain('bug');
      expect(bugPrompt).toContain('defect');
      expect(bugPrompt).toContain('reproduction');

      // Test task-focused analysis
      const taskPrompt = claudeService.buildPrompt(
        'Planning meeting',
        'planning',
        'task'
      );
      expect(taskPrompt).toContain('task');
      expect(taskPrompt).toContain('deliverable');
      expect(taskPrompt).toContain('milestone');
    });
  });

  describe('Performance and Reliability Tests', () => {
    it('should complete analysis within timeout limits', async () => {
      // Mock slow but successful response
      jest.spyOn(global, 'fetch').mockImplementation(() =>
        new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: async () => ({
                type: 'message',
                content: [{ type: 'text', text: '{"issues": [], "confidence": 0.5}' }],
                usage: { input_tokens: 100, output_tokens: 50 }
              })
            });
          }, 2000); // 2 second delay
        })
      );

      // Act
      const startTime = Date.now();
      const result = await claudeService.analyzeNotes(
        'Test notes',
        'general',
        'task'
      );
      const endTime = Date.now();

      // Assert
      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(25000); // Should complete within 25s (Forge limit)
    });

    it('should retry on temporary failures', async () => {
      let callCount = 0;
      jest.spyOn(global, 'fetch').mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          // Fail first two attempts
          return Promise.reject(new Error('Temporary network error'));
        }
        // Succeed on third attempt
        return Promise.resolve({
          ok: true,
          json: async () => ({
            type: 'message',
            content: [{ type: 'text', text: '{"issues": [], "confidence": 0.5}' }],
            usage: { input_tokens: 100, output_tokens: 50 }
          })
        });
      });

      // Act
      const result = await claudeService.analyzeNotes(
        'Test notes',
        'general',
        'task'
      );

      // Assert
      expect(result.success).toBe(true);
      expect(callCount).toBe(3); // Should have retried twice
    });
  });

  describe('Cost and Usage Tracking Tests', () => {
    it('should track token usage and costs', async () => {
      // Mock response with usage data
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          type: 'message',
          content: [{ type: 'text', text: '{"issues": [], "confidence": 0.5}' }],
          usage: { input_tokens: 500, output_tokens: 300 }
        })
      });

      // Act
      const result = await claudeService.analyzeNotes(
        'Longer meeting notes content',
        'general',
        'task'
      );

      // Assert
      expect(result.usage).toBeDefined();
      expect(result.usage.inputTokens).toBe(500);
      expect(result.usage.outputTokens).toBe(300);
      expect(result.usage.totalTokens).toBe(800);
      expect(result.usage.estimatedCost).toBeGreaterThan(0);
    });

    it('should enforce token limits', async () => {
      // Test with content that would exceed token limits
      const veryLongContent = 'word '.repeat(10000); // Simulate very long meeting notes

      // Should throw error before making API call
      await expect(claudeService.analyzeNotes(
        veryLongContent,
        'general',
        'task'
      )).rejects.toThrow('Content too long');
    });
  });
});