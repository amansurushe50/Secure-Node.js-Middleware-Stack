// app.js - Main application entry point
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const cors = require('cors');

// Import custom middleware
const rateLimiter = require('./middleware/rateLimiter');
const ipBlacklist = require('./middleware/ipBlacklist');
const sanitizer = require('./middleware/sanitizer');

// Import routes
const publicRoutes = require('./routes/public');
const protectedRoutes = require('./routes/protected');
const adminRoutes = require('./routes/admin');

// Import utilities
const logger = require('./utils/logger');
const { errorResponse } = require('./utils/responseHelper');

const app = express();
const PORT = process.env.PORT || 60005;

// Basic middleware setup
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? 'https://yourdomain.com' : 'http://localhost:3000',
  credentials: true
}));

// Security headers with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false // Disable for development
}));

// Custom security middleware (ORDER MATTERS!)
app.use(ipBlacklist);           // 1. Block blacklisted IPs first
app.use(rateLimiter);           // 2. Apply rate limiting
app.use(sanitizer);             // 3. Sanitize all inputs

// Logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path} - IP: ${req.ip}`);
  next();
});

// Routes
app.use('/api/public', publicRoutes);
app.use('/api', protectedRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json(errorResponse('Route not found', 404));
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`, err);
  
  // CSRF error
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json(errorResponse('Invalid CSRF token', 403));
  }
  
  // Rate limit error
  if (err.status === 429) {
    return res.status(429).json(errorResponse('Too many requests', 429));
  }
  
  // Default error response
  const status = err.status || 500;
  const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message;
  
  res.status(status).json(errorResponse(message, status));
});

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;