#!/usr/bin/env node

/**
 * Comprehensive Forge Deployment Diagnostic Script
 * Analyzes Synapse project for deployment issues and provides solutions
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const PROJECT_ROOT = 'C:\\Synapse';
const MANIFEST_PATH = path.join(PROJECT_ROOT, 'manifest.yml');
const PACKAGE_JSON_PATH = path.join(PROJECT_ROOT, 'package.json');

class ForgeDeploymentDiagnostic {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.fixes = [];
    this.projectPath = PROJECT_ROOT;
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      error: '❌ ERROR',
      warning: '⚠️  WARNING',
      success: '✅ SUCCESS',
      info: 'ℹ️  INFO',
      fix: '🔧 FIX'
    }[type];
    
    console.log(`[${timestamp}] ${prefix}: ${message}`);
  }

  addIssue(description, severity = 'error', solution = '') {
    this.issues.push({ description, severity, solution });
    this.log(description, severity);
  }

  addFix(description) {
    this.fixes.push(description);
    this.log(description, 'fix');
  }

  // Diagnostic 1: Check manifest.yml structure
  checkManifestStructure() {
    this.log('🔍 Analyzing manifest.yml structure...', 'info');
    
    try {
      const manifestContent = fs.readFileSync(MANIFEST_PATH, 'utf8');
      
      // Check for function modules at wrong level
      if (manifestContent.includes('\nfunction:')) {
        this.addIssue(
          'CRITICAL: Function modules are declared at wrong level in manifest.yml',
          'error',
          'Move function modules inside the modules section'
        );
        
        this.addFix(`
Fix manifest.yml structure by moving function modules:

CURRENT (INCORRECT):
modules:
  jira:issuePanel: ...
function:
  - key: analysis-resolver

CORRECT:
modules:
  jira:issuePanel: ...
  function:
    - key: analysis-resolver
        `);
      }

      // Check for proper resolver references
      if (manifestContent.includes('@forge/resolver')) {
        this.addIssue(
          'Manifest should not reference @forge/resolver package name',
          'warning',
          'Use relative handler paths instead'
        );
      }

      // Check resource paths
      const resourcePaths = [
        'static/main-app/build',
        'static/admin-app/build'
      ];

      resourcePaths.forEach(resourcePath => {
        const fullPath = path.join(this.projectPath, resourcePath);
        if (!fs.existsSync(fullPath)) {
          this.addIssue(
            `Resource path does not exist: ${resourcePath}`,
            'error',
            'Build the frontend applications or update the resource path'
          );
        } else {
          const files = fs.readdirSync(fullPath);
          if (files.length === 0 || (files.length === 1 && files[0] === 'index.html')) {
            this.addIssue(
              `Resource build directory is empty or incomplete: ${resourcePath}`,
              'error',
              'Run proper build commands for frontend applications'
            );
          }
        }
      });

    } catch (error) {
      this.addIssue(`Failed to read manifest.yml: ${error.message}`, 'error');
    }
  }

  // Diagnostic 2: Check package.json and dependencies
  checkPackageJson() {
    this.log('🔍 Analyzing package.json and dependencies...', 'info');
    
    try {
      const packageContent = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));
      
      // Check for missing Forge dependencies
      const requiredDeps = ['@forge/api', '@forge/resolver'];
      const missingDeps = requiredDeps.filter(dep => !packageContent.dependencies[dep]);
      
      if (missingDeps.length > 0) {
        this.addIssue(
          `Missing required dependencies: ${missingDeps.join(', ')}`,
          'error',
          'Install missing Forge dependencies'
        );
        
        this.addFix(`Install missing dependencies:
npm install ${missingDeps.join(' ')}`);
      }

      // Check build scripts
      if (packageContent.scripts.build === "echo 'Build completed - production ready'") {
        this.addIssue(
          'Build script is placeholder - not actually building anything',
          'error',
          'Implement proper build scripts for frontend applications'
        );
        
        this.addFix(`
Update package.json build scripts:

"scripts": {
  "build": "npm run build:frontend && npm run build:admin",
  "build:frontend": "cd static/main-app && npm run build",
  "build:admin": "cd static/admin-app && npm run build"
}
        `);
      }

      // Check for type: module compatibility
      if (packageContent.type === 'module') {
        this.log('✅ Using ES modules (type: "module")', 'success');
      }

    } catch (error) {
      this.addIssue(`Failed to read package.json: ${error.message}`, 'error');
    }
  }

  // Diagnostic 3: Check frontend applications
  checkFrontendApps() {
    this.log('🔍 Analyzing frontend applications...', 'info');
    
    const frontendApps = [
      { name: 'main-app', path: 'static/main-app' },
      { name: 'admin-app', path: 'static/admin-app' }
    ];

    frontendApps.forEach(app => {
      const appPath = path.join(this.projectPath, app.path);
      const packageJsonPath = path.join(appPath, 'package.json');
      
      if (fs.existsSync(packageJsonPath)) {
        try {
          const appPackage = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
          
          // Check if build script exists
          if (!appPackage.scripts?.build) {
            this.addIssue(
              `${app.name} missing build script`,
              'error',
              'Add build script to frontend application'
            );
          }
          
          // Check for Forge Bridge dependency
          if (!appPackage.dependencies?.['@forge/bridge']) {
            this.addIssue(
              `${app.name} missing @forge/bridge dependency`,
              'warning',
              'Install @forge/bridge for Custom UI communication'
            );
          }
          
          this.log(`✅ ${app.name} package.json found`, 'success');
          
        } catch (error) {
          this.addIssue(`Failed to read ${app.name} package.json: ${error.message}`, 'error');
        }
      } else {
        this.addIssue(`${app.name} package.json not found`, 'error');
      }
    });
  }

  // Diagnostic 4: Check resolver files
  checkResolverFiles() {
    this.log('🔍 Analyzing resolver files...', 'info');
    
    const resolverPath = path.join(this.projectPath, 'src', 'resolvers.js');
    
    if (fs.existsSync(resolverPath)) {
      try {
        const resolverContent = fs.readFileSync(resolverPath, 'utf8');
        
        // Check for proper Forge resolver import
        if (!resolverContent.includes("import Resolver from '@forge/resolver'")) {
          this.addIssue(
            'Resolver file missing proper Forge Resolver import',
            'error',
            'Import Resolver from @forge/resolver'
          );
        }
        
        // Check for proper exports
        if (!resolverContent.includes('export const mainHandler') || 
            !resolverContent.includes('export const adminHandler')) {
          this.addIssue(
            'Resolver file missing proper handler exports',
            'error',
            'Export handler functions correctly'
          );
        }
        
        this.log('✅ Resolver file structure looks good', 'success');
        
      } catch (error) {
        this.addIssue(`Failed to read resolver file: ${error.message}`, 'error');
      }
    } else {
      this.addIssue('Resolver file not found at src/resolvers.js', 'error');
    }
  }

  // Diagnostic 5: Check Forge CLI version and environment
  checkForgeEnvironment() {
    this.log('🔍 Checking Forge CLI environment...', 'info');
    
    try {
      // Check if Forge CLI is installed
      const forgeVersion = execSync('forge --version', { encoding: 'utf8' }).trim();
      this.log(`Forge CLI version: ${forgeVersion}`, 'info');
      
      // Check if version is outdated (based on error message showing 11.6.0 vs 12.0.0)
      if (forgeVersion.includes('11.6.0')) {
        this.addIssue(
          'Forge CLI is outdated (11.6.0 vs latest 12.0.0)',
          'warning',
          'Update Forge CLI to latest version'
        );
        
        this.addFix('Update Forge CLI: npm install -g @forge/cli@latest');
      }
      
    } catch (error) {
      this.addIssue('Forge CLI not found or not accessible', 'error', 'Install Forge CLI: npm install -g @forge/cli');
    }
  }

  // Diagnostic 6: Check file permissions and access
  checkFilePermissions() {
    this.log('🔍 Checking file permissions and access...', 'info');
    
    const criticalPaths = [
      'manifest.yml',
      'package.json',
      'src/resolvers.js',
      'static/main-app/build',
      'static/admin-app/build'
    ];

    criticalPaths.forEach(relativePath => {
      const fullPath = path.join(this.projectPath, relativePath);
      try {
        fs.accessSync(fullPath, fs.constants.R_OK);
        this.log(`✅ ${relativePath} is accessible`, 'success');
      } catch (error) {
        this.addIssue(`Cannot access ${relativePath}: ${error.message}`, 'error');
      }
    });
  }

  // Diagnostic 7: Analyze specific bundling error
  analyzeBundlingError() {
    this.log('🔍 Analyzing bundling error patterns...', 'info');
    
    // The specific error: "Error: Can't resolve 'C:\Synapse\static\admin-app\build'"
    const errorPath = 'C:\\Synapse\\static\\admin-app\\build';
    
    if (fs.existsSync(errorPath)) {
      const files = fs.readdirSync(errorPath);
      
      if (files.length === 1 && files[0] === 'index.html') {
        this.addIssue(
          'Build directory only contains index.html - incomplete build',
          'error',
          'Run proper build process to generate all necessary files'
        );
        
        this.addFix(`
The admin-app build directory exists but only contains index.html.
This suggests the build process is not generating the required JavaScript/CSS bundles.

Solution:
1. cd static/admin-app
2. npm install
3. npm run build
        `);
      } else if (files.length === 0) {
        this.addIssue(
          'Build directory is empty',
          'error',
          'Run build process for admin-app'
        );
      } else {
        this.log(`✅ Build directory contains ${files.length} files`, 'success');
      }
    }
  }

  // Generate comprehensive report
  generateReport() {
    this.log('\n' + '='.repeat(80), 'info');
    this.log('🎯 FORGE DEPLOYMENT DIAGNOSTIC REPORT', 'info');
    this.log('='.repeat(80), 'info');
    
    console.log(`\n📊 SUMMARY:`);
    console.log(`   - Total Issues Found: ${this.issues.length}`);
    console.log(`   - Critical Errors: ${this.issues.filter(i => i.severity === 'error').length}`);
    console.log(`   - Warnings: ${this.issues.filter(i => i.severity === 'warning').length}`);
    console.log(`   - Fixes Available: ${this.fixes.length}`);
    
    if (this.issues.length > 0) {
      console.log(`\n🚨 ISSUES FOUND:`);
      this.issues.forEach((issue, index) => {
        console.log(`\n${index + 1}. [${issue.severity.toUpperCase()}] ${issue.description}`);
        if (issue.solution) {
          console.log(`   💡 Solution: ${issue.solution}`);
        }
      });
    }
    
    if (this.fixes.length > 0) {
      console.log(`\n🔧 DETAILED FIXES:`);
      this.fixes.forEach((fix, index) => {
        console.log(`\n${index + 1}. ${fix}`);
      });
    }
    
    console.log(`\n📋 RECOMMENDED ACTION PLAN:`);
    console.log(`1. Update Forge CLI: npm install -g @forge/cli@latest`);
    console.log(`2. Fix manifest.yml structure (move function modules)`);
    console.log(`3. Install missing dependencies: npm install @forge/resolver`);
    console.log(`4. Build frontend applications properly`);
    console.log(`5. Run forge lint --fix to auto-fix linting issues`);
    console.log(`6. Run forge deploy --no-verify to test deployment`);
    
    console.log(`\n` + '='.repeat(80));
  }

  // Run all diagnostics
  async runDiagnostics() {
    this.log('🚀 Starting Forge Deployment Diagnostic...', 'info');
    
    this.checkManifestStructure();
    this.checkPackageJson();
    this.checkFrontendApps();
    this.checkResolverFiles();
    this.checkForgeEnvironment();
    this.checkFilePermissions();
    this.analyzeBundlingError();
    
    this.generateReport();
    
    return {
      issues: this.issues,
      fixes: this.fixes,
      totalIssues: this.issues.length,
      criticalErrors: this.issues.filter(i => i.severity === 'error').length
    };
  }
}

// Run diagnostics if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const diagnostic = new ForgeDeploymentDiagnostic();
  diagnostic.runDiagnostics();
}

export default ForgeDeploymentDiagnostic;