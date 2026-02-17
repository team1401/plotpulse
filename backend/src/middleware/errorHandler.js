/**
 * Centralized error handling middleware
 */

export class AppError extends Error {
  constructor(message, statusCode, code = null, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class RefusalError extends AppError {
  constructor(message = 'AI declined to generate content') {
    super(message, 422, 'CONTENT_REFUSAL');
  }
}

export class QuotaError extends AppError {
  constructor(message = 'API quota exceeded') {
    super(message, 429, 'QUOTA_EXCEEDED');
  }
}

export class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Not found', path: req.path });
}

export function errorHandler(err, req, res, next) {
  console.error('[Error]', {
    message: err.message,
    code: err.code,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
  
  // Handle operational errors (expected errors)
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      details: err.details
    });
  }
  
  // Handle specific error types
  if (err.name === 'SqliteError') {
    // Database errors
    if (err.code === 'SQLITE_CONSTRAINT') {
      return res.status(409).json({
        error: 'Database constraint violation',
        code: 'CONSTRAINT_VIOLATION'
      });
    }
    
    if (err.code === 'SQLITE_BUSY') {
      return res.status(503).json({
        error: 'Database is busy, please try again',
        code: 'DATABASE_BUSY'
      });
    }
  }
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: err.details
    });
  }
  
  // Handle Anthropic/OpenAI SDK errors
  if (err.status) {
    if (err.status === 429) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        code: 'RATE_LIMIT',
        message: 'Too many requests to AI provider. Please try again later.'
      });
    }
    
    if (err.status === 401 || err.status === 403) {
      return res.status(401).json({
        error: 'Invalid AI provider API key',
        code: 'INVALID_API_KEY',
        message: 'Your AI provider API key is invalid or expired.'
      });
    }
    
    if (err.status >= 500) {
      return res.status(503).json({
        error: 'AI provider service unavailable',
        code: 'AI_SERVICE_ERROR',
        message: 'The AI provider is experiencing issues. Please try again later.'
      });
    }
  }
  
  // Generic error (don't leak internals in production)
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(500).json({
    error: isDevelopment ? err.message : 'Internal server error',
    code: 'INTERNAL_ERROR',
    stack: isDevelopment ? err.stack : undefined
  });
}
