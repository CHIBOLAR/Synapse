// Jest configuration for Synapse MVP
// Integration-first testing approach with 2025 best practices

export default {
  // Environment setup
  testEnvironment: 'node',
  
  // ES Modules support (2025 standard)
  extensionsToTreatAsEsm: ['.js'],
  transform: {
    '^.+\\.jsx?$': ['babel-jest', { useESM: true }]
  },
  
  // Path mapping for clean imports
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
    '^@static/(.*)$': '<rootDir>/static/$1'
  },
  
  // Test discovery patterns
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/tests/**/*.integration.js',
    '<rootDir>/src/**/__tests__/*.js'
  ],
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/static/*/node_modules/',
    '<rootDir>/static/*/build/',
    '<rootDir>/docs/'
  ],
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/**/__tests__/**',
    '!src/index.js',
    '!src/**/*.config.js'
  ],
  
  // Coverage reporters
  coverageReporters: [
    'text',
    'text-summary',
    'lcov',
    'html',
    'json'
  ],
  
  // Coverage thresholds (realistic for integration testing)
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85
    },
    './src/services/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    './src/resolvers/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // Test timeout (for AI API calls)
  testTimeout: 30000,
  
  // Performance optimization
  maxWorkers: '50%',
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',
  
  // Verbose output for debugging
  verbose: true,
  
  // Error handling
  bail: false, // Don't stop on first failure
  errorOnDeprecated: true,
  
  // Transform configuration
  transform: {},
  
  // Module file extensions
  moduleFileExtensions: [
    'js',
    'json',
    'jsx',
    'mjs'
  ],
  
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
  
  // Global setup/teardown
  globalSetup: '<rootDir>/tests/globalSetup.js',
  globalTeardown: '<rootDir>/tests/globalTeardown.js',
  
  // Test environment options
  testEnvironmentOptions: {
    url: 'http://localhost'
  },
  
  // Watch mode configuration
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/static/*/build/',
    '<rootDir>/coverage/',
    '<rootDir>/docs/'
  ],
  
  // Reporters configuration
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'test-results',
        outputName: 'junit.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true
      }
    ],
    [
      'jest-html-reporters',
      {
        publicPath: 'test-results',
        filename: 'report.html',
        expand: true
      }
    ]
  ],
  
  // Snapshot configuration
  snapshotSerializers: [],
  
  // Custom matchers
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.js',
    '<rootDir>/tests/matchers.js'
  ],
  
  // Projects configuration for different test types
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/tests/unit/**/*.test.js'],
      testEnvironment: 'node'
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/tests/integration/**/*.test.js'],
      testEnvironment: 'node',
      testTimeout: 30000
    },
    {
      displayName: 'security',
      testMatch: ['<rootDir>/tests/security/**/*.test.js'],
      testEnvironment: 'node'
    },
    {
      displayName: 'performance',
      testMatch: ['<rootDir>/tests/performance/**/*.test.js'],
      testEnvironment: 'node',
      testTimeout: 120000
    },
    {
      displayName: 'e2e',
      testMatch: ['<rootDir>/tests/e2e/**/*.test.js'],
      testEnvironment: 'node',
      testTimeout: 120000
    }
  ],
  
  // Collect coverage from all projects
  collectCoverage: false, // Enable per project
  
  // Notification configuration
  notify: true,
  notifyMode: 'failure-change',
  
  // Error handling
  silent: false,
  
  // Performance monitoring
  logHeapUsage: true,
  detectOpenHandles: true,
  detectLeaks: true,
  
  // Custom resolver for ES modules
  resolver: undefined,
  
  // Force exit after tests
  forceExit: false
};
