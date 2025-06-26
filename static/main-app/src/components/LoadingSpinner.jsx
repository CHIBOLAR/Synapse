/**
 * 🔄 ENHANCED LOADING SPINNER
 * 
 * Loading component with error detection and logging
 */

import React, { useEffect, useState } from 'react';
import frontendLogger from '../utils/frontendLogger';

const LoadingSpinner = ({ 
  size = 'medium', 
  message = 'Loading...', 
  timeout = 30000,
  onTimeout = null 
}) => {
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const [loadingTime, setLoadingTime] = useState(0);

  useEffect(() => {
    frontendLogger.component('🔄 LoadingSpinner mounted', {
      size,
      message,
      timeout
    });

    const startTime = Date.now();
    
    // Update loading time every second
    const timeInterval = setInterval(() => {
      setLoadingTime(Date.now() - startTime);
    }, 1000);

    // Timeout handler
    const timeoutId = setTimeout(() => {
      setHasTimedOut(true);
      frontendLogger.error('⏰ Loading timeout exceeded', {
        component: 'LoadingSpinner',
        message,
        timeout,
        actualLoadingTime: Date.now() - startTime
      });
      
      if (onTimeout) {
        onTimeout();
      }
    }, timeout);

    return () => {
      clearInterval(timeInterval);
      clearTimeout(timeoutId);
      
      const totalTime = Date.now() - startTime;
      frontendLogger.performance('LoadingSpinner unmounted', {
        totalLoadingTime: totalTime,
        hasTimedOut,
        message
      });
    };
  }, [size, message, timeout, onTimeout, hasTimedOut]);

  if (hasTimedOut) {
    return (
      <div className={`loading-spinner loading-timeout ${size}`}>
        <div className="timeout-content">
          <div className="timeout-icon">⏰</div>
          <h3>Loading Timeout</h3>
          <p>Loading took longer than expected ({timeout / 1000}s)</p>
          <p>Loading time: {Math.round(loadingTime / 1000)}s</p>
          <button 
            onClick={() => {
              frontendLogger.component('🔄 Loading retry requested');
              window.location.reload();
            }}
            className="retry-button"
          >
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`loading-spinner ${size}`}>
      <div className="spinner-container">
        <div className="spinner">
          <div className="spinner-inner">
            <div className="spinner-circle"></div>
            <div className="spinner-circle"></div>
            <div className="spinner-circle"></div>
          </div>
        </div>
        
        <div className="loading-content">
          <h3>{message}</h3>
          <div className="loading-details">
            <p>Time: {Math.round(loadingTime / 1000)}s</p>
            <div className="loading-progress">
              <div 
                className="loading-progress-bar"
                style={{ 
                  width: `${Math.min((loadingTime / timeout) * 100, 100)}%` 
                }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .loading-spinner {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px;
          text-align: center;
        }

        .loading-spinner.small {
          padding: 20px;
        }

        .loading-spinner.large {
          padding: 60px;
          min-height: 300px;
        }

        .spinner-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
        }

        .spinner {
          position: relative;
          width: 60px;
          height: 60px;
        }

        .loading-spinner.small .spinner {
          width: 40px;
          height: 40px;
        }

        .loading-spinner.large .spinner {
          width: 80px;
          height: 80px;
        }

        .spinner-inner {
          position: relative;
          width: 100%;
          height: 100%;
          animation: spin 2s linear infinite;
        }

        .spinner-circle {
          position: absolute;
          border: 3px solid #e1e8ed;
          border-radius: 50%;
          animation: pulse 1.5s ease-in-out infinite;
        }

        .spinner-circle:nth-child(1) {
          width: 100%;
          height: 100%;
          border-top-color: #6c5ce7;
          animation-delay: 0s;
        }

        .spinner-circle:nth-child(2) {
          width: 70%;
          height: 70%;
          top: 15%;
          left: 15%;
          border-top-color: #74b9ff;
          animation-delay: 0.3s;
        }

        .spinner-circle:nth-child(3) {
          width: 40%;
          height: 40%;
          top: 30%;
          left: 30%;
          border-top-color: #00cec9;
          animation-delay: 0.6s;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(0.95); }
        }

        .loading-content h3 {
          margin: 0;
          font-size: 18px;
          color: #2d3436;
          font-weight: 500;
        }

        .loading-spinner.small .loading-content h3 {
          font-size: 14px;
        }

        .loading-spinner.large .loading-content h3 {
          font-size: 24px;
        }

        .loading-details {
          margin-top: 15px;
          color: #636e72;
          font-size: 14px;
        }

        .loading-progress {
          width: 200px;
          height: 4px;
          background: #e1e8ed;
          border-radius: 2px;
          margin: 10px auto;
          overflow: hidden;
        }

        .loading-progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #6c5ce7, #74b9ff);
          border-radius: 2px;
          transition: width 1s ease;
        }

        .loading-timeout {
          background: #fff5f5;
          border: 2px solid #ff6b6b;
          border-radius: 12px;
          padding: 30px;
          text-align: center;
        }

        .timeout-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 15px;
        }

        .timeout-icon {
          font-size: 48px;
          animation: bounce 2s infinite;
        }

        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-10px); }
          60% { transform: translateY(-5px); }
        }

        .timeout-content h3 {
          color: #d63031;
          margin: 0;
          font-size: 20px;
        }

        .timeout-content p {
          color: #636e72;
          margin: 5px 0;
        }

        .retry-button {
          background: #6c5ce7;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
        }

        .retry-button:hover {
          background: #5f3dc4;
          transform: translateY(-1px);
        }
      `}</style>
    </div>
  );
};

export default LoadingSpinner;