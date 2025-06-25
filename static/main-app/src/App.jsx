import React, { useState, useEffect } from 'react';
import { invoke } from '@forge/bridge';
import MeetingAnalyzer from './components/MeetingAnalyzer';
import AdminPanel from './components/AdminPanel';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingSpinner from './components/LoadingSpinner';
import './styles/App.css';

/**
 * 🧠 SYNAPSE - Main Application Component
 * 
 * Production-ready React app for Atlassian Forge platform
 * Integrates with Claude Sonnet 4 for meeting analysis
 * 
 * Features:
 * - Multi-tab interface (Analysis + Admin)
 * - Real-time processing status
 * - Enterprise security integration
 * - Error boundary protection
 * - Performance monitoring
 */

const App = () => {
  // 🏠 Application State
  const [activeTab, setActiveTab] = useState('analysis');
  const [isAdmin, setIsAdmin] = useState(false);
  const [appStatus, setAppStatus] = useState('loading');
  const [userConfig, setUserConfig] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [performanceMetrics, setPerformanceMetrics] = useState({});

  // 🔧 Initialize Application
  useEffect(() => {
    initializeApp();
  }, []);

  /**
   * Initialize application with user context and configuration
   */
  const initializeApp = async () => {
    try {
      setAppStatus('loading');
      
      // Get user context and permissions
      const [userContext, config, adminStatus] = await Promise.all([
        invoke('getUserContext'),
        invoke('getUserConfig'),
        invoke('checkAdminPermissions')
      ]);

      setUserConfig(config);
      setIsAdmin(adminStatus.isAdmin);
      setAppStatus('ready');

      // Log successful initialization
      console.log('Synapse initialized successfully', {
        userId: userContext.accountId,
        isAdmin: adminStatus.isAdmin,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Failed to initialize Synapse:', error);
      setAppStatus('error');
      addNotification('Failed to initialize application', 'error');
    }
  };

  /**
   * Add notification to user interface
   */
  const addNotification = (message, type = 'info', duration = 5000) => {
    const notification = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date().toISOString()
    };

    setNotifications(prev => [...prev, notification]);

    // Auto-remove notification after duration
    if (duration > 0) {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== notification.id));
      }, duration);
    }
  };

  /**
   * Remove notification manually
   */
  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  /**
   * Update performance metrics
   */
  const updatePerformanceMetrics = (metrics) => {
    setPerformanceMetrics(prev => ({
      ...prev,
      ...metrics,
      lastUpdated: new Date().toISOString()
    }));
  };

  /**
   * Handle tab switching
   */
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    
    // Track tab usage for analytics
    updatePerformanceMetrics({
      lastTabSwitch: tab,
      tabSwitchCount: (performanceMetrics.tabSwitchCount || 0) + 1
    });
  };

  // 🔄 Loading State
  if (appStatus === 'loading') {
    return (
      <div className="synapse-app synapse-loading">
        <LoadingSpinner size="large" />
        <p>Initializing Synapse AI Meeting Analysis...</p>
      </div>
    );
  }

  // ❌ Error State
  if (appStatus === 'error') {
    return (
      <div className="synapse-app synapse-error">
        <div className="error-container">
          <h2>🚨 Application Error</h2>
          <p>Failed to initialize Synapse. Please refresh the page or contact support.</p>
          <button 
            onClick={initializeApp}
            className="retry-button"
          >
            Retry Initialization
          </button>
        </div>
      </div>
    );
  }

  // 🎯 Main Application Render
  return (
    <ErrorBoundary>
      <div className="synapse-app">
        {/* 📋 Header Section */}
        <header className="synapse-header">
          <div className="header-content">
            <div className="logo-section">
              <h1>🧠 Synapse</h1>
              <span className="tagline">AI Meeting Analysis</span>
            </div>
            
            <div className="header-actions">
              <div className="performance-indicator">
                <span className="status-dot status-active"></span>
                <span>Claude Sonnet 4 Active</span>
              </div>
            </div>
          </div>
        </header>

        {/* 📑 Navigation Tabs */}
        <nav className="synapse-nav">
          <div className="nav-tabs">
            <button
              className={`nav-tab ${activeTab === 'analysis' ? 'active' : ''}`}
              onClick={() => handleTabChange('analysis')}
            >
              📊 Meeting Analysis
            </button>
            
            {isAdmin && (
              <button
                className={`nav-tab ${activeTab === 'admin' ? 'active' : ''}`}
                onClick={() => handleTabChange('admin')}
              >
                ⚙️ Admin Panel
              </button>
            )}
          </div>
        </nav>

        {/* 🔔 Notifications */}
        {notifications.length > 0 && (
          <div className="notifications-container">
            {notifications.map(notification => (
              <div 
                key={notification.id}
                className={`notification notification-${notification.type}`}
              >
                <span className="notification-message">{notification.message}</span>
                <button 
                  onClick={() => removeNotification(notification.id)}
                  className="notification-close"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 📱 Main Content Area */}
        <main className="synapse-main">
          {activeTab === 'analysis' && (
            <MeetingAnalyzer
              userConfig={userConfig}
              addNotification={addNotification}
              updatePerformanceMetrics={updatePerformanceMetrics}
              performanceMetrics={performanceMetrics}
            />
          )}

          {activeTab === 'admin' && isAdmin && (
            <AdminPanel
              userConfig={userConfig}
              setUserConfig={setUserConfig}
              addNotification={addNotification}
              updatePerformanceMetrics={updatePerformanceMetrics}
            />
          )}
        </main>

        {/* 📊 Footer Status */}
        <footer className="synapse-footer">
          <div className="footer-content">
            <div className="status-indicators">
              <span className="status-item">
                <span className="status-dot status-active"></span>
                System Operational
              </span>
              
              {performanceMetrics.lastAnalysis && (
                <span className="status-item">
                  Last Analysis: {new Date(performanceMetrics.lastAnalysis).toLocaleTimeString()}
                </span>
              )}
            </div>
            
            <div className="version-info">
              <span>Synapse v1.0 | Powered by Claude Sonnet 4</span>
            </div>
          </div>
        </footer>
      </div>
    </ErrorBoundary>
  );
};

export default App;