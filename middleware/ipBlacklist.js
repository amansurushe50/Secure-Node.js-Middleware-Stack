// middleware/ipBlacklist.js - IP Blacklisting Middleware
const logger = require('../utils/logger');
const { errorResponse } = require('../utils/responseHelper');

// In-memory blacklist storage
// In production, this would be stored in database or Redis
const blacklistedIPs = new Set([
  '192.168.1.100',  // Example banned IPs
  '10.0.0.5',
  '127.0.0.2'       // Example for testing (not localhost)
]);

// Whitelist for admin IPs (optional - for safety)
const whitelistedIPs = new Set([
  '127.0.0.1',      // localhost
  '::1',            // IPv6 localhost
  '::ffff:127.0.0.1' // IPv4-mapped IPv6 localhost
]);

/**
 * IP Blacklist middleware
 * Blocks requests from blacklisted IP addresses
 */
const ipBlacklist = (req, res, next) => {
  // Get client IP address
  const clientIP = getClientIP(req);
  
  // Check whitelist first (admin safety)
  if (whitelistedIPs.has(clientIP)) {
    return next();
  }
  
  // Check if IP is blacklisted
  if (blacklistedIPs.has(clientIP)) {
    logger.warn(`Blocked request from blacklisted IP: ${clientIP}`);
    
    // Return 403 Forbidden without revealing why
    return res.status(403).json(errorResponse('Access denied', 403));
  }
  
  // IP is not blacklisted, continue
  next();
};

/**
 * Extract client IP from request
 * Handles various proxy scenarios
 */
const getClientIP = (req) => {
  return (
    req.ip ||
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.connection?.socket?.remoteAddress ||
    '0.0.0.0'
  );
};

/**
 * Add IP to blacklist
 */
const addToBlacklist = (ip) => {
  if (!ip || typeof ip !== 'string') {
    throw new Error('Invalid IP address');
  }
  
  // Basic IP validation (simple regex)
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Regex = /^[0-9a-fA-F:]+$/;
  
  if (!ipv4Regex.test(ip) && !ipv6Regex.test(ip)) {
    throw new Error('Invalid IP address format');
  }
  
  // Don't allow blacklisting whitelisted IPs
  if (whitelistedIPs.has(ip)) {
    throw new Error('Cannot blacklist whitelisted IP');
  }
  
  const wasAdded = !blacklistedIPs.has(ip);
  blacklistedIPs.add(ip);
  
  logger.info(`IP ${ip} ${wasAdded ? 'added to' : 'already in'} blacklist`);
  return wasAdded;
};

/**
 * Remove IP from blacklist
 */
const removeFromBlacklist = (ip) => {
  if (!ip || typeof ip !== 'string') {
    throw new Error('Invalid IP address');
  }
  
  const wasRemoved = blacklistedIPs.delete(ip);
  logger.info(`IP ${ip} ${wasRemoved ? 'removed from' : 'not found in'} blacklist`);
  return wasRemoved;
};

/**
 * Get all blacklisted IPs
 */
const getBlacklistedIPs = () => {
  return Array.from(blacklistedIPs).sort();
};

/**
 * Check if IP is blacklisted
 */
const isBlacklisted = (ip) => {
  return blacklistedIPs.has(ip);
};

/**
 * Get blacklist statistics
 */
const getBlacklistStats = () => {
  return {
    totalBlacklisted: blacklistedIPs.size,
    blacklistedIPs: getBlacklistedIPs(),
    whitelistedIPs: Array.from(whitelistedIPs)
  };
};

/**
 * Clear all blacklisted IPs (admin function)
 */
const clearBlacklist = () => {
  const count = blacklistedIPs.size;
  blacklistedIPs.clear();
  logger.info(`Cleared ${count} IPs from blacklist`);
  return count;
};

module.exports = ipBlacklist;
module.exports.addToBlacklist = addToBlacklist;
module.exports.removeFromBlacklist = removeFromBlacklist;
module.exports.getBlacklistedIPs = getBlacklistedIPs;
module.exports.isBlacklisted = isBlacklisted;
module.exports.getBlacklistStats = getBlacklistStats;
module.exports.clearBlacklist = clearBlacklist;
module.exports.getClientIP = getClientIP;