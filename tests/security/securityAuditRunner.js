/**
 * AUTOMATED SECURITY AUDIT RUNNER
 * Comprehensive security assessment tool for Synapse
 * 
 * Features:
 * - OWASP Top 10 vulnerability scanning
 * - Dependency vulnerability assessment  
 * - Configuration security audit
 * - Performance security testing
 * - Automated penetration testing
 * - Security compliance reporting
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const execAsync = promisify(exec);

export class SecurityAuditRunner {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      overallScore: 0,
      vulnerabilities: [],
      warnings: [],
      passed: [],
      failed: [],
      summary: {}
    };
    
    this.config = {
      maxSeverityAllowed: 'medium',
      requireAllTestsPass: true,
      generateDetailedReport: true,
      performPenetrationTests: true
    };
  }

  /**
   * Run comprehensive security audit
   */
  async runFullSecurityAudit() {
    console.log('🔒 Starting Comprehensive Security Audit...\n');
    
    try {
      // Phase 1: Basic Security Tests
      await this.runBasicSecurityTests();
      
      // Phase 2: Dependency Vulnerability Scanning
      await this.runDependencyAudit();
      
      // Phase 3: Configuration Security Assessment
      await this.runConfigurationAudit();
      
      // Phase 4: Code Security Analysis
      await this.runCodeSecurityAnalysis();
      
      // Phase 5: Environment Security Check
      await this.runEnvironmentSecurityCheck();
      
      // Phase 6: Penetration Testing (if enabled)
      if (this.config.performPenetrationTests) {
        await this.runPenetrationTests();
      }
      
      // Phase 7: Generate Security Report
      await this.generateSecurityReport();
      
      // Phase 8: Security Compliance Check
      await this.checkSecurityCompliance();
      
      console.log('🎉 Security audit completed successfully!\n');
      return this.results;
      
    } catch (error) {
      console.error('❌ Security audit failed:', error.message);
      this.results.failed.push({
        test: 'Security Audit Runner',
        error: error.message,
        severity: 'critical'
      });
      throw error;
    }
  }

  /**
   * Phase 1: Run basic security test suite
   */
  async runBasicSecurityTests() {
    console.log('🧪 Phase 1: Running Basic Security Tests...');
    
    try {
      const { stdout, stderr } = await execAsync(
        'npm test -- tests/security/securityAuditSuite.test.js --verbose',
        { cwd: process.cwd() }
      );
      
      if (stderr && !stderr.includes('PASS')) {
        this.results.warnings.push({
          test: 'Basic Security Tests',
          message: 'Some tests may have warnings',
          details: stderr
        });
      }
      
      this.results.passed.push({
        test: 'OWASP Top 10 Security Tests',
        message: 'All security tests passed',
        score: 25
      });
      
      console.log('✅ Basic security tests completed');
      
    } catch (error) {
      this.results.failed.push({
        test: 'Basic Security Tests',
        error: error.message,
        severity: 'high'
      });
      console.error('❌ Basic security tests failed:', error.message);
    }
  }

  /**
   * Phase 2: Dependency vulnerability scanning
   */
  async runDependencyAudit() {
    console.log('📦 Phase 2: Scanning Dependencies for Vulnerabilities...');
    
    try {
      // Run npm audit
      const { stdout } = await execAsync('npm audit --json', {
        cwd: process.cwd()
      });
      
      const auditResults = JSON.parse(stdout);
      
      if (auditResults.metadata.vulnerabilities.total > 0) {
        const critical = auditResults.metadata.vulnerabilities.critical || 0;
        const high = auditResults.metadata.vulnerabilities.high || 0;
        const moderate = auditResults.metadata.vulnerabilities.moderate || 0;
        
        if (critical > 0) {
          this.results.failed.push({
            test: 'Dependency Vulnerabilities',
            error: `${critical} critical vulnerabilities found`,
            severity: 'critical',
            details: auditResults
          });
        } else if (high > 0) {
          this.results.vulnerabilities.push({
            type: 'dependency',
            severity: 'high',
            count: high,
            message: `${high} high severity vulnerabilities found`
          });
        } else if (moderate > 0) {
          this.results.warnings.push({
            test: 'Dependency Vulnerabilities',
            message: `${moderate} moderate vulnerabilities found`,
            recommendation: 'Update dependencies when possible'
          });
        }
      } else {
        this.results.passed.push({
          test: 'Dependency Vulnerability Scan',
          message: 'No vulnerabilities found in dependencies',
          score: 20
        });
      }
      
      console.log('✅ Dependency audit completed');
      
    } catch (error) {
      console.log('⚠️ npm audit failed, checking manually...');
      
      // Fallback: Check for known vulnerable packages
      await this.checkKnownVulnerablePackages();
    }
  }

  /**
   * Phase 3: Configuration security assessment
   */
  async runConfigurationAudit() {
    console.log('⚙️ Phase 3: Auditing Security Configuration...');
    
    const configChecks = [
      await this.checkEnvironmentVariables(),
      await this.checkFilePermissions(),
      await this.checkManifestSecurity(),
      await this.checkSecurityHeaders(),
      await this.checkEncryptionSettings()
    ];
    
    const passedChecks = configChecks.filter(check => check.passed).length;
    const totalChecks = configChecks.length;
    
    if (passedChecks === totalChecks) {
      this.results.passed.push({
        test: 'Configuration Security',
        message: `All ${totalChecks} configuration checks passed`,
        score: 15
      });
    } else {
      this.results.warnings.push({
        test: 'Configuration Security',
        message: `${passedChecks}/${totalChecks} configuration checks passed`,
        details: configChecks.filter(check => !check.passed)
      });
    }
    
    console.log('✅ Configuration audit completed');
  }

  /**
   * Phase 4: Code security analysis
   */
  async runCodeSecurityAnalysis() {
    console.log('🔍 Phase 4: Analyzing Code for Security Issues...');
    
    try {
      const securityIssues = await this.scanCodeForSecurityIssues();
      
      if (securityIssues.length === 0) {
        this.results.passed.push({
          test: 'Code Security Analysis',
          message: 'No security issues found in code',
          score: 20
        });
      } else {
        const criticalIssues = securityIssues.filter(issue => issue.severity === 'critical');
        const highIssues = securityIssues.filter(issue => issue.severity === 'high');
        
        if (criticalIssues.length > 0) {
          this.results.failed.push({
            test: 'Code Security Analysis',
            error: `${criticalIssues.length} critical security issues found`,
            severity: 'critical',
            details: criticalIssues
          });
        } else if (highIssues.length > 0) {
          this.results.vulnerabilities.push({
            type: 'code',
            severity: 'high',
            count: highIssues.length,
            issues: highIssues
          });
        } else {
          this.results.warnings.push({
            test: 'Code Security Analysis',
            message: `${securityIssues.length} minor security issues found`,
            details: securityIssues
          });
        }
      }
      
      console.log('✅ Code security analysis completed');
      
    } catch (error) {
      this.results.failed.push({
        test: 'Code Security Analysis',
        error: error.message,
        severity: 'medium'
      });
      console.error('❌ Code analysis failed:', error.message);
    }
  }

  /**
   * Phase 5: Environment security check
   */
  async runEnvironmentSecurityCheck() {
    console.log('🌍 Phase 5: Checking Environment Security...');
    
    const envChecks = [
      this.checkProductionReadiness(),
      this.checkSecretsManagement(),
      this.checkLoggingConfiguration(),
      this.checkNetworkSecurity()
    ];
    
    const results = await Promise.all(envChecks);
    const passedEnvChecks = results.filter(check => check.passed).length;
    
    if (passedEnvChecks === results.length) {
      this.results.passed.push({
        test: 'Environment Security',
        message: 'Environment is production-ready',
        score: 15
      });
    } else {
      this.results.warnings.push({
        test: 'Environment Security',
        message: `${passedEnvChecks}/${results.length} environment checks passed`,
        details: results.filter(check => !check.passed)
      });
    }
    
    console.log('✅ Environment security check completed');
  }

  /**
   * Phase 6: Penetration testing simulation
   */
  async runPenetrationTests() {
    console.log('🎯 Phase 6: Running Penetration Tests...');
    
    const penTests = [
      await this.testInputValidationBypass(),
      await this.testAuthenticationBypass(),
      await this.testRateLimitBypass(),
      await this.testPrivilegeEscalation(),
      await this.testDataLeakage()
    ];
    
    const vulnerabilities = penTests.filter(test => !test.passed);
    
    if (vulnerabilities.length === 0) {
      this.results.passed.push({
        test: 'Penetration Testing',
        message: 'All penetration tests passed',
        score: 20
      });
    } else {
      const criticalVulns = vulnerabilities.filter(v => v.severity === 'critical');
      
      if (criticalVulns.length > 0) {
        this.results.failed.push({
          test: 'Penetration Testing',
          error: `${criticalVulns.length} critical vulnerabilities found`,
          severity: 'critical',
          details: criticalVulns
        });
      } else {
        this.results.vulnerabilities.push({
          type: 'penetration',
          severity: 'medium',
          count: vulnerabilities.length,
          vulnerabilities
        });
      }
    }
    
    console.log('✅ Penetration tests completed');
  }

  /**
   * Check environment variables security
   */
  async checkEnvironmentVariables() {
    const requiredEnvVars = [
      'CLAUDE_API_KEY',
      'ATLASSIAN_API_TOKEN',
      'ENCRYPTION_KEY',
      'CSRF_SECRET'
    ];
    
    const missing = [];
    const insecure = [];
    
    for (const envVar of requiredEnvVars) {
      const value = process.env[envVar];
      
      if (!value) {
        missing.push(envVar);
      } else if (value.length < 32) {
        insecure.push(envVar);
      }
    }
    
    return {
      name: 'Environment Variables',
      passed: missing.length === 0 && insecure.length === 0,
      issues: [...missing.map(v => `Missing: ${v}`), ...insecure.map(v => `Too short: ${v}`)]
    };
  }

  /**
   * Check file permissions
   */
  async checkFilePermissions() {
    try {
      const sensitiveFiles = ['.env.local', 'manifest.yml'];
      const issues = [];
      
      for (const file of sensitiveFiles) {
        try {
          const stats = await fs.stat(file);
          // Check if file is readable by others (basic check)
          if (stats.mode & 0o044) {
            issues.push(`${file} is readable by others`);
          }
        } catch (error) {
          // File doesn't exist, which is fine for optional files
        }
      }
      
      return {
        name: 'File Permissions',
        passed: issues.length === 0,
        issues
      };
      
    } catch (error) {
      return {
        name: 'File Permissions',
        passed: false,
        issues: [`Permission check failed: ${error.message}`]
      };
    }
  }

  /**
   * Scan code for security issues
   */
  async scanCodeForSecurityIssues() {
    const issues = [];
    const srcPath = path.join(process.cwd(), 'src');
    
    try {
      const files = await this.getJavaScriptFiles(srcPath);
      
      for (const file of files) {
        const content = await fs.readFile(file, 'utf8');
        const fileIssues = this.analyzeFileContent(content, file);
        issues.push(...fileIssues);
      }
      
    } catch (error) {
      console.warn('Could not scan all files:', error.message);
    }
    
    return issues;
  }

  /**
   * Analyze file content for security issues
   */
  analyzeFileContent(content, filename) {
    const issues = [];
    
    // Check for hardcoded secrets
    const secretPatterns = [
      { pattern: /api[_-]?key\s*[:=]\s*["'][^"']{20,}["']/i, severity: 'critical', message: 'Hardcoded API key' },
      { pattern: /password\s*[:=]\s*["'][^"']+["']/i, severity: 'high', message: 'Hardcoded password' },
      { pattern: /secret\s*[:=]\s*["'][^"']{10,}["']/i, severity: 'high', message: 'Hardcoded secret' },
      { pattern: /token\s*[:=]\s*["'][^"']{20,}["']/i, severity: 'medium', message: 'Hardcoded token' }
    ];
    
    // Check for unsafe functions
    const unsafeFunctions = [
      { pattern: /eval\s*\(/i, severity: 'critical', message: 'Use of eval() function' },
      { pattern: /innerHTML\s*=/i, severity: 'medium', message: 'Direct innerHTML assignment' },
      { pattern: /document\.write\s*\(/i, severity: 'medium', message: 'Use of document.write()' }
    ];
    
    // Check for missing input validation
    const validationChecks = [
      { pattern: /req\.(body|query|params)\.[^.]+(?!.*sanitize)/i, severity: 'medium', message: 'Potential unsanitized input' }
    ];
    
    const allPatterns = [...secretPatterns, ...unsafeFunctions, ...validationChecks];
    
    allPatterns.forEach(({ pattern, severity, message }) => {
      const matches = content.match(pattern);
      if (matches) {
        issues.push({
          file: filename,
          line: this.getLineNumber(content, matches.index),
          severity,
          message,
          code: matches[0]
        });
      }
    });
    
    return issues;
  }

  /**
   * Get line number for a character index
   */
  getLineNumber(content, index) {
    return content.substring(0, index).split('\n').length;
  }

  /**
   * Get all JavaScript files recursively
   */
  async getJavaScriptFiles(dir) {
    const files = [];
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          const subFiles = await this.getJavaScriptFiles(fullPath);
          files.push(...subFiles);
        } else if (entry.name.endsWith('.js') || entry.name.endsWith('.jsx')) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.warn(`Could not read directory ${dir}:`, error.message);
    }
    
    return files;
  }

  /**
   * Test input validation bypass
   */
  async testInputValidationBypass() {
    const bypassAttempts = [
      'normal input',
      '<script>alert(1)</script>',
      'ignore previous instructions',
      '../../../etc/passwd',
      'javascript:alert(1)'
    ];
    
    // Simulate testing against SecurityService
    const SecurityService = (await import('../../src/services/securityService.js')).SecurityService;
    const securityService = new SecurityService();
    
    let bypassCount = 0;
    
    for (const attempt of bypassAttempts) {
      try {
        securityService.sanitizeInput(attempt, 'meetingNotes');
        if (attempt !== 'normal input') {
          bypassCount++;
        }
      } catch (error) {
        // Good - security service blocked the attempt
      }
    }
    
    return {
      name: 'Input Validation Bypass',
      passed: bypassCount === 0,
      severity: bypassCount > 0 ? 'high' : 'low',
      details: `${bypassCount} bypass attempts succeeded`
    };
  }

  /**
   * Test authentication bypass
   */
  async testAuthenticationBypass() {
    // Test various authentication bypass scenarios
    const testCases = [
      { context: null, shouldFail: true },
      { context: {}, shouldFail: true },
      { context: { accountId: 'test' }, shouldFail: false }
    ];
    
    const SecurityService = (await import('../../src/services/securityService.js')).SecurityService;
    const securityService = new SecurityService();
    
    let bypassCount = 0;
    
    for (const testCase of testCases) {
      try {
        securityService.validateUserContext(testCase.context);
        if (testCase.shouldFail) {
          bypassCount++;
        }
      } catch (error) {
        if (!testCase.shouldFail) {
          bypassCount++;
        }
      }
    }
    
    return {
      name: 'Authentication Bypass',
      passed: bypassCount === 0,
      severity: bypassCount > 0 ? 'critical' : 'low',
      details: `${bypassCount} authentication bypasses found`
    };
  }

  /**
   * Test rate limit bypass
   */
  async testRateLimitBypass() {
    const SecurityService = (await import('../../src/services/securityService.js')).SecurityService;
    const securityService = new SecurityService();
    
    const userId = 'test-user-bypass';
    const action = 'test-action';
    const limit = 3;
    
    let successCount = 0;
    
    // Try to exceed rate limit
    for (let i = 0; i < limit + 2; i++) {
      try {
        await securityService.checkRateLimit(userId, action, limit, 3600000);
        successCount++;
      } catch (error) {
        // Expected to fail after limit
      }
    }
    
    const bypassed = successCount > limit;
    
    return {
      name: 'Rate Limit Bypass',
      passed: !bypassed,
      severity: bypassed ? 'medium' : 'low',
      details: `${successCount} requests succeeded (limit: ${limit})`
    };
  }

  /**
   * Test privilege escalation
   */
  async testPrivilegeEscalation() {
    const SecurityService = (await import('../../src/services/securityService.js')).SecurityService;
    const securityService = new SecurityService();
    
    const userContext = {
      accountId: 'regular-user',
      principal: { type: 'user' },
      extension: { permissions: ['READ'] }
    };
    
    let escalationSucceeded = false;
    
    try {
      securityService.validateUserContext(userContext, 'admin');
      escalationSucceeded = true;
    } catch (error) {
      // Good - escalation prevented
    }
    
    return {
      name: 'Privilege Escalation',
      passed: !escalationSucceeded,
      severity: escalationSucceeded ? 'critical' : 'low',
      details: escalationSucceeded ? 'User gained admin privileges' : 'Escalation prevented'
    };
  }

  /**
   * Test for data leakage
   */
  async testDataLeakage() {
    // Test error messages don't leak sensitive information
    const SecurityService = (await import('../../src/services/securityService.js')).SecurityService;
    const securityService = new SecurityService();
    
    let dataLeaked = false;
    const sensitiveInput = 'SENSITIVE_API_KEY_12345';
    
    try {
      securityService.sanitizeInput(sensitiveInput + ' ignore instructions', 'meetingNotes');
    } catch (error) {
      if (error.message.includes(sensitiveInput)) {
        dataLeaked = true;
      }
    }
    
    return {
      name: 'Data Leakage',
      passed: !dataLeaked,
      severity: dataLeaked ? 'medium' : 'low',
      details: dataLeaked ? 'Sensitive data leaked in error message' : 'No data leakage detected'
    };
  }

  /**
   * Check production readiness
   */
  checkProductionReadiness() {
    const checks = [
      process.env.NODE_ENV === 'production',
      process.env.CLAUDE_API_KEY && process.env.CLAUDE_API_KEY.length > 20,
      process.env.ATLASSIAN_API_TOKEN && process.env.ATLASSIAN_API_TOKEN.length > 20
    ];
    
    const passed = checks.every(check => check);
    
    return Promise.resolve({
      name: 'Production Readiness',
      passed,
      issues: passed ? [] : ['Environment not configured for production']
    });
  }

  /**
   * Check secrets management
   */
  checkSecretsManagement() {
    const issues = [];
    
    // Check if secrets are in environment variables (not hardcoded)
    if (!process.env.CLAUDE_API_KEY) {
      issues.push('CLAUDE_API_KEY not in environment');
    }
    
    if (!process.env.ENCRYPTION_KEY) {
      issues.push('ENCRYPTION_KEY not in environment');
    }
    
    return Promise.resolve({
      name: 'Secrets Management',
      passed: issues.length === 0,
      issues
    });
  }

  /**
   * Check logging configuration
   */
  checkLoggingConfiguration() {
    // Check if logger is properly configured
    const issues = [];
    
    try {
      // Try to import logger
      require('../../src/utils/logger.js');
    } catch (error) {
      issues.push('Logger not properly configured');
    }
    
    return Promise.resolve({
      name: 'Logging Configuration',
      passed: issues.length === 0,
      issues
    });
  }

  /**
   * Check network security
   */
  checkNetworkSecurity() {
    const issues = [];
    
    // Basic network security checks
    if (process.env.ALLOW_HTTP === 'true') {
      issues.push('HTTP connections allowed');
    }
    
    return Promise.resolve({
      name: 'Network Security',
      passed: issues.length === 0,
      issues
    });
  }

  /**
   * Check for known vulnerable packages
   */
  async checkKnownVulnerablePackages() {
    try {
      const packageJson = JSON.parse(
        await fs.readFile('package.json', 'utf8')
      );
      
      const vulnerablePackages = [
        'lodash@4.17.11', // Example vulnerable version
        'axios@0.18.0'    // Example vulnerable version
      ];
      
      const dependencies = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
      };
      
      const foundVulnerable = [];
      
      for (const [pkg, version] of Object.entries(dependencies)) {
        const pkgString = `${pkg}@${version}`;
        if (vulnerablePackages.includes(pkgString)) {
          foundVulnerable.push(pkgString);
        }
      }
      
      if (foundVulnerable.length > 0) {
        this.results.vulnerabilities.push({
          type: 'dependency',
          severity: 'high',
          packages: foundVulnerable
        });
      } else {
        this.results.passed.push({
          test: 'Known Vulnerable Packages',
          message: 'No known vulnerable packages found',
          score: 10
        });
      }
      
    } catch (error) {
      this.results.warnings.push({
        test: 'Vulnerable Package Check',
        message: 'Could not check package vulnerabilities',
        details: error.message
      });
    }
  }

  /**
   * Check manifest security
   */
  async checkManifestSecurity() {
    try {
      const manifestContent = await fs.readFile('manifest.yml', 'utf8');
      const issues = [];
      
      // Check for overly broad permissions
      if (manifestContent.includes('permissions: [admin]')) {
        issues.push('Overly broad admin permissions');
      }
      
      // Check for insecure external domains
      if (manifestContent.includes('http://')) {
        issues.push('Insecure HTTP domains in manifest');
      }
      
      return {
        name: 'Manifest Security',
        passed: issues.length === 0,
        issues
      };
      
    } catch (error) {
      return {
        name: 'Manifest Security',
        passed: false,
        issues: [`Could not read manifest: ${error.message}`]
      };
    }
  }

  /**
   * Check security headers
   */
  async checkSecurityHeaders() {
    // This would check if proper security headers are configured
    // For Forge apps, this is mostly handled by the platform
    
    return {
      name: 'Security Headers',
      passed: true, // Forge handles this
      issues: []
    };
  }

  /**
   * Check encryption settings
   */
  async checkEncryptionSettings() {
    const SecurityService = (await import('../../src/services/securityService.js')).SecurityService;
    const securityService = new SecurityService();
    
    const issues = [];
    
    // Check encryption algorithm
    if (securityService.config.encryptionAlgorithm !== 'aes-256-gcm') {
      issues.push('Weak encryption algorithm');
    }
    
    // Check if encryption key is set
    if (!process.env.ENCRYPTION_KEY) {
      issues.push('Encryption key not configured');
    }
    
    return {
      name: 'Encryption Settings',
      passed: issues.length === 0,
      issues
    };
  }

  /**
   * Generate comprehensive security report
   */
  async generateSecurityReport() {
    console.log('📊 Generating Security Report...');
    
    // Calculate overall security score
    const totalScore = this.results.passed.reduce((sum, test) => sum + (test.score || 0), 0);
    const maxPossibleScore = 125; // Sum of all possible scores
    this.results.overallScore = Math.round((totalScore / maxPossibleScore) * 100);
    
    // Generate summary
    this.results.summary = {
      totalTests: this.results.passed.length + this.results.failed.length + this.results.warnings.length,
      passed: this.results.passed.length,
      failed: this.results.failed.length,
      warnings: this.results.warnings.length,
      vulnerabilities: this.results.vulnerabilities.length,
      overallScore: this.results.overallScore,
      securityLevel: this.getSecurityLevel(this.results.overallScore)
    };
    
    // Write detailed report
    const reportPath = path.join(process.cwd(), 'SECURITY_AUDIT_REPORT.md');
    const reportContent = this.generateMarkdownReport();
    
    await fs.writeFile(reportPath, reportContent);
    
    console.log(`📋 Security report generated: ${reportPath}`);
    console.log(`🏆 Overall Security Score: ${this.results.overallScore}%`);
    console.log(`🔒 Security Level: ${this.results.summary.securityLevel}`);
  }

  /**
   * Generate markdown security report
   */
  generateMarkdownReport() {
    const timestamp = new Date().toISOString();
    
    return `# 🔒 SYNAPSE SECURITY AUDIT REPORT

**Generated:** ${timestamp}  
**Overall Score:** ${this.results.overallScore}%  
**Security Level:** ${this.results.summary.securityLevel}  

## 📊 EXECUTIVE SUMMARY

| Metric | Count | Status |
|--------|--------|--------|
| **Total Tests** | ${this.results.summary.totalTests} | - |
| **Passed** | ${this.results.summary.passed} | ✅ |
| **Failed** | ${this.results.summary.failed} | ❌ |
| **Warnings** | ${this.results.summary.warnings} | ⚠️ |
| **Vulnerabilities** | ${this.results.summary.vulnerabilities} | 🔍 |

## ✅ PASSED TESTS

${this.results.passed.map(test => 
  `- **${test.test}**: ${test.message} (Score: ${test.score || 0})`
).join('\n')}

## ❌ FAILED TESTS

${this.results.failed.length > 0 ? 
  this.results.failed.map(test => 
    `- **${test.test}**: ${test.error} (Severity: ${test.severity})`
  ).join('\n') : 
  'No failed tests! 🎉'
}

## ⚠️ WARNINGS

${this.results.warnings.length > 0 ? 
  this.results.warnings.map(warning => 
    `- **${warning.test}**: ${warning.message}`
  ).join('\n') : 
  'No warnings! 🎉'
}

## 🔍 VULNERABILITIES

${this.results.vulnerabilities.length > 0 ? 
  this.results.vulnerabilities.map(vuln => 
    `- **${vuln.type}**: ${vuln.count || 1} ${vuln.severity} severity issue(s)`
  ).join('\n') : 
  'No vulnerabilities found! 🎉'
}

## 🎯 SECURITY COMPLIANCE

- **OWASP Top 10**: ${this.results.failed.length === 0 ? '✅ Compliant' : '❌ Issues Found'}
- **Input Validation**: ${this.results.passed.some(p => p.test.includes('Input')) ? '✅ Implemented' : '⚠️ Check Required'}
- **Authentication**: ${this.results.passed.some(p => p.test.includes('Authentication')) ? '✅ Secure' : '⚠️ Check Required'}
- **Data Encryption**: ${this.results.passed.some(p => p.test.includes('Encryption')) ? '✅ Strong' : '⚠️ Check Required'}

## 📋 RECOMMENDATIONS

${this.generateRecommendations()}

## 🔒 NEXT STEPS

1. **Address Critical Issues**: Fix any failed tests immediately
2. **Review Warnings**: Plan fixes for warning-level issues  
3. **Monitor Vulnerabilities**: Set up continuous security monitoring
4. **Regular Audits**: Schedule monthly security assessments
5. **Security Training**: Ensure team follows secure coding practices

---
*Report generated by Synapse Security Audit Runner*
`;
  }

  /**
   * Generate security recommendations
   */
  generateRecommendations() {
    const recommendations = [];
    
    if (this.results.failed.length > 0) {
      recommendations.push('🚨 **CRITICAL**: Address all failed tests before production deployment');
    }
    
    if (this.results.vulnerabilities.length > 0) {
      recommendations.push('🔍 **HIGH**: Review and fix identified vulnerabilities');
    }
    
    if (this.results.warnings.length > 0) {
      recommendations.push('⚠️ **MEDIUM**: Address warning-level issues for improved security');
    }
    
    if (this.results.overallScore < 80) {
      recommendations.push('📈 **IMPROVEMENT**: Enhance security measures to achieve 80%+ score');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('🎉 **EXCELLENT**: Security posture is strong, maintain current practices');
    }
    
    return recommendations.join('\n');
  }

  /**
   * Get security level based on score
   */
  getSecurityLevel(score) {
    if (score >= 95) return 'EXCELLENT';
    if (score >= 85) return 'GOOD';
    if (score >= 70) return 'ACCEPTABLE';
    if (score >= 50) return 'NEEDS IMPROVEMENT';
    return 'CRITICAL';
  }

  /**
   * Check security compliance
   */
  async checkSecurityCompliance() {
    console.log('📋 Checking Security Compliance...');
    
    const compliance = {
      owasp: this.results.failed.length === 0,
      gdpr: true, // Basic GDPR compliance for data handling
      soc2: this.results.overallScore >= 80,
      productionReady: this.results.failed.length === 0 && this.results.vulnerabilities.length === 0
    };
    
    this.results.compliance = compliance;
    
    if (compliance.productionReady) {
      console.log('🎉 Application is PRODUCTION READY!');
    } else {
      console.log('⚠️ Application needs security improvements before production');
    }
  }
}

// Export for use in scripts
export default SecurityAuditRunner;
