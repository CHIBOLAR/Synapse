import React from 'react';

/**
 * ⏳ Loading Spinner Component
 * 
 * Reusable loading indicator with different sizes
 * Provides consistent loading experience across app
 */

const LoadingSpinner = ({ size = 'medium', message = null }) => {
  const sizeClasses = {
    small: 'spinner-small',
    medium: 'spinner-medium', 
    large: 'spinner-large'
  };

  return (
    <div className={`loading-spinner ${sizeClasses[size]}`}>
      <div className="spinner-container">
        <div className="spinner">
          <div className="spinner-circle"></div>
          <div className="spinner-circle"></div>
          <div className="spinner-circle"></div>
        </div>
        
        {message && (
          <p className="spinner-message">{message}</p>
        )}
      </div>
    </div>
  );
};

export default LoadingSpinner;