/**
 * 🧠 SYNAPSE AI MEETING ANALYSIS - USER INTERFACE
 * 
 * Version: 8.0.0 - Simplified User Interface (Admin Removed)
 * 
 * This is the simplified user interface without admin functionality.
 * Admin features are now in a separate admin app.
 */

import React, { useState, useEffect, Suspense } from 'react';
import { invoke } from '@forge/bridge';

// Lazy load components for better performance
const MeetingAnalyzer = React.lazy(() => import('./components/MeetingAnalyzer'));
const ErrorBoundary = React.lazy(() => import('./components/ErrorBoundary'));
const LoadingSpinner = React.lazy(() => import('./components/LoadingSpinner'));

function App() {
  // Simplified state management (no admin state)
  const [activeTab, setActiveTab] = useState('analyzer');
  const [userConfig, setUserConfig] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [analysisHistory, setAnalysisHistory] = useState([]);

  // Initialize user interface
  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      setLoading(true);
      console.log('🚀 Initializing Synapse user interface...');
      
      // Test connection
      const healthCheck = await invoke('healthCheck');
      if (!healthCheck.success) {
        throw new Error('Backend connection failed');
      }
      
      // Load user configuration
      await loadUserConfig();
      
      // Load analysis history
      await loadAnalysisHistory();      
      console.log('✅ User interface initialized successfully');
      addNotification('Application loaded successfully', 'success');
      
    } catch (error) {
      console.error('❌ Failed to initialize app:', error);
      setError(error.message);
      addNotification('Failed to initialize application', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadUserConfig = async () => {
    try {
      const config = await invoke('getUserConfig');
      setUserConfig(config || {});
    } catch (error) {
      console.error('Failed to load user config:', error);
      addNotification('Failed to load user configuration', 'warning');
    }
  };

  const loadAnalysisHistory = async () => {
    try {
      const history = await invoke('getAnalysisHistory');
      setAnalysisHistory(history || []);
    } catch (error) {
      console.error('Failed to load analysis history:', error);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    console.log(`🔄 Switched to ${tab} tab`);
  };

  const addNotification = (message, type = 'info') => {
    const notification = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date().toISOString()
    };
    setNotifications(prev => [...prev, notification]);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      removeNotification(notification.id);
    }, 5000);
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Show loading spinner
  if (loading) {
    return (
      <div className="app-container">
        <div className="loading-container">
          <Suspense fallback={<div>Loading...</div>}>
            <LoadingSpinner message="Initializing Synapse..." />
          </Suspense>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="app-container">
        <div className="error-container">
          <h2>❌ Application Error</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>
            🔄 Reload Application
          </button>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<div>Loading components...</div>}>
      <ErrorBoundary>
        <div className="app-container">
          {/* Header */}
          <header className="app-header">
            <h1>🧠 Synapse AI Meeting Analysis</h1>
            <p>Intelligent analysis for your Jira issues</p>
          </header>

          {/* Navigation - Simplified, no admin tab */}
          <nav className="app-nav">
            <div className="nav-tabs">
              <button
                className={`nav-tab ${activeTab === 'analyzer' ? 'active' : ''}`}
                onClick={() => handleTabChange('analyzer')}
              >
                🔍 Analyzer
              </button>
              
              <button
                className={`nav-tab ${activeTab === 'history' ? 'active' : ''}`}
                onClick={() => handleTabChange('history')}
              >
                📊 History
              </button>
            </div>
          </nav>

          {/* Notifications */}
          {notifications.length > 0 && (
            <div className="notifications-container">
              {notifications.map(notification => (
                <div 
                  key={notification.id}
                  className={`notification notification-${notification.type}`}
                >
                  <span className="notification-message">{notification.message}</span>
                  <button 
                    className="notification-close"
                    onClick={() => removeNotification(notification.id)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Main Content - No admin panel */}
          <main className="app-main">
            {activeTab === 'analyzer' && (
              <MeetingAnalyzer
                userConfig={userConfig}
                setUserConfig={setUserConfig}
                onAnalysisComplete={(analysis) => {
                  addNotification('Analysis completed successfully', 'success');
                  loadAnalysisHistory(); // Refresh history
                }}
                onError={(error) => {
                  addNotification(`Analysis error: ${error}`, 'error');
                }}
              />
            )}
            
            {activeTab === 'history' && (
              <div className="history-panel">
                <h2>📊 Analysis History</h2>
                {analysisHistory.length === 0 ? (
                  <p>No analysis history available</p>
                ) : (
                  <div className="history-list">
                    {analysisHistory.map((item, index) => (
                      <div key={index} className="history-item">
                        <div className="history-date">
                          {new Date(item.timestamp).toLocaleString()}
                        </div>
                        <div className="history-summary">
                          {item.summary || 'Analysis completed'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </main>

          {/* Footer */}
          <footer className="app-footer">
            <p>Synapse AI v8.0.0 - User Interface</p>
            <p>Admin functions available in Jira Settings → Apps → Synapse</p>
          </footer>
        </div>
      </ErrorBoundary>
    </Suspense>
  );
}

// Basic styles for the simplified app
const styles = `
  .app-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  }

  .app-header {
    text-align: center;
    margin-bottom: 30px;
    padding: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-radius: 10px;
  }

  .app-nav {
    margin-bottom: 20px;
  }

  .nav-tabs {
    display: flex;
    gap: 10px;
    border-bottom: 2px solid #e1e5e9;
  }

  .nav-tab {
    padding: 12px 24px;
    border: none;
    background: none;
    cursor: pointer;
    border-bottom: 3px solid transparent;
    font-weight: 500;
    transition: all 0.2s;
  }

  .nav-tab:hover {
    background-color: #f4f6f8;
  }

  .nav-tab.active {
    border-bottom-color: #0052cc;
    color: #0052cc;
    background-color: #f4f6f8;
  }

  .notifications-container {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 1000;
    max-width: 300px;
  }

  .notification {
    margin-bottom: 10px;
    padding: 12px;
    border-radius: 6px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }

  .notification-success {
    background-color: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
  }

  .notification-error {
    background-color: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
  }

  .notification-warning {
    background-color: #fff3cd;
    color: #856404;
    border: 1px solid #ffeaa7;
  }

  .notification-close {
    background: none;
    border: none;
    font-size: 18px;
    cursor: pointer;
    margin-left: 10px;
  }

  .app-main {
    min-height: 400px;
    padding: 20px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }

  .loading-container, .error-container {
    text-align: center;
    padding: 60px 20px;
  }

  .history-panel {
    padding: 20px;
  }

  .history-list {
    margin-top: 20px;
  }

  .history-item {
    padding: 15px;
    border: 1px solid #e1e5e9;
    border-radius: 6px;
    margin-bottom: 10px;
  }

  .history-date {
    font-size: 12px;
    color: #6b778c;
    margin-bottom: 5px;
  }

  .app-footer {
    text-align: center;
    margin-top: 30px;
    padding: 20px;
    color: #6b778c;
    font-size: 14px;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

export default App;
