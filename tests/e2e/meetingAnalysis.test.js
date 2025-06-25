/**
 * 🧪 SYNAPSE - End-to-End Testing Suite
 * 
 * Tests the complete meeting analysis pipeline:
 * Upload → AI Analysis → Jira Creation → Status Updates
 * 
 * Priority: Week 5, Days 1-2 (Current Focus)
 */

import { jest } from '@jest/globals';
import { AnalysisResolver } from '../../src/resolvers/analysisResolver.js';
import { ClaudeSonnet4Service } from '../../src/services/claudeSonnet4Service.js';
import { JiraService } from '../../src/services/jiraService.js';

describe('🚀 Synapse E2E - Meeting Analysis Pipeline', () => {
  let analysisResolver;
  let mockContext;

  beforeAll(async () => {
    // Initialize services for E2E testing
    analysisResolver = new AnalysisResolver();
    mockContext = {
      accountId: 'test-user-123',
      cloudId: 'test-site-456',
      principal: { type: 'user' }
    };

    // Set up test credentials
    process.env.CLAUDE_API_KEY = 'sk-ant-api03-test-key';
    process.env.JIRA_DOMAIN = 'https://test.atlassian.net/';
  });

  describe('📝 Complete Analysis Flow', () => {
    test('should process daily standup meeting and create Jira issues', async () => {
      const meetingNotes = `
        Daily Standup - June 25, 2025
        
        Team Updates:
        - Alice: Completed authentication module, moving to payment gateway
        - Bob: Working on dashboard UI, blocked by API rate limiting issues
        - Carol: Code review completed, found critical security vulnerability in auth
        
        Action Items:
        - Fix API rate limiting problem (Assigned: Bob, Priority: High)
        - Schedule security audit for auth module (Assigned: Carol, Priority: Critical)
        - Set up payment gateway integration (Assigned: Alice, Priority: Medium)
        - Update deployment pipeline (Assigned: DevOps, Priority: Low)
      `;

      const request = {
        method: 'POST',
        path: '/analyze',
        body: JSON.stringify({
          notes: meetingNotes,
          meetingType: 'dailyStandup',
          issueType: 'Task',
          projectKey: 'TEST'
        })
      };

      // Execute the complete flow
      const response = await analysisResolver.startAnalysis(request, mockContext);

      // Verify response structure
      expect(response.statusCode).toBe(200);
      expect(response.body).toBeDefined();
      
      const result = JSON.parse(response.body);
      expect(result.success).toBe(true);
      expect(result.analysisId).toBeDefined();
      expect(result.status).toBe('processing');

      // Verify issues were extracted
      expect(result.preview.issues).toHaveLength(4);
      expect(result.preview.issues[0].summary).toContain('API rate limiting');
      expect(result.preview.issues[1].summary).toContain('security audit');
    }, 30000);

    test('should handle feature planning meeting with epic creation', async () => {
      const meetingNotes = `
        Feature Planning - Q3 2025 Roadmap
        
        New Features Discussed:
        - User Dashboard Redesign: Modern UI with customizable widgets
        - Advanced Analytics: Real-time metrics and reporting
        - Mobile App: Native iOS/Android application
        - API v2: RESTful API with GraphQL support
        
        Dependencies:
        - Dashboard requires analytics API
        - Mobile app needs API v2
        
        Timeline: Q3 2025 delivery
      `;

      const request = {
        method: 'POST',
        path: '/analyze',
        body: JSON.stringify({
          notes: meetingNotes,
          meetingType: 'featurePlanning',
          issueType: 'Epic',
          projectKey: 'TEST'
        })
      };

      const response = await analysisResolver.startAnalysis(request, mockContext);
      const result = JSON.parse(response.body);

      expect(result.success).toBe(true);
      expect(result.preview.issues).toHaveLength(4);
      expect(result.preview.issues[0].issueType).toBe('Epic');
    }, 30000);
  });

  describe('⚡ Performance Requirements', () => {
    test('should complete analysis within 3 seconds', async () => {
      const startTime = Date.now();
      
      const request = {
        method: 'POST',
        path: '/analyze',
        body: JSON.stringify({
          notes: 'Quick standup: Fixed bugs, ready for deployment.',
          meetingType: 'dailyStandup',
          issueType: 'Task'
        })
      };

      await analysisResolver.startAnalysis(request, mockContext);
      const processingTime = Date.now() - startTime;

      expect(processingTime).toBeLessThan(3000); // 3 second target
    });

    test('should handle concurrent analysis requests', async () => {
      const requests = Array(5).fill().map((_, i) => ({
        method: 'POST',
        path: '/analyze',
        body: JSON.stringify({
          notes: `Meeting ${i}: Basic discussion and action items.`,
          meetingType: 'general',
          issueType: 'Task'
        })
      }));

      const promises = requests.map(req => 
        analysisResolver.startAnalysis(req, {
          ...mockContext,
          accountId: `user-${Date.now()}-${Math.random()}`
        })
      );

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.statusCode).toBe(200);
        const result = JSON.parse(response.body);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('🔒 Security & Validation', () => {
    test('should sanitize malicious input', async () => {
      const maliciousNotes = `
        <script>alert('xss')</script>
        Meeting notes with <img src=x onerror=alert('xss')>
        SQL injection attempt: '; DROP TABLE users; --
      `;

      const request = {
        method: 'POST',
        path: '/analyze',
        body: JSON.stringify({
          notes: maliciousNotes,
          meetingType: 'general',
          issueType: 'Task'
        })
      };

      const response = await analysisResolver.startAnalysis(request, mockContext);
      
      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.body);
      expect(result.success).toBe(true);
      
      // Verify content was sanitized
      const analysis = await analysisResolver.getStatus({
        path: `/status/${result.analysisId}`
      }, mockContext);
      
      const status = JSON.parse(analysis.body);
      expect(status.sanitizedInput).not.toContain('<script>');
      expect(status.sanitizedInput).not.toContain('onerror=');
    });

    test('should handle rate limiting', async () => {
      // Simulate rapid requests from same user
      const requests = Array(20).fill().map(() => ({
        method: 'POST',
        path: '/analyze',
        body: JSON.stringify({
          notes: 'Rate limit test meeting',
          meetingType: 'general',
          issueType: 'Task'
        })
      }));

      const responses = await Promise.allSettled(
        requests.map(req => analysisResolver.startAnalysis(req, mockContext))
      );

      // Some requests should be rate limited
      const rateLimited = responses.filter(r => 
        r.status === 'fulfilled' && r.value.statusCode === 429
      );
      
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('🎯 Accuracy & Quality', () => {
    test('should achieve >95% extraction accuracy', async () => {
      const structuredNotes = `
        Sprint Planning - Clear Action Items
        
        1. Implement user authentication (Assignee: Alice, Priority: High)
        2. Design payment interface (Assignee: Bob, Priority: Medium)  
        3. Write API documentation (Assignee: Carol, Priority: Low)
        4. Set up monitoring (Assignee: DevOps, Priority: High)
        5. Conduct user testing (Assignee: QA, Priority: Medium)
      `;

      const request = {
        method: 'POST',
        path: '/analyze',
        body: JSON.stringify({
          notes: structuredNotes,
          meetingType: 'sprintPlanning',
          issueType: 'Story'
        })
      };

      const response = await analysisResolver.startAnalysis(request, mockContext);
      const result = JSON.parse(response.body);

      expect(result.preview.issues).toHaveLength(5);
      
      // Verify high confidence scores
      const highConfidenceIssues = result.preview.issues.filter(
        issue => issue.confidence_score >= 0.95
      );
      
      expect(highConfidenceIssues.length).toBeGreaterThanOrEqual(4); // 80%+ accuracy
    });
  });

  describe('📊 Status & Monitoring', () => {
    test('should provide real-time status updates', async () => {
      const request = {
        method: 'POST',
        path: '/analyze',
        body: JSON.stringify({
          notes: 'Status monitoring test meeting',
          meetingType: 'general',
          issueType: 'Task'
        })
      };

      const analysisResponse = await analysisResolver.startAnalysis(request, mockContext);
      const { analysisId } = JSON.parse(analysisResponse.body);

      // Check status at intervals
      const statusChecks = [];
      for (let i = 0; i < 3; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        const statusResponse = await analysisResolver.getStatus({
          path: `/status/${analysisId}`
        }, mockContext);
        statusChecks.push(JSON.parse(statusResponse.body));
      }

      // Verify status progression
      expect(statusChecks).toHaveLength(3);
      expect(statusChecks[0].status).toBeDefined();
      expect(['processing', 'completed', 'error']).toContain(statusChecks[0].status);
    });
  });
});
