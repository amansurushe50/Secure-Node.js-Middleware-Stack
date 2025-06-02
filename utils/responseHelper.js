const successResponse = (message, data = null, statusCode = 200) => {
  const response = {
    success: true,
    message: message,
    timestamp: new Date().toISOString()
  };
  
  if (data !== null) {
    response.data = data;
  }
  
  return response;
};

/**
 * Error response helper
 */
const errorResponse = (message, statusCode = 500, details = null) => {
  const response = {
    success: false,
    message: message,
    statusCode: statusCode,
    timestamp: new Date().toISOString()
  };
  
  if (details !== null) {
    response.details = details;
  }
  
  // Don't expose sensitive information in production
  if (process.env.NODE_ENV === 'production') {
    delete response.details;
    if (statusCode >= 500) {
      response.message = 'Internal server error';
    }
  }
  
  return response;
};

/**
 * Validation error response helper
 */
const validationErrorResponse = (errors) => {
  return {
    success: false,
    message: 'Validation failed',
    errors: Array.isArray(errors) ? errors : [errors],
    timestamp: new Date().toISOString()
  };
};

/**
 * Pagination response helper
 */
const paginatedResponse = (message, data, page, limit, total) => {
  return {
    success: true,
    message: message,
    data: data,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: total,
      pages: Math.ceil(total / limit)
    },
    timestamp: new Date().toISOString()
  };
};

module.exports = {
  successResponse,
  errorResponse,
  validationErrorResponse,
  paginatedResponse
};