import React, { useState, useEffect, useCallback } from 'react';
import { invoke } from '@forge/bridge';
import LoadingSpinner from './LoadingSpinner';

/**
 * ⚙️ Admin Panel Component
 * 
 * Administrative interface for Synapse configuration
 * Manages API keys, settings, and system monitoring
 * Available only to administrators
 */

const AdminPanel = ({ userConfig, setUserConfig, addNotification, updatePerformanceMetrics }) => {
  const [loading, setLoading] = useState(true);
  const [adminData, setAdminData] = useState(null);
  const [activeTab, setActiveTab] = useState('settings');
  const [saving, setSaving] = useState(false);

  // Load admin data on component mount
  useEffect(() => {
    loadAdminData();
  }, []);

  /**
   * Load administrative data
   */
  const loadAdminData = useCallback(async () => {
    try {
      setLoading(true);
      
      const [settings, metrics, users] = await Promise.all([
        invoke('getAdminSettings'),
        invoke('getSystemMetrics'),
        invoke('getUserMetrics')
      ]);

      setAdminData({
        settings,
        metrics,
        users
      });

    } catch (error) {
      console.error('Failed to load admin data:', error);
      addNotification('Failed to load admin data', 'error');
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  /**
   * Save admin settings
   */
  const handleSaveSettings = useCallback(async (newSettings) => {
    try {
      setSaving(true);
      
      const saveResponse = await invoke('saveAdminSettings', newSettings);
      
      if (saveResponse.success) {
        setAdminData(prev => ({
          ...prev,
          settings: newSettings
        }));
        
        addNotification('Settings saved successfully', 'success');
      } else {
        throw new Error(saveResponse.error || 'Failed to save settings');
      }

    } catch (error) {
      console.error('Failed to save settings:', error);
      addNotification(`Failed to save settings: ${error.message}`, 'error');
    } finally {
      setSaving(false);
    }
  }, [addNotification]);

  if (loading) {
    return (
      <div className="admin-panel loading">
        <LoadingSpinner size="large" message="Loading admin panel..." />
      </div>
    );
  }

  return (
    <div className="admin-panel">
      {/* Admin Header */}
      <div className="admin-header">
        <h2>⚙️ Admin Panel</h2>
        <p>System configuration and monitoring for Synapse</p>
      </div>

      {/* Admin Navigation */}
      <nav className="admin-nav">
        <button
          className={`admin-nav-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          🔧 Settings
        </button>
        <button
          className={`admin-nav-btn ${activeTab === 'metrics' ? 'active' : ''}`}
          onClick={() => setActiveTab('metrics')}
        >
          📊 Metrics
        </button>
        <button
          className={`admin-nav-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          👥 Users
        </button>
      </nav>

      {/* Admin Content */}
      <div className="admin-content">
        {activeTab === 'settings' && (
          <SettingsPanel
            settings={adminData?.settings}
            onSave={handleSaveSettings}
            saving={saving}
          />
        )}

        {activeTab === 'metrics' && (
          <MetricsPanel
            metrics={adminData?.metrics}
            onRefresh={loadAdminData}
          />
        )}

        {activeTab === 'users' && (
          <UsersPanel
            users={adminData?.users}
            onRefresh={loadAdminData}
          />
        )}
      </div>
    </div>
  );
};
/**
 * Settings Panel - Admin configuration
 */
const SettingsPanel = ({ settings, onSave, saving }) => {
  const [formData, setFormData] = useState(settings || {});

  useEffect(() => {
    setFormData(settings || {});
  }, [settings]);

  const handleInputChange = (key, value) => {
    setFormData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="settings-panel">
      <h3>🔧 System Settings</h3>
      
      <form onSubmit={handleSubmit} className="settings-form">
        <div className="form-section">
          <h4>Claude Sonnet 4 Configuration</h4>
          
          <div className="form-group">
            <label htmlFor="claudeApiKey">API Key:</label>
            <input
              type="password"
              id="claudeApiKey"
              value={formData.claudeApiKey || ''}
              onChange={(e) => handleInputChange('claudeApiKey', e.target.value)}
              placeholder="sk-ant-..."
            />
          </div>

          <div className="form-group">
            <label htmlFor="maxTokens">Max Tokens per Request:</label>
            <input
              type="number"
              id="maxTokens"
              value={formData.maxTokens || 4000}
              onChange={(e) => handleInputChange('maxTokens', parseInt(e.target.value))}
              min="1000"
              max="8000"
            />
          </div>

          <div className="form-group">
            <label htmlFor="temperature">Analysis Temperature:</label>
            <input
              type="number"
              id="temperature"
              value={formData.temperature || 0.1}
              onChange={(e) => handleInputChange('temperature', parseFloat(e.target.value))}
              min="0"
              max="1"
              step="0.1"
            />
          </div>
        </div>

        <div className="form-section">
          <h4>Performance Settings</h4>
          
          <div className="form-group">
            <label htmlFor="maxConcurrentAnalyses">Max Concurrent Analyses:</label>
            <input
              type="number"
              id="maxConcurrentAnalyses"
              value={formData.maxConcurrentAnalyses || 5}
              onChange={(e) => handleInputChange('maxConcurrentAnalyses', parseInt(e.target.value))}
              min="1"
              max="20"
            />
          </div>

          <div className="form-group">
            <label htmlFor="analysisTimeout">Analysis Timeout (seconds):</label>
            <input
              type="number"
              id="analysisTimeout"
              value={formData.analysisTimeout || 120}
              onChange={(e) => handleInputChange('analysisTimeout', parseInt(e.target.value))}
              min="30"
              max="300"
            />
          </div>
        </div>

        <div className="form-actions">
          <button 
            type="submit" 
            className="save-btn primary-btn"
            disabled={saving}
          >
            {saving ? '⏳ Saving...' : '💾 Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
};

/**
 * Metrics Panel - System monitoring
 */
const MetricsPanel = ({ metrics, onRefresh }) => {
  return (
    <div className="metrics-panel">
      <div className="metrics-header">
        <h3>📊 System Metrics</h3>
        <button onClick={onRefresh} className="refresh-btn">
          🔄 Refresh
        </button>
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon">📈</div>
          <div className="metric-value">{metrics?.totalAnalyses || 0}</div>
          <div className="metric-label">Total Analyses</div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">⚡</div>
          <div className="metric-value">{metrics?.averageTime || 0}s</div>
          <div className="metric-label">Average Time</div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">🎯</div>
          <div className="metric-value">{metrics?.successRate || 0}%</div>
          <div className="metric-label">Success Rate</div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">👥</div>
          <div className="metric-value">{metrics?.activeUsers || 0}</div>
          <div className="metric-label">Active Users</div>
        </div>
      </div>

      {metrics?.recentErrors && metrics.recentErrors.length > 0 && (
        <div className="recent-errors">
          <h4>⚠️ Recent Errors</h4>
          <div className="error-list">
            {metrics.recentErrors.map((error, index) => (
              <div key={index} className="error-item">
                <span className="error-time">
                  {new Date(error.timestamp).toLocaleString()}
                </span>
                <span className="error-message">{error.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Users Panel - User management
 */
const UsersPanel = ({ users, onRefresh }) => {
  return (
    <div className="users-panel">
      <div className="users-header">
        <h3>👥 User Activity</h3>
        <button onClick={onRefresh} className="refresh-btn">
          🔄 Refresh
        </button>
      </div>

      <div className="users-table">
        <div className="table-header">
          <span>User</span>
          <span>Analyses</span>
          <span>Last Active</span>
          <span>Status</span>
        </div>

        {users && users.length > 0 ? (
          users.map((user, index) => (
            <div key={index} className="table-row">
              <span className="user-name">{user.displayName}</span>
              <span className="user-analyses">{user.totalAnalyses}</span>
              <span className="user-last-active">
                {user.lastActive ? new Date(user.lastActive).toLocaleDateString() : 'Never'}
              </span>
              <span className={`user-status ${user.isActive ? 'active' : 'inactive'}`}>
                {user.isActive ? '🟢 Active' : '⚪ Inactive'}
              </span>
            </div>
          ))
        ) : (
          <div className="no-users">
            <p>No user data available</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;