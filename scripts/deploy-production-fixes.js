#!/usr/bin/env node

/**
 * 🚀 SYNAPSE PRODUCTION DEPLOYMENT FIXES
 * 
 * This script applies all the necessary fixes for production deployment
 * and then deploys the application to Forge.
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';

const log = (message) => {
  console.log(`🔧 ${new Date().toISOString()} - ${message}`);
};

const error = (message) => {
  console.error(`❌ ${new Date().toISOString()} - ${message}`);
};

const success = (message) => {
  console.log(`✅ ${new Date().toISOString()} - ${message}`);
};

async function applyProductionFixes() {
  log('Starting Synapse production deployment fixes...');

  try {
    // Step 1: Build frontend with proper React bundling
    log('Building frontend with bundled React...');
    process.chdir('./static/main-app');
    
    // Ensure React is properly installed
    log('Installing React dependencies...');
    execSync('npm install react@18 react-dom@18', { stdio: 'inherit' });
    
    // Build the application
    log('Building React application...');
    execSync('npm run build', { stdio: 'inherit' });
    
    process.chdir('../../');
    success('Frontend build completed');

    // Step 2: Verify manifest configuration
    log('Verifying manifest configuration...');
    const manifestPath = './manifest.yml';
    const manifestContent = readFileSync(manifestPath, 'utf8');
    
    // Check for required configurations
    const requiredConfigs = [
      'handler: mainHandler',
      'path: static/main-app/build',
      'write:jira-work',
      '*.cloudfront.net',
      'api.anthropic.com'
    ];
    
    const missingConfigs = requiredConfigs.filter(config => 
      !manifestContent.includes(config)
    );
    
    if (missingConfigs.length > 0) {
      error(`Missing configurations in manifest: ${missingConfigs.join(', ')}`);
      error('Please apply the manifest fixes from the solution document');
      process.exit(1);
    }
    
    success('Manifest configuration verified');

    // Step 3: Validate resolver exports
    log('Validating resolver exports...');
    const resolversPath = './src/resolvers.js';
    const resolversContent = readFileSync(resolversPath, 'utf8');
    
    const requiredResolvers = [
      'getUserContext',
      'getUserConfig', 
      'checkAdminPermissions'
    ];
    
    const missingResolvers = requiredResolvers.filter(resolver =>
      !resolversContent.includes(`'${resolver}'`)
    );
    
    if (missingResolvers.length > 0) {
      error(`Missing resolvers: ${missingResolvers.join(', ')}`);
      error('Please add the missing resolver functions');
      process.exit(1);
    }
    
    success('Resolver functions validated');

    // Step 4: Deploy to Forge
    log('Deploying to Forge production environment...');
    execSync('forge deploy --environment production', { stdio: 'inherit' });
    success('Deployment completed successfully');

    // Step 5: Verify deployment
    log('Verifying deployment status...');
    execSync('forge status', { stdio: 'inherit' });
    
    success('🎉 Production deployment fixes applied successfully!');
    log('');
    log('Next steps:');
    log('1. Test the application in your Jira instance');
    log('2. Monitor logs with: forge logs --tail');
    log('3. Verify no console errors in browser');
    log('4. Test meeting analysis functionality');
    log('');
    log('If you encounter any issues, check the solution document for troubleshooting.');

  } catch (error) {
    error(`Deployment failed: ${error.message}`);
    log('');
    log('Troubleshooting steps:');
    log('1. Check forge CLI is installed and authenticated');
    log('2. Verify all manifest fixes are applied');
    log('3. Ensure Node.js 22.x is installed');
    log('4. Check network connectivity');
    process.exit(1);
  }
}

// Run the deployment fixes
applyProductionFixes().catch(console.error);
