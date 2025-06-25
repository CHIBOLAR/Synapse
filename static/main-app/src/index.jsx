import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

/**
 * 🚀 SYNAPSE - React Application Entry Point
 * 
 * Main entry point for the Synapse React application
 * Designed for Atlassian Forge platform integration
 */

// Initialize React root
const root = ReactDOM.createRoot(document.getElementById('root'));

// Render main application
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Basic performance monitoring
if (process.env.NODE_ENV === 'development') {
  console.log('Synapse app loaded in development mode');
}