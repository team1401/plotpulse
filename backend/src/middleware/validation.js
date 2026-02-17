import { ValidationError } from './errorHandler.js';

/**
 * Validation schemas for different endpoints
 */

export const schemas = {
  createNovel: {
    title: {
      type: 'string',
      required: true,
      minLength: 1,
      maxLength: 200,
      trim: true
    },
    premise: {
      type: 'string',
      required: true,
      minLength: 10,
      maxLength: 10000,
      trim: true
    },
    mode: {
      type: 'string',
      required: true,
      enum: ['spark', 'blueprint']
    },
    target_word_count: {
      type: 'number',
      required: false,
      min: 10000,
      max: 200000,
      default: 70000
    },
    model_provider: {
      type: 'string',
      required: true,
      enum: ['anthropic', 'openai', 'ollama']
    },
    model_name: {
      type: 'string',
      required: true,
      maxLength: 100
    },
    temperature: {
      type: 'number',
      required: false,
      min: 0,
      max: 2,
      default: 0.7
    }
  },
  
  updateNovel: {
    title: {
      type: 'string',
      required: false,
      minLength: 1,
      maxLength: 200,
      trim: true
    },
    status: {
      type: 'string',
      required: false,
      enum: ['outlining', 'generating', 'partial', 'reviewing', 'complete', 'failed']
    },
    target_word_count: {
      type: 'number',
      required: false,
      min: 10000,
      max: 200000
    }
  },
  
  createUser: {
    email: {
      type: 'string',
      required: true,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      maxLength: 255,
      trim: true,
      toLowerCase: true
    }
  }
};

/**
 * Validate request body against schema
 */
export function validate(schema) {
  return (req, res, next) => {
    const errors = [];
    const validated = {};
    
    for (const [field, rules] of Object.entries(schema)) {
      let value = req.body[field];
      
      // Check required
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field} is required`);
        continue;
      }
      
      // Use default if not provided
      if (value === undefined && rules.default !== undefined) {
        value = rules.default;
      }
      
      // Skip validation if value is undefined and not required
      if (value === undefined) {
        continue;
      }
      
      // Type checking
      if (rules.type === 'string') {
        if (typeof value !== 'string') {
          errors.push(`${field} must be a string`);
          continue;
        }
        
        // Trim
        if (rules.trim) {
          value = value.trim();
        }
        
        // Case transformation
        if (rules.toLowerCase) {
          value = value.toLowerCase();
        }
        
        // Length checks
        if (rules.minLength && value.length < rules.minLength) {
          errors.push(`${field} must be at least ${rules.minLength} characters`);
        }
        if (rules.maxLength && value.length > rules.maxLength) {
          errors.push(`${field} must be at most ${rules.maxLength} characters`);
        }
        
        // Pattern matching
        if (rules.pattern && !rules.pattern.test(value)) {
          errors.push(`${field} has invalid format`);
        }
        
        // Enum check
        if (rules.enum && !rules.enum.includes(value)) {
          errors.push(`${field} must be one of: ${rules.enum.join(', ')}`);
        }
      }
      
      if (rules.type === 'number') {
        if (typeof value === 'string') {
          value = parseFloat(value);
        }
        
        if (typeof value !== 'number' || isNaN(value)) {
          errors.push(`${field} must be a number`);
          continue;
        }
        
        // Range checks
        if (rules.min !== undefined && value < rules.min) {
          errors.push(`${field} must be at least ${rules.min}`);
        }
        if (rules.max !== undefined && value > rules.max) {
          errors.push(`${field} must be at most ${rules.max}`);
        }
      }
      
      validated[field] = value;
    }
    
    if (errors.length > 0) {
      throw new ValidationError('Validation failed', errors);
    }
    
    // Replace req.body with validated data
    req.body = validated;
    next();
  };
}

/**
 * Sanitize HTML to prevent XSS
 */
export function sanitizeHtml(html) {
  if (!html) return html;
  
  // Simple HTML stripping (use a proper library like DOMPurify in production)
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Remove event handlers
    .replace(/javascript:/gi, '');
}

/**
 * Validate UUID format
 */
export function isValidUuid(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}
