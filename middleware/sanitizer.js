// middleware/sanitizer.js - Input Sanitization Middleware
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const logger = require('../utils/logger');

/**
 * Custom NoSQL injection sanitizer
 * Removes dangerous characters and operators from input
 */
const customMongoSanitize = (payload) => {
  if (payload && typeof payload === 'object') {
    for (const key in payload) {
      if (payload.hasOwnProperty(key)) {
        // Remove keys starting with $ (MongoDB operators)
        if (key.startsWith('$')) {
          delete payload[key];
          continue;
        }
        
        // Remove keys containing dots (can access nested properties)
        if (key.includes('.')) {
          delete payload[key];
          continue;
        }
        
        // Recursively sanitize nested objects
        if (typeof payload[key] === 'object' && payload[key] !== null) {
          payload[key] = customMongoSanitize(payload[key]);
        }
        
        // Sanitize string values
        if (typeof payload[key] === 'string') {
          payload[key] = sanitizeString(payload[key]);
        }
      }
    }
  }
  return payload;
};

/**
 * Custom XSS sanitizer for strings
 * Removes/encodes dangerous HTML and JavaScript
 */
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  
  // Remove script tags and event handlers
  str = str.replace(/<script[^>]*>.*?<\/script>/gi, '');
  str = str.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  str = str.replace(/javascript:/gi, '');
  
  // Encode HTML entities
  str = str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
  
  return str;
};

/**
 * Deep sanitization function
 * Recursively sanitizes all nested objects and arrays
 */
const deepSanitize = (obj) => {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => deepSanitize(item));
  }
  
  if (typeof obj === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      // Sanitize the key itself
      const cleanKey = sanitizeString(key);
      
      // Skip dangerous keys
      if (cleanKey.startsWith('$') || cleanKey.includes('.') || cleanKey !== key) {
        logger.warn(`Removed dangerous key: ${key}`);
        continue;
      }
      
      // Recursively sanitize the value
      sanitized[cleanKey] = deepSanitize(value);
    }
    return sanitized;
  }
  
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  return obj;
};

/**
 * Main sanitization middleware
 */
const sanitizer = (req, res, next) => {
  try {
    // Log original request for debugging (in development)
    if (process.env.NODE_ENV === 'development') {
      logger.debug('Original request body:', JSON.stringify(req.body, null, 2));
    }
    
    // Sanitize request body
    if (req.body && Object.keys(req.body).length > 0) {
      req.body = deepSanitize(req.body);
    }
    
    // Sanitize query parameters
    if (req.query && Object.keys(req.query).length > 0) {
      req.query = deepSanitize(req.query);
    }
    
    // Sanitize URL parameters
    if (req.params && Object.keys(req.params).length > 0) {
      req.params = deepSanitize(req.params);
    }
    
    // Sanitize specific headers (if needed)
    const headersToSanitize = ['user-agent', 'referer', 'x-forwarded-for'];
    headersToSanitize.forEach(header => {
      if (req.headers[header]) {
        req.headers[header] = sanitizeString(req.headers[header]);
      }
    });
    
    // Log sanitized request for debugging (in development)
    if (process.env.NODE_ENV === 'development') {
      logger.debug('Sanitized request body:', JSON.stringify(req.body, null, 2));
    }
    
    next();
  } catch (error) {
    logger.error('Error in sanitization middleware:', error);
    next(error);
  }
};

/**
 * Validation functions for common input types
 */
const validators = {
  email: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },
  
  phoneNumber: (phone) => {
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    return phoneRegex.test(phone);
  },
  
  alphanumeric: (str) => {
    const alphanumericRegex = /^[a-zA-Z0-9]+$/;
    return alphanumericRegex.test(str);
  },
  
  name: (name) => {
    const nameRegex = /^[a-zA-Z\s]{2,50}$/;
    return nameRegex.test(name);
  }
};

/**
 * Input validation middleware factory
 * Creates middleware to validate specific fields
 */
const createValidator = (validationRules) => {
  return (req, res, next) => {
    const errors = [];
    
    for (const [field, rules] of Object.entries(validationRules)) {
      const value = req.body[field];
      
      if (rules.required && (!value || value.trim() === '')) {
        errors.push(`${field} is required`);
        continue;
      }
      
      if (value && rules.type && !validators[rules.type](value)) {
        errors.push(`${field} has invalid format`);
      }
      
      if (value && rules.minLength && value.length < rules.minLength) {
        errors.push(`${field} must be at least ${rules.minLength} characters`);
      }
      
      if (value && rules.maxLength && value.length > rules.maxLength) {
        errors.push(`${field} must be no more than ${rules.maxLength} characters`);
      }
    }
    
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors
      });
    }
    
    next();
  };
};

// Export middleware and utility functions
module.exports = sanitizer;
module.exports.deepSanitize = deepSanitize;
module.exports.sanitizeString = sanitizeString;
module.exports.validators = validators;
module.exports.createValidator = createValidator;

// Also export third-party sanitizers for use in routes
module.exports.mongoSanitize = mongoSanitize();
module.exports.xssClean = xss();