/**
 * 📊 Web Vitals Performance Reporting
 * 
 * Tracks Core Web Vitals for performance optimization
 * Integrates with browser performance APIs
 * Used for development monitoring and optimization
 */

const reportWebVitals = (onPerfEntry) => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(onPerfEntry);
      getFID(onPerfEntry);
      getFCP(onPerfEntry);
      getLCP(onPerfEntry);
      getTTFB(onPerfEntry);
    }).catch(() => {
      // Fallback for when web-vitals is not available
      console.log('Web Vitals not available, using fallback performance tracking');
      
      // Basic performance tracking
      if (performance && performance.now) {
        const loadTime = performance.now();
        onPerfEntry({
          name: 'load-time',
          value: loadTime,
          id: 'synapse-load'
        });
      }
    });
  }
};

export { reportWebVitals };