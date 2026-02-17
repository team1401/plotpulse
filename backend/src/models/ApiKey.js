import { v4 as uuidv4 } from 'uuid';

export class ApiKeyModel {
  constructor(db, encryptionService) {
    this.db = db;
    this.encryption = encryptionService;
  }

  store(userId, provider, apiKey) {
    const id = uuidv4();
    const now = Date.now();
    
    const { encrypted, iv, authTag } = this.encryption.encrypt(apiKey);
    
    // Delete existing key for this provider
    this.db.prepare(`
      DELETE FROM api_keys WHERE user_id = ? AND provider = ?
    `).run(userId, provider);
    
    const stmt = this.db.prepare(`
      INSERT INTO api_keys (
        id, user_id, provider, encrypted_key, iv, auth_tag, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(id, userId, provider, encrypted, iv, authTag, now);
    
    return { id, provider, created_at: now };
  }

  get(userId, provider) {
    const stmt = this.db.prepare(`
      SELECT * FROM api_keys WHERE user_id = ? AND provider = ?
    `);
    
    const record = stmt.get(userId, provider);
    if (!record) return null;
    
    try {
      const decrypted = this.encryption.decrypt(
        record.encrypted_key,
        record.iv,
        record.auth_tag
      );
      
      return {
        id: record.id,
        provider: record.provider,
        apiKey: decrypted,
        created_at: record.created_at
      };
    } catch (err) {
      console.error(`Failed to decrypt API key for ${provider}:`, err.message);
      return null;
    }
  }

  list(userId) {
    const stmt = this.db.prepare(`
      SELECT id, provider, created_at FROM api_keys WHERE user_id = ?
    `);
    return stmt.all(userId);
  }

  delete(userId, provider) {
    const stmt = this.db.prepare(`
      DELETE FROM api_keys WHERE user_id = ? AND provider = ?
    `);
    return stmt.run(userId, provider).changes > 0;
  }

  deleteAll(userId) {
    const stmt = this.db.prepare(`
      DELETE FROM api_keys WHERE user_id = ?
    `);
    return stmt.run(userId).changes;
  }
}
