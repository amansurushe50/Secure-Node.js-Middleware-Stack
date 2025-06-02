// middleware/rateLimiter.js - Custom Rate Limiting Middleware
const logger = require('../utils/logger');
const { errorResponse } = require('../utils/responseHelper');

// In-memory store for rate limiting
// Structure: { ip: { count: number, resetTime: timestamp, requests: [timestamps] } }
const rateStore = new Map();

// Configuration
const RATE_LIMIT_CONFIG = {
  windowMs: 10 * 60 * 1000, // 1 minutes in milliseconds
  maxRequests: 1000,          // Max requests per window
  message: 'Too many requests from this IP, please try again later',
  skipSuccessfulRequests: false,
  skipFailedRequests: false
};

/**
 * Custom rate limiter middleware
 * Implements sliding window log algorithm for accurate rate limiting
 */
const rateLimiter = (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_CONFIG.windowMs;
  
  // Get or create rate limit data for this IP
  let clientData = rateStore.get(clientIP);
  
  if (!clientData) {
    clientData = {
      requests: [],
      count: 0,
      resetTime: now + RATE_LIMIT_CONFIG.windowMs
    };
    rateStore.set(clientIP, clientData);
  }
  
  // Remove old requests outside the current window (sliding window)
  clientData.requests = clientData.requests.filter(timestamp => timestamp > windowStart);
  clientData.count = clientData.requests.length;
  
  // Check if limit exceeded
  if (clientData.count >= RATE_LIMIT_CONFIG.maxRequests) {
    const resetTime = Math.ceil((windowStart + RATE_LIMIT_CONFIG.windowMs - now) / 1000);
    
    logger.warn(`Rate limit exceeded for IP: ${clientIP}`);
    
    // Set rate limit headers
    res.set({
      'X-RateLimit-Limit': RATE_LIMIT_CONFIG.maxRequests,
      'X-RateLimit-Remaining': 0,
      'X-RateLimit-Reset': new Date(windowStart + RATE_LIMIT_CONFIG.windowMs).toISOString(),
      'Retry-After': resetTime
    });
    
    return res.status(429).json(errorResponse(RATE_LIMIT_CONFIG.message, 429, {
      retryAfter: resetTime,
      limit: RATE_LIMIT_CONFIG.maxRequests,
      windowMs: RATE_LIMIT_CONFIG.windowMs
    }));
  }
  
  // Add current request timestamp
  clientData.requests.push(now);
  clientData.count = clientData.requests.length;
  
  // Set rate limit headers for successful requests
  const remaining = Math.max(0, RATE_LIMIT_CONFIG.maxRequests - clientData.count);
  res.set({
    'X-RateLimit-Limit': RATE_LIMIT_CONFIG.maxRequests,
    'X-RateLimit-Remaining': remaining,
    'X-RateLimit-Reset': new Date(windowStart + RATE_LIMIT_CONFIG.windowMs).toISOString()
  });
  
  // Clean up old entries periodically (every 100 requests)
  if (Math.random() < 0.01) {
    cleanupOldEntries();
  }
  
  next();
};

/**
 * Cleanup old entries from rate store to prevent memory leaks
 */
const cleanupOldEntries = () => {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_CONFIG.windowMs;
  
  let cleanedCount = 0;
  for (const [ip, data] of rateStore.entries()) {
    // Remove IPs with no recent requests
    if (data.requests.length === 0 || Math.max(...data.requests) < cutoff) {
      rateStore.delete(ip);
      cleanedCount++;
    }
  }
  
  if (cleanedCount > 0) {
    logger.info(`Cleaned up ${cleanedCount} old rate limit entries`);
  }
};

/**
 * Get current rate limit stats (for admin routes)
 */
const getRateLimitStats = () => {
  const stats = {
    totalIPs: rateStore.size,
    activeConnections: 0,
    topIPs: []
  };
  
  const ipStats = [];
  for (const [ip, data] of rateStore.entries()) {
    if (data.count > 0) {
      stats.activeConnections++;
      ipStats.push({ ip, count: data.count, lastRequest: Math.max(...data.requests) });
    }
  }
  
  // Sort by request count and get top 10
  stats.topIPs = ipStats
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map(item => ({
      ip: item.ip,
      requests: item.count,
      lastRequestTime: new Date(item.lastRequest).toISOString()
    }));
  
  return stats;
};

/**
 * Reset rate limit for specific IP (admin function)
 */
const resetRateLimit = (ip) => {
  const deleted = rateStore.delete(ip);
  logger.info(`Rate limit reset for IP: ${ip}, existed: ${deleted}`);
  return deleted;
};

module.exports = rateLimiter;
module.exports.getRateLimitStats = getRateLimitStats;
module.exports.resetRateLimit = resetRateLimit;
module.exports.RATE_LIMIT_CONFIG = RATE_LIMIT_CONFIG;