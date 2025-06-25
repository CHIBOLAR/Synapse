/**
 * 🧪 SYNAPSE - Meeting Analysis Integration Tests
 * 
 * Integration tests for the core meeting analysis functionality
 * Tests the full flow from request to Jira issue creation
 * 
 * Focus: Integration-first testing approach as specified
 */

import { jest } from '@jest/globals';
import { AnalysisResolver } from '../../src/resolvers/analysisResolver.js';
import { ClaudeSonnet4Service } from '../../src/services/claudeSonnet4Service.js';

describe('Meeting Analysis Integration Tests', () => {
  let analysisResolver;
  let mockContext;

  beforeEach(() => {
    analysisResolver = new AnalysisResolver();
    mockContext = {
      accountId: 'test-user-123',
      cloudId: 'test-site-456',
      principal: {
        type: 'user'
      }
    };

    // Mock console methods to reduce test noise
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('End-to-End Analysis Flow', () => {
    it('should successfully analyze meeting notes and create Jira issues', async () => {
      // Arrange
      const mockRequest = {
        body: JSON.stringify({
          notes: `
            Meeting Notes - Daily Standup
            
            John: Finished user authentication feature, moving to payment integration
            Sarah: Working on dashboard UI, blocked by API rate limiting issue
            Mike: Code review completed, found performance issues in search function
            
            Action Items:
            - Fix API rate limiting for dashboard (Sarah)
            - Optimize search performance (Mike)
            - Set up payment gateway testing environment (John)
          `,
          meetingType: 'standup',
          issueType: 'mixed',
          options: {
            confidenceThreshold: 0.7,
            createJiraIssues: true
          }
        })
      };

      // Mock Claude Sonnet 4 response
      const mockClaudeResponse = {
        success: true,
        analysis: {
          issues: [
            {
              id: 'issue-1',
              title: 'Fix API rate limiting for dashboard',
              description: 'Dashboard is experiencing API rate limiting issues that are blocking development progress.',
              issueType: 'Bug',
              priority: 'High',
              assignee: 'Sarah',
              confidence: 0.95,
              acceptanceCriteria: [
                'API calls from dashboard should not be rate limited under normal usage',
                'Rate limiting errors should be properly handled with user feedback',
                'Performance should be within acceptable limits'
              ]
            },
            {
              id: 'issue-2', 
              title: 'Optimize search performance',
              description: 'Performance issues identified in search function during code review need to be addressed.',
              issueType: 'Task',
              priority: 'Medium',
              assignee: 'Mike',
              confidence: 0.88,
              acceptanceCriteria: [
                'Search response time should be under 500ms',
                'Search should handle large datasets efficiently',
                'No performance regressions in related features'
              ]
            }
          ],
          confidence: 0.91,
          processingTime: 2.3
        }
      };

      // Mock service methods
      jest.spyOn(analysisResolver.claudeService, 'analyzeNotes').mockResolvedValue(mockClaudeResponse);
      jest.spyOn(analysisResolver.jiraService, 'createIssue').mockImplementation(async (issueData) => ({
        success: true,
        issueKey: `TEST-${Math.floor(Math.random() * 1000)}`,
        issueId: `issue-id-${Math.floor(Math.random() * 1000)}`
      }));

      // Act
      const result = await analysisResolver.startAnalysis(mockRequest, mockContext);

      // Assert
      expect(result.success).toBe(true);
      expect(result.analysis).toBeDefined();
      expect(result.analysis.issues).toHaveLength(2);
      expect(result.analysis.confidence).toBeGreaterThan(0.8);
      
      // Verify Claude service was called correctly
      expect(analysisResolver.claudeService.analyzeNotes).toHaveBeenCalledWith(
        expect.stringContaining('Meeting Notes - Daily Standup'),
        'standup',
        'mixed',
        expect.any(Object)
      );

      // Verify Jira issues were created
      expect(analysisResolver.jiraService.createIssue).toHaveBeenCalledTimes(2);
    });

    it('should handle invalid meeting notes gracefully', async () => {
      // Arrange
      const mockRequest = {
        body: JSON.stringify({
          notes: 'Too short',
          meetingType: 'general',
          issueType: 'bug'
        })
      };

      // Act & Assert
      await expect(analysisResolver.startAnalysis(mockRequest, mockContext))
        .rejects.toThrow('Content too short for meaningful analysis');
    });

    it('should enforce rate limiting', async () => {
      // Arrange
      const mockRequest = {
        body: JSON.stringify({
          notes: 'Valid meeting notes with sufficient content for analysis and issue extraction.',
          meetingType: 'general',
          issueType: 'task'
        })
      };

      // Mock rate limiting to trigger
      jest.spyOn(analysisResolver.securityService, 'checkRateLimit').mockRejectedValue(
        new Error('Rate limit exceeded: 10 requests per hour')
      );

      // Act & Assert
      await expect(analysisResolver.startAnalysis(mockRequest, mockContext))
        .rejects.toThrow('Rate limit exceeded');
    });
  });

  describe('Security Integration Tests', () => {
    it('should sanitize malicious input', async () => {
      // Arrange
      const mockRequest = {
        body: JSON.stringify({
          notes: `
            Meeting notes with <script>alert('xss')</script> malicious content
            and some legitimate content about the project status update.
          `,
          meetingType: 'general',
          issueType: 'task'
        })
      };

      // Mock Claude response
      jest.spyOn(analysisResolver.claudeService, 'analyzeNotes').mockResolvedValue({
        success: true,
        analysis: { issues: [], confidence: 0.5, processingTime: 1.0 }
      });

      // Act
      const result = await analysisResolver.startAnalysis(mockRequest, mockContext);

      // Assert
      expect(result.success).toBe(true);
      
      // Verify that sanitization was called
      expect(analysisResolver.securityService.sanitizeInput).toHaveBeenCalled();
    });

    it('should validate user context properly', async () => {
      // Arrange
      const invalidContext = {}; // Missing required fields
      const mockRequest = {
        body: JSON.stringify({
          notes: 'Valid notes content',
          meetingType: 'general',
          issueType: 'task'
        })
      };

      // Act & Assert
      await expect(analysisResolver.startAnalysis(mockRequest, invalidContext))
        .rejects.toThrow('Invalid user context');
    });
  });

  describe('Performance Integration Tests', () => {
    it('should complete analysis within performance targets', async () => {
      // Arrange
      const mockRequest = {
        body: JSON.stringify({
          notes: 'Meeting notes that should be processed quickly by the system.',
          meetingType: 'standup',
          issueType: 'mixed'
        })
      };

      // Mock fast Claude response
      jest.spyOn(analysisResolver.claudeService, 'analyzeNotes').mockResolvedValue({
        success: true,
        analysis: { issues: [], confidence: 0.8, processingTime: 1.5 }
      });

      // Act
      const startTime = Date.now();
      const result = await analysisResolver.startAnalysis(mockRequest, mockContext);
      const endTime = Date.now();

      // Assert
      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });

  describe('Error Handling Integration Tests', () => {
    it('should handle Claude API failures gracefully', async () => {
      // Arrange
      const mockRequest = {
        body: JSON.stringify({
          notes: 'Valid meeting notes content',
          meetingType: 'general',
          issueType: 'task'
        })
      };

      // Mock Claude API failure
      jest.spyOn(analysisResolver.claudeService, 'analyzeNotes').mockRejectedValue(
        new Error('Claude API unavailable')
      );

      // Act & Assert
      await expect(analysisResolver.startAnalysis(mockRequest, mockContext))
        .rejects.toThrow('Analysis service temporarily unavailable');
    });

    it('should handle partial Jira creation failures', async () => {
      // Arrange
      const mockRequest = {
        body: JSON.stringify({
          notes: 'Meeting with multiple action items to be created as issues.',
          meetingType: 'planning',
          issueType: 'task'
        })
      };

      // Mock Claude success but Jira partial failure
      jest.spyOn(analysisResolver.claudeService, 'analyzeNotes').mockResolvedValue({
        success: true,
        analysis: {
          issues: [
            { id: 'issue-1', title: 'Task 1', confidence: 0.9 },
            { id: 'issue-2', title: 'Task 2', confidence: 0.8 }
          ],
          confidence: 0.85
        }
      });

      let createCallCount = 0;
      jest.spyOn(analysisResolver.jiraService, 'createIssue').mockImplementation(async () => {
        createCallCount++;
        if (createCallCount === 1) {
          return { success: true, issueKey: 'TEST-1' };
        } else {
          throw new Error('Jira API error');
        }
      });

      // Act
      const result = await analysisResolver.startAnalysis(mockRequest, mockContext);

      // Assert - Should still succeed but report partial failure
      expect(result.success).toBe(true);
      expect(result.analysis.issues).toHaveLength(2);
      expect(result.warnings).toContain('Some issues could not be created in Jira');
    });
  });
});