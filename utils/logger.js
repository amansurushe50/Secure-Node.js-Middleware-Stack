const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Simple logger with different levels
 */
class Logger {
  constructor() {
    this.logFile = path.join(logsDir, 'app.log');
    this.errorFile = path.join(logsDir, 'error.log');
  }
  
  formatMessage(level, message, meta = null) {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` | ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}\n`;
  }
  
  writeToFile(filename, content) {
    try {
      fs.appendFileSync(filename, content);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }
  
  info(message, meta = null) {
    const formatted = this.formatMessage('info', message, meta);
    console.log(`ℹ️  ${message}`, meta || '');
    this.writeToFile(this.logFile, formatted);
  }
  
  warn(message, meta = null) {
    const formatted = this.formatMessage('warn', message, meta);
    console.warn(`⚠️  ${message}`, meta || '');
    this.writeToFile(this.logFile, formatted);
  }
  
  error(message, meta = null) {
    const formatted = this.formatMessage('error', message, meta);
    console.error(`❌ ${message}`, meta || '');
    this.writeToFile(this.errorFile, formatted);
    this.writeToFile(this.logFile, formatted);
  }
  
  debug(message, meta = null) {
    if (process.env.NODE_ENV === 'development') {
      const formatted = this.formatMessage('debug', message, meta);
      console.debug(`🐛 ${message}`, meta || '');
      this.writeToFile(this.logFile, formatted);
    }
  }
}

module.exports = new Logger();