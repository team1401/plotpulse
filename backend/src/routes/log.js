import { Router } from 'express';
import fs from 'fs';
import path from 'path';

const LOG_FILE = process.env.LOG_PATH || '/app/data/error.log';
const MAX_MEMORY_LOGS = 500;
const memoryLog = [];

export function createLogRoutes() {
  const router = Router();

  // Receive frontend error logs
  router.post('/error', (req, res) => {
    const entry = {
      source: 'frontend',
      timestamp: req.body.timestamp || new Date().toISOString(),
      context: req.body.context || 'unknown',
      error: req.body.error || 'unknown',
      stack: req.body.stack || null,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
      ...req.body
    };

    memoryLog.push(entry);
    if (memoryLog.length > MAX_MEMORY_LOGS) memoryLog.shift();

    // Append to file
    try {
      fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n');
    } catch (e) {
      console.error('[Log] Failed to write to log file:', e.message);
    }

    console.error(`[Frontend Error] ${entry.context}: ${entry.error}`);
    res.json({ ok: true });
  });

  // Get recent error logs (for dev dashboard)
  router.get('/errors', (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    const source = req.query.source; // 'frontend', 'backend', or all
    
    let logs = [...memoryLog];
    if (source) logs = logs.filter(l => l.source === source);
    
    res.json({
      errors: logs.slice(-limit).reverse(),
      total: logs.length
    });
  });

  // Get log file contents
  router.get('/file', (req, res) => {
    try {
      const lines = parseInt(req.query.lines) || 100;
      if (!fs.existsSync(LOG_FILE)) {
        return res.json({ lines: [], total: 0 });
      }
      const content = fs.readFileSync(LOG_FILE, 'utf8');
      const allLines = content.trim().split('\n').filter(Boolean);
      const recent = allLines.slice(-lines);
      res.json({
        lines: recent.map(l => { try { return JSON.parse(l); } catch { return { raw: l }; } }),
        total: allLines.length
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}

// Backend error logging helper
export function logBackendError(context, error, details = {}) {
  const entry = {
    source: 'backend',
    timestamp: new Date().toISOString(),
    context,
    error: error?.message || String(error),
    stack: error?.stack?.split('\n').slice(0, 5).join('\n'),
    ...details
  };

  memoryLog.push(entry);
  if (memoryLog.length > MAX_MEMORY_LOGS) memoryLog.shift();

  try {
    fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n');
  } catch (e) {
    // silently fail
  }

  console.error(`[Backend Error] ${context}: ${error?.message || error}`);
}

// Request logging middleware
export function requestLogger(req, res, next) {
  const start = Date.now();
  const originalEnd = res.end;
  
  res.end = function(...args) {
    const duration = Date.now() - start;
    const status = res.statusCode;
    
    // Log slow requests (>5s) and errors
    if (duration > 5000 || status >= 400) {
      const entry = {
        source: 'backend',
        type: 'request',
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.path,
        status,
        duration,
        ip: req.ip,
        userAgent: req.headers['user-agent']?.substring(0, 100)
      };

      if (status >= 400) {
        memoryLog.push(entry);
        if (memoryLog.length > MAX_MEMORY_LOGS) memoryLog.shift();
        try {
          fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n');
        } catch (e) {}
      }

      if (status >= 500) {
        console.error(`[Request] ${req.method} ${req.path} → ${status} (${duration}ms)`);
      } else if (status >= 400) {
        console.warn(`[Request] ${req.method} ${req.path} → ${status} (${duration}ms)`);
      }
    }

    originalEnd.apply(res, args);
  };

  next();
}
