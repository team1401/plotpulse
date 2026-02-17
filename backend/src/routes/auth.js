import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { generateApiKey, storeApiKey } from '../middleware/auth.js';
import { validate, schemas } from '../middleware/validation.js';

const router = express.Router();

/**
 * POST /api/auth/register
 * Register a new user and get an API key
 */
router.post('/register', validate(schemas.createUser), (req, res, next) => {
  try {
    const { email } = req.body;
    const db = req.app.locals.db;
    
    // Check if user already exists
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({ 
        error: 'User already exists',
        message: 'An account with this email already exists.'
      });
    }
    
    // Create user
    const userId = uuidv4();
    const now = Date.now();
    
    db.prepare(`
      INSERT INTO users (id, email, created_at, updated_at)
      VALUES (?, ?, ?, ?)
    `).run(userId, email, now, now);
    
    // Generate API key
    const apiKey = generateApiKey();
    storeApiKey(db, userId, apiKey);
    
    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: userId,
        email: email
      },
      apiKey: apiKey,
      warning: 'Save this API key securely. It will not be shown again.'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/reset-key
 * Reset API key for existing user (requires current key)
 */
router.post('/reset-key', (req, res, next) => {
  try {
    const { email, currentKey } = req.body;
    
    if (!email || !currentKey) {
      return res.status(400).json({
        error: 'Email and current API key required'
      });
    }
    
    const db = req.app.locals.db;
    
    // Verify current key
    const crypto = await import('crypto');
    const keyHash = crypto.createHash('sha256').update(currentKey).digest('hex');
    
    const user = db.prepare(`
      SELECT u.* 
      FROM users u
      JOIN api_keys ak ON u.id = ak.user_id
      WHERE u.email = ? AND ak.key_hash = ? AND ak.provider = 'plotpulse'
    `).get(email, keyHash);
    
    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }
    
    // Generate new API key
    const newApiKey = generateApiKey();
    storeApiKey(db, user.id, newApiKey);
    
    res.json({
      message: 'API key reset successfully',
      apiKey: newApiKey,
      warning: 'Save this API key securely. Your old key is now invalid.'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/auth/verify
 * Verify API key is valid (requires auth)
 */
router.get('/verify', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ valid: false });
    }
    
    const apiKey = authHeader.substring(7);
    const crypto = await import('crypto');
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    
    const db = req.app.locals.db;
    const user = db.prepare(`
      SELECT u.* 
      FROM users u
      JOIN api_keys ak ON u.id = ak.user_id
      WHERE ak.key_hash = ? AND ak.provider = 'plotpulse'
    `).get(keyHash);
    
    if (!user) {
      return res.status(401).json({ valid: false });
    }
    
    // Update last_used_at
    db.prepare(`
      UPDATE api_keys 
      SET last_used_at = ? 
      WHERE user_id = ? AND provider = 'plotpulse'
    `).run(Date.now(), user.id);
    
    res.json({
      valid: true,
      user: {
        id: user.id,
        email: user.email
      }
    });
  } catch (err) {
    next(err);
  }
});

export default router;
