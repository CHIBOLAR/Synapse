#!/usr/bin/env node

/**
 * SECURITY AUDIT EXECUTION SCRIPT
 * Run comprehensive security assessment for Synapse
 */

import SecurityAuditRunner from './securityAuditRunner.js';

async function runSecurityAudit() {
  console.log('🔒 SYNAPSE SECURITY AUDIT');
  console.log('========================\n');
  
  const runner = new SecurityAuditRunner();
  
  try {
    const results = await runner.runFullSecurityAudit();
    
    console.log('\n📊 AUDIT RESULTS SUMMARY:');
    console.log('=========================');
    console.log(`🏆 Overall Score: ${results.overallScore}%`);
    console.log(`✅ Passed: ${results.summary.passed}`);
    console.log(`❌ Failed: ${results.summary.failed}`);
    console.log(`⚠️ Warnings: ${results.summary.warnings}`);
    console.log(`🔍 Vulnerabilities: ${results.summary.vulnerabilities}`);
    console.log(`🔒 Security Level: ${results.summary.securityLevel}`);
    
    if (results.compliance?.productionReady) {
      console.log('\n🎉 PRODUCTION READY!');
      process.exit(0);
    } else {
      console.log('\n⚠️ SECURITY IMPROVEMENTS NEEDED');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ Security audit failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runSecurityAudit();
}

export default runSecurityAudit;
