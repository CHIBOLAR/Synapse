/**
 * 🚀 SYNAPSE - E2E Test Runner
 * Week 5, Days 1-2: End-to-End Testing Focus
 */

import { execSync } from 'child_process';

console.log('🧪 Starting Synapse E2E Testing Suite...');
console.log('📋 Focus: Week 5, Days 1-2 - End-to-End Testing\n');

try {
  // Run E2E tests specifically
  console.log('🔄 Running Meeting Analysis Pipeline Tests...');
  execSync('npm test -- tests/e2e', { 
    stdio: 'inherit',
    cwd: process.cwd()
  });

  console.log('\n✅ E2E Testing Complete!');
  console.log('📊 Next: Performance Optimization (Week 5, Days 3-5)');
  
} catch (error) {
  console.error('\n❌ E2E Tests Failed:', error.message);
  console.log('🔧 Check logs and fix issues before proceeding');
  process.exit(1);
}
