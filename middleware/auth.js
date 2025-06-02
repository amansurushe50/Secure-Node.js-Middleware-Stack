const { errorResponse } = require('../utils/responseHelper');
const logger = require('../utils/logger');

// Simple API key for admin access (in production, use JWT or OAuth)
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || 'admin-secret-key-2024';

/**
 * Admin authentication middleware
 * Checks for valid API key in Authorization header
 */
const requireAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json(errorResponse('Authorization header required', 401));
  }
  
  // Expected format: "Bearer your-api-key"
  const token = authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json(errorResponse('Invalid authorization format', 401));
  }
  
  if (token !== ADMIN_API_KEY) {
    logger.warn(`Invalid admin API key attempt from IP: ${req.ip}`);
    return res.status(403).json(errorResponse('Invalid API key', 403));
  }
  
  // Add admin flag to request object
  req.isAdmin = true;
  logger.info(`Admin access granted to IP: ${req.ip}`);
  
  next();
};

/**
 * Optional: Basic rate limiting for admin routes
 */
const adminRateLimit = (() => {
  const adminRequests = new Map();
  const ADMIN_RATE_LIMIT = 50; // requests per hour
  const ADMIN_WINDOW = 60 * 60 * 1000; // 1 hour in ms
  
  return (req, res, next) => {
    const ip = req.ip;
    const now = Date.now();
    const windowStart = now - ADMIN_WINDOW;
    
    let ipData = adminRequests.get(ip) || [];
    ipData = ipData.filter(timestamp => timestamp > windowStart);
    
    if (ipData.length >= ADMIN_RATE_LIMIT) {
      return res.status(429).json(errorResponse('Admin rate limit exceeded', 429));
    }
    
    ipData.push(now);
    adminRequests.set(ip, ipData);
    next();
  };
})();

module.exports = {
  requireAdmin,
  adminRateLimit
};