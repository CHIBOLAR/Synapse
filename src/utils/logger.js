/**
 * 🔍 SIMPLIFIED SYNAPSE LOGGER
 * 
 * Minimal logging system - focuses on essential information only
 */

// Simple log function
const log = (level, category, message, data = null) => {
  const timestamp = new Date().toISOString().substring(11, 19);
  const logLine = `[${timestamp}] ${level} ${category}: ${message}`;
  
  if (level === 'ERROR') {
    console.error(logLine, data || '');
  } else if (level === 'WARN') {
    console.warn(logLine, data || '');
  } else {
    console.log(logLine, data || '');
  }
};

// Essential logging functions only
export const logInfo = (category, message, data) => log('INFO', category, message, data);
export const logError = (category, message, data) => log('ERROR', category, message, data);
export const logWarn = (category, message, data) => log('WARN', category, message, data);

// Default export for compatibility
export default {
  info: logInfo,
  error: logError,
  warn: logWarn
};
