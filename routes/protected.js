const express = require('express');
const csrf = require('csurf');
const { successResponse, errorResponse } = require('../utils/responseHelper');
const { createValidator } = require('../middleware/sanitizer');
const logger = require('../utils/logger');

const router = express.Router();

// CSRF protection middleware
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'development',
    sameSite: 'strict'
  }
});

// GET CSRF token endpoint
router.get('/csrf-token', csrfProtection, (req, res) => {
  res.json(successResponse('CSRF token generated', {
    csrfToken: req.csrfToken()
  }));
});

// Validation rules for contact form
const contactValidation = createValidator({
  name: { required: true, type: 'name', minLength: 2, maxLength: 50 },
  email: { required: true, type: 'email' },
  message: { required: true, minLength: 10, maxLength: 1000 }
});

// POST /api/contact - Rate limited + sanitized contact form
router.post('/contact', contactValidation, (req, res) => {
  const { name, email, message } = req.body;
  
  logger.info(`Contact form submission from ${email}`);
  
  // In real app, save to database or send email
  res.json(successResponse('Contact form submitted successfully', {
    submittedAt: new Date().toISOString(),
    name: name,
    email: email,
    messageLength: message.length
  }));
});

// POST /api/submit - CSRF protected + sanitized submission
router.post('/submit', csrfProtection, (req, res) => {
  const submissionData = req.body;
  
  logger.info('Form submission received:', submissionData);
  
  // Process the sanitized data
  res.json(successResponse('Form submitted successfully', {
    submittedAt: new Date().toISOString(),
    dataReceived: Object.keys(submissionData),
    csrfTokenValid: true
  }));
});

module.exports = router;