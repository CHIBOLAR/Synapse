// Synapse Admin Panel - Main Component
import React, { useState, useEffect } from 'react';
import { invoke } from '@forge/bridge';

function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [systemStatus, setSystemStatus] = useState(null);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      setLoading(true);
      const result = await invoke('verifyAdmin');
      setIsAdmin(result.isAdmin);
      
      if (result.isAdmin) {
        await loadSystemStatus();
      } else {
        setError(result.error || 'Administrator access required');
      }
    } catch (err) {
      setError('Failed to verify admin access: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadSystemStatus = async () => {
    try {
      const status = await invoke('getSystemStatus');
      setSystemStatus(status);
    } catch (err) {
      console.error('Failed to load system status:', err);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <div style={styles.spinner}></div>
          <p>Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>
          <h2>🚫 Access Denied</h2>
          <p>{error}</p>
          <p>Only administrators can access this panel.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1>🔧 Synapse Admin Panel</h1>
        <p>AI Meeting Analysis - Administration</p>
      </header>

      <div style={styles.grid}>
        <div style={styles.card}>
          <h3>System Status</h3>
          {systemStatus ? (
            <div>
              <p><strong>Status:</strong> {systemStatus.healthy ? '✅ Healthy' : '❌ Issues'}</p>
              <p><strong>Version:</strong> {systemStatus.version || '1.0.0'}</p>
              <p><strong>Uptime:</strong> {systemStatus.uptime || 'Unknown'}</p>
            </div>
          ) : (
            <p>Loading system status...</p>
          )}
        </div>

        <div style={styles.card}>
          <h3>API Keys</h3>
          <p>Manage Claude API keys and external integrations</p>
          <button style={styles.button} onClick={() => alert('API Key management coming soon')}>
            Manage Keys
          </button>
        </div>

        <div style={styles.card}>
          <h3>Usage Metrics</h3>
          <p>Monitor application usage and performance</p>
          <button style={styles.button} onClick={() => alert('Usage metrics coming soon')}>
            View Metrics
          </button>
        </div>

        <div style={styles.card}>
          <h3>Audit Log</h3>
          <p>Security events and user activity</p>
          <button style={styles.button} onClick={() => alert('Audit log coming soon')}>
            View Logs
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    backgroundColor: '#f4f5f7',
    minHeight: '100vh'
  },
  header: {
    textAlign: 'center',
    marginBottom: '30px',
    padding: '20px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px'
  },
  card: {
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  button: {
    backgroundColor: '#0052cc',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '4px',
    cursor: 'pointer',
    marginTop: '10px'
  },
  loading: {
    textAlign: 'center',
    padding: '50px'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #0052cc',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 20px'
  },
  error: {
    textAlign: 'center',
    padding: '50px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    margin: '50px auto',
    maxWidth: '500px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  }
};

// Add spinner animation
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);

export default App;
