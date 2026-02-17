import crypto from 'crypto';

const DEFAULT_USER_ID = 'default-user';

/**
 * Authentication middleware
 * For v1: auto-creates and uses a default user (single-user mode)
 * TODO: Add proper auth for multi-user SaaS
 */
export function authMiddleware(req, res, next) {
  const db = req.app.locals.db;
  
  // Ensure default user exists
  let user = db.prepare('SELECT * FROM users WHERE id = ?').get(DEFAULT_USER_ID);
  if (!user) {
    const now = Date.now();
    db.prepare('INSERT OR IGNORE INTO users (id, email, created_at, updated_at) VALUES (?, ?, ?, ?)')
      .run(DEFAULT_USER_ID, 'user@plotpulse.local', now, now);
    user = { id: DEFAULT_USER_ID, email: 'user@plotpulse.local' };
  }
  
  req.user = user;
  req.userId = user.id;
  next();
}

function hashApiKey(apiKey) {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

export function generateApiKey() {
  return crypto.randomBytes(32).toString('hex');
}

export function storeApiKey(db, userId, apiKey) {
  const keyHash = hashApiKey(apiKey);
  const now = Date.now();
  const id = crypto.randomUUID();
  db.prepare(`
    INSERT INTO api_keys (id, user_id, provider, key_hash, created_at)
    VALUES (?, ?, 'plotpulse', ?, ?)
    ON CONFLICT(user_id, provider) DO UPDATE SET
      key_hash = excluded.key_hash,
      created_at = excluded.created_at
  `).run(id, userId, keyHash, now);
  return apiKey;
}

export { hashApiKey };
export const authenticateUser = authMiddleware;
