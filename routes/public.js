const express = require('express');
const router = express.Router();
const { successResponse } = require('../utils/responseHelper');

// GET /api/public - Public endpoint accessible by anyone
router.get('/', (req, res) => {
  res.json(successResponse('Public endpoint accessed successfully', {
    timestamp: new Date().toISOString(),
    ip: req.ip,
    userAgent: req.get('User-Agent')
  }));
});

// GET /api/public/info - Another public endpoint
router.get('/info', (req, res) => {
  res.json(successResponse('Application information', {
    name: 'Security Middleware Demo',
    version: '1.0.0',
    endpoints: [
      'GET /api/public',
      'GET /api/public/info',
      'POST /api/submit',
      'POST /api/contact',
      'GET /api/admin/blacklist'
    ]
  }));
});

module.exports = router;