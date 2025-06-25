/**
 * SIMPLE SECURITY AUDIT RUNNER
 * Basic security checks for Synapse
 */

import fs from 'fs/promises';
import path from 'path';

console.log('🔒 SYNAPSE SECURITY AUDIT STARTING...');
console.log('=====================================\n');

let auditResults = {
  passed: [],
  failed: [],
  warnings: [],
  score: 0
};

// Phase 1: Check for hardcoded secrets
console.log('🔍 Phase 1: Scanning for hardcoded secrets...');

async function scanForSecrets() {
  const srcPath = path.join(process.cwd(), 'src');
  let secretsFound = 0;
  
  try {
    const files = await getJSFiles(srcPath);
    
    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf8');
        
        // Check for potential secrets
        const secretPatterns = [
          /api[_-]?key\s*[:=]\s*["'][^"']{20,}["']/gi,
          /password\s*[:=]\s*["'][^"']{8,}["']/gi,
          /secret\s*[:=]\s*["'][^"']{10,}["']/gi,
          /token\s*[:=]\s*["'][^"']{20,}["']/gi
        ];
        
        for (const pattern of secretPatterns) {
          const matches = content.match(pattern);
          if (matches) {
            console.log(`   ⚠️ Potential secret in ${file}: ${matches[0].substring(0, 30)}...`);
            secretsFound++;
          }
        }
      } catch (error) {
        console.log(`   ⚠️ Could not read ${file}`);
      }
    }
    
    if (secretsFound === 0) {
      console.log('   ✅ No hardcoded secrets found');
      auditResults.passed.push('No hardcoded secrets');
      auditResults.score += 25;
    } else {
      console.log(`   ❌ Found ${secretsFound} potential secrets`);
      auditResults.failed.push(`${secretsFound} potential secrets found`);
    }
    
  } catch (error) {
    console.log(`   ❌ Error scanning files: ${error.message}`);
    auditResults.failed.push('Secret scanning failed');
  }
}

async function getJSFiles(dir) {
  const files = [];
  
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        const subFiles = await getJSFiles(fullPath);
        files.push(...subFiles);
      } else if (entry.name.endsWith('.js') || entry.name.endsWith('.jsx')) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.log(`Could not read directory ${dir}`);
  }
  
  return files;
}

// Phase 2: Check environment configuration
console.log('\n⚙️ Phase 2: Checking environment configuration...');

function checkEnvironment() {
  const requiredVars = ['CLAUDE_API_KEY', 'ATLASSIAN_API_TOKEN'];
  let configIssues = 0;
  
  for (const envVar of requiredVars) {
    if (!process.env[envVar]) {
      console.log(`   ⚠️ Missing environment variable: ${envVar}`);
      configIssues++;
    } else if (process.env[envVar].length < 20) {
      console.log(`   ⚠️ Environment variable ${envVar} seems too short`);
      configIssues++;
    } else {
      console.log(`   ✅ ${envVar} is configured`);
    }
  }
  
  if (configIssues === 0) {
    auditResults.passed.push('Environment properly configured');
    auditResults.score += 20;
  } else {
    auditResults.warnings.push(`${configIssues} environment configuration issues`);
  }
}

// Phase 3: Check file security
console.log('\n📁 Phase 3: Checking file security...');

async function checkFileSecurity() {
  try {
    // Check for .env files
    const envFiles = ['.env', '.env.local', '.env.production'];
    let envIssues = 0;
    
    for (const envFile of envFiles) {
      try {
        await fs.access(envFile);
        console.log(`   ✅ Found ${envFile} - checking if in .gitignore`);
        
        try {
          const gitignore = await fs.readFile('.gitignore', 'utf8');
          if (!gitignore.includes(envFile.replace('./', ''))) {
            console.log(`   ⚠️ ${envFile} not in .gitignore`);
            envIssues++;
          }
        } catch (error) {
          console.log(`   ⚠️ No .gitignore found`);
          envIssues++;
        }
      } catch (error) {
        // File doesn't exist, which is fine
      }
    }
    
    if (envIssues === 0) {
      auditResults.passed.push('Environment files properly secured');
      auditResults.score += 15;
    } else {
      auditResults.warnings.push(`${envIssues} file security issues`);
    }
    
  } catch (error) {
    console.log(`   ❌ Error checking file security: ${error.message}`);
    auditResults.warnings.push('File security check failed');
  }
}

// Phase 4: Check for dangerous patterns
console.log('\n🚨 Phase 4: Scanning for dangerous code patterns...');

async function checkDangerousPatterns() {
  const srcPath = path.join(process.cwd(), 'src');
  let dangerousPatterns = 0;
  
  try {
    const files = await getJSFiles(srcPath);
    
    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf8');
        
        // Check for dangerous patterns
        const patterns = [
          { pattern: /eval\s*\(/gi, message: 'eval() usage' },
          { pattern: /innerHTML\s*=/gi, message: 'innerHTML assignment' },
          { pattern: /document\.write\s*\(/gi, message: 'document.write usage' },
          { pattern: /exec\s*\(/gi, message: 'exec() usage' }
        ];
        
        for (const { pattern, message } of patterns) {
          if (pattern.test(content)) {
            console.log(`   ⚠️ Found ${message} in ${file}`);
            dangerousPatterns++;
          }
        }
      } catch (error) {
        // Skip files we can't read
      }
    }
    
    if (dangerousPatterns === 0) {
      console.log('   ✅ No dangerous patterns found');
      auditResults.passed.push('No dangerous code patterns');
      auditResults.score += 20;
    } else {
      console.log(`   ❌ Found ${dangerousPatterns} dangerous patterns`);
      auditResults.failed.push(`${dangerousPatterns} dangerous patterns found`);
    }
    
  } catch (error) {
    console.log(`   ❌ Error scanning for patterns: ${error.message}`);
    auditResults.failed.push('Pattern scanning failed');
  }
}

// Run all phases
async function runAudit() {
  try {
    await scanForSecrets();
    checkEnvironment();
    await checkFileSecurity();
    await checkDangerousPatterns();
    
    // Generate final report
    console.log('\n📊 SECURITY AUDIT RESULTS');
    console.log('==========================');
    console.log(`🏆 Security Score: ${auditResults.score}/80 (${Math.round(auditResults.score/80*100)}%)`);
    console.log(`✅ Passed Checks: ${auditResults.passed.length}`);
    console.log(`❌ Failed Checks: ${auditResults.failed.length}`);
    console.log(`⚠️ Warnings: ${auditResults.warnings.length}`);
    
    if (auditResults.passed.length > 0) {
      console.log('\n✅ PASSED:');
      auditResults.passed.forEach(item => console.log(`   • ${item}`));
    }
    
    if (auditResults.failed.length > 0) {
      console.log('\n❌ FAILED:');
      auditResults.failed.forEach(item => console.log(`   • ${item}`));
    }
    
    if (auditResults.warnings.length > 0) {
      console.log('\n⚠️ WARNINGS:');
      auditResults.warnings.forEach(item => console.log(`   • ${item}`));
    }
    
    // Generate recommendations
    console.log('\n🔒 RECOMMENDATIONS:');
    if (auditResults.failed.length > 0) {
      console.log('   🚨 CRITICAL: Address all failed checks before production');
    }
    if (auditResults.warnings.length > 0) {
      console.log('   ⚠️ IMPORTANT: Review and fix warning-level issues');
    }
    if (auditResults.score >= 60) {
      console.log('   🎉 GOOD: Security posture is acceptable');
    } else {
      console.log('   📈 NEEDS WORK: Security improvements required');
    }
    
    // Save simple report
    const report = `# SYNAPSE SECURITY AUDIT REPORT

Generated: ${new Date().toISOString()}
Security Score: ${auditResults.score}/80 (${Math.round(auditResults.score/80*100)}%)

## Summary
- ✅ Passed: ${auditResults.passed.length}
- ❌ Failed: ${auditResults.failed.length}  
- ⚠️ Warnings: ${auditResults.warnings.length}

## Passed Checks
${auditResults.passed.map(item => `- ${item}`).join('\n')}

## Failed Checks
${auditResults.failed.map(item => `- ${item}`).join('\n')}

## Warnings
${auditResults.warnings.map(item => `- ${item}`).join('\n')}

## Production Readiness
${auditResults.failed.length === 0 ? '✅ READY FOR PRODUCTION' : '❌ REQUIRES SECURITY IMPROVEMENTS'}
`;
    
    await fs.writeFile('SECURITY_AUDIT_REPORT.md', report);
    console.log('\n📄 Report saved to: SECURITY_AUDIT_REPORT.md');
    
    // Return appropriate exit code
    if (auditResults.failed.length === 0) {
      console.log('\n🎉 SECURITY AUDIT PASSED!');
      return true;
    } else {
      console.log('\n⚠️ SECURITY IMPROVEMENTS NEEDED');
      return false;
    }
    
  } catch (error) {
    console.error('\n❌ Audit failed:', error.message);
    return false;
  }
}

// Execute the audit
runAudit().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Fatal error:', error.message);
  process.exit(1);
});
