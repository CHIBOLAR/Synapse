/**
 * 🚀 SYNAPSE - Quick Setup for Testing Phase
 */

import CredentialsSetup from '../src/utils/setupCredentials.js';

async function initializeForTesting() {
  console.log('🔧 Initializing Synapse for E2E Testing...');
  
  try {
    const setup = new CredentialsSetup();
    const result = await setup.initializeCredentials();
    console.log('✅ Setup completed');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
  }
}

initializeForTesting();
