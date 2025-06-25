/**
 * 🧪 SYNAPSE - Test Setup and Configuration
 * 
 * Global test setup for Jest testing environment
 * Configures mocks, utilities, and test helpers
 */

import { jest } from '@jest/globals';

// Mock Forge APIs
jest.mock('@forge/api', () => ({
  storage: {
    set: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue(null),
    delete: jest.fn().mockResolvedValue(undefined),
    query: jest.fn().mockResolvedValue({ results: [] })
  },
  requestJira: jest.fn().mockResolvedValue({
    status: 200,
    json: () => Promise.resolve({ id: 'TEST-123', key: 'TEST-123' })
  })
}));

jest.mock('@forge/bridge', () => ({
  invoke: jest.fn().mockResolvedValue({ success: true })
}));

// Mock fetch for API calls
global.fetch = jest.fn();

// Mock file reading for tests
global.FileReader = class MockFileReader {
  readAsText(file) {
    setTimeout(() => {
      this.onload({ target: { result: file.content || 'mock file content' } });
    }, 10);
  }
};

// React Testing Library setup
import '@testing-library/jest-dom';

// Custom test utilities
export const mockContext = {
  accountId: 'test-user-123',
  cloudId: 'test-site-456',
  principal: { type: 'user' }
};

export const mockMeetingNotes = `
  Daily Standup - June 25, 2025
  
  Team Updates:
  - Alice: Completed authentication, moving to payments
  - Bob: Working on dashboard, blocked by API issues
  - Carol: Code review done, found security vulnerability
  
  Action Items:
  - Fix API rate limiting (Bob)
  - Schedule security audit (Carol)
  - Set up payment gateway (Alice)
`;

export const mockAnalysisResult = {
  success: true,
  analysis: {
    issues: [
      {
        id: 'issue-1',
        title: 'Fix API rate limiting',
        description: 'Dashboard API calls are being rate limited',
        issueType: 'Bug',
        priority: 'High',
        confidence: 0.95,
        acceptanceCriteria: ['API calls should not be rate limited']
      }
    ],
    confidence: 0.95,
    processingTime: 2.1
  }
};

// Test environment configuration
process.env.NODE_ENV = 'test';
process.env.CLAUDE_API_KEY = 'sk-ant-test-key-123';

// Global test helpers
global.waitFor = (condition, timeout = 5000) => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const check = () => {
      if (condition()) {
        resolve();
      } else if (Date.now() - startTime > timeout) {
        reject(new Error('waitFor timeout'));
      } else {
        setTimeout(check, 100);
      }
    };
    check();
  });
};

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});