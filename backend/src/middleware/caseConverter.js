/**
 * Middleware to convert snake_case database fields to camelCase for API responses
 */

function toCamelCase(str) {
  return str.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
}

function toSnakeCase(str) {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

function convertObjectToCamelCase(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => convertObjectToCamelCase(item));
  }

  if (typeof obj === 'object' && obj.constructor === Object) {
    const converted = {};
    for (const [key, value] of Object.entries(obj)) {
      const camelKey = toCamelCase(key);
      converted[camelKey] = convertObjectToCamelCase(value);
    }
    return converted;
  }

  return obj;
}

function convertObjectToSnakeCase(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => convertObjectToSnakeCase(item));
  }

  if (typeof obj === 'object' && obj.constructor === Object) {
    const converted = {};
    for (const [key, value] of Object.entries(obj)) {
      const snakeKey = toSnakeCase(key);
      converted[snakeKey] = convertObjectToSnakeCase(value);
    }
    return converted;
  }

  return obj;
}

/**
 * Response interceptor - converts response data to camelCase
 */
export function camelCaseResponse(req, res, next) {
  const originalJson = res.json.bind(res);
  
  res.json = function(data) {
    const converted = convertObjectToCamelCase(data);
    return originalJson(converted);
  };
  
  next();
}

/**
 * Request body converter - converts request body to snake_case
 */
export function snakeCaseRequest(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = convertObjectToSnakeCase(req.body);
  }
  next();
}

/**
 * Apply both conversions
 */
export function caseConverter(req, res, next) {
  snakeCaseRequest(req, res, () => {
    camelCaseResponse(req, res, next);
  });
}
