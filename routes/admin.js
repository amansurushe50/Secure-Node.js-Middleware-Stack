const express = require('express');
const { successResponse, errorResponse } = require('../utils/responseHelper');
const { requireAdmin } = require('../middleware/auth');
const { 
  addToBlacklist, 
  removeFromBlacklist, 
  getBlacklistStats 
} = require('../middleware/ipBlacklist');
const { 
  getRateLimitStats, 
  resetRateLimit 
} = require('../middleware/rateLimiter');
const logger = require('../utils/logger');

const router = express.Router();

// Apply admin authentication to all routes
router.use(requireAdmin);

// GET /api/admin/blacklist - View blacklisted IPs
router.get('/blacklist', (req, res) => {
  const stats = getBlacklistStats();
  res.json(successResponse('Blacklist retrieved', stats));
});

// POST /api/admin/blacklist - Add IP to blacklist
router.post('/blacklist', (req, res) => {
  const { ip } = req.body;
  
  if (!ip) {
    return res.status(400).json(errorResponse('IP address is required', 400));
  }
  
  try {
    const wasAdded = addToBlacklist(ip);
    const message = wasAdded ? 'IP added to blacklist' : 'IP already blacklisted';
    
    res.json(successResponse(message, {
      ip: ip,
      wasAdded: wasAdded,
      timestamp: new Date().toISOString()
    }));
  } catch (error) {
    res.status(400).json(errorResponse(error.message, 400));
  }
});

// DELETE /api/admin/blacklist/:ip - Remove IP from blacklist
router.delete('/blacklist/:ip', (req, res) => {
  const { ip } = req.params;
  
  try {
    const wasRemoved = removeFromBlacklist(ip);
    const message = wasRemoved ? 'IP removed from blacklist' : 'IP not found in blacklist';
    
    res.json(successResponse(message, {
      ip: ip,
      wasRemoved: wasRemoved,
      timestamp: new Date().toISOString()
    }));
  } catch (error) {
    res.status(400).json(errorResponse(error.message, 400));
  }
});

// GET /api/admin/rate-limit-status - View rate limiting stats
router.get('/rate-limit-status', (req, res) => {
  const stats = getRateLimitStats();
  res.json(successResponse('Rate limit stats retrieved', stats));
});

// POST /api/admin/rate-limit/reset/:ip - Reset rate limit for specific IP
router.post('/rate-limit/reset/:ip', (req, res) => {
  const { ip } = req.params;
  
  const wasReset = resetRateLimit(ip);
  const message = wasReset ? 'Rate limit reset for IP' : 'No rate limit data found for IP';
  
  res.json(successResponse(message, {
    ip: ip,
    wasReset: wasReset,
    timestamp: new Date().toISOString()
  }));
});

// GET /api/admin/stats - Overall system stats
router.get('/stats', (req, res) => {
  const blacklistStats = getBlacklistStats();
  const rateLimitStats = getRateLimitStats();
  
  res.json(successResponse('System statistics', {
    server: {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      nodeVersion: process.version,
      platform: process.platform
    },
    security: {
      blacklist: blacklistStats,
      rateLimit: rateLimitStats
    },
    timestamp: new Date().toISOString()
  }));
});

module.exports = router;