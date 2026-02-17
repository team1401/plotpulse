import crypto from 'crypto';

/**
 * Encryption Service for storing AI provider API keys
 * Uses AES-256-GCM with per-key IVs
 * 
 * WARNING: This is better than plaintext but still has limitations:
 * - Encryption key stored in environment (not ideal for production)
 * - For production, use AWS KMS, Google Cloud KMS, or HashiCorp Vault
 */

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits

/**
 * Get encryption key from environment
 * Must be a 64-character hex string (32 bytes)
 */
function getEncryptionKey() {
  const key = process.env.ENCRYPTION_KEY;
  
  if (!key) {
    throw new Error('ENCRYPTION_KEY not set in environment');
  }
  
  if (key.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes). Generate with: openssl rand -hex 32');
  }
  
  return Buffer.from(key, 'hex');
}

/**
 * Encrypt a string value
 * Returns { encryptedData, iv, authTag }
 */
export function encrypt(plaintext) {
  if (!plaintext) {
    throw new Error('Cannot encrypt empty value');
  }
  
  const key = getEncryptionKey();
  
  // Generate random IV for each encryption (crucial for security)
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Get authentication tag (ensures data integrity)
  const authTag = cipher.getAuthTag();
  
  return {
    encryptedData: encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
}

/**
 * Decrypt a value
 * Requires { encryptedData, iv, authTag }
 */
export function decrypt(encryptedData, iv, authTag) {
  if (!encryptedData || !iv || !authTag) {
    throw new Error('Missing required decryption parameters');
  }
  
  const key = getEncryptionKey();
  
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(iv, 'hex')
  );
  
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Store an AI provider API key (encrypted)
 */
export function storeProviderKey(db, userId, provider, apiKey) {
  const { encryptedData, iv, authTag } = encrypt(apiKey);
  const now = Date.now();
  const id = crypto.randomUUID();
  
  db.prepare(`
    INSERT INTO api_keys (id, user_id, provider, encrypted_key, iv, auth_tag, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, provider) DO UPDATE SET
      encrypted_key = excluded.encrypted_key,
      iv = excluded.iv,
      auth_tag = excluded.auth_tag,
      created_at = excluded.created_at
  `).run(id, userId, provider, encryptedData, iv, authTag, now);
}

/**
 * Retrieve and decrypt an AI provider API key
 */
export function getProviderKey(db, userId, provider) {
  const row = db.prepare(`
    SELECT encrypted_key, iv, auth_tag
    FROM api_keys
    WHERE user_id = ? AND provider = ?
  `).get(userId, provider);
  
  if (!row) {
    return null;
  }
  
  try {
    return decrypt(row.encrypted_key, row.iv, row.auth_tag);
  } catch (err) {
    console.error(`[Encryption] Failed to decrypt ${provider} key for user ${userId}:`, err);
    throw new Error('Failed to decrypt API key. Key may be corrupted.');
  }
}

/**
 * Validate encryption key format
 */
export function validateEncryptionKey() {
  try {
    const key = getEncryptionKey();
    
    if (key.length !== KEY_LENGTH) {
      return {
        valid: false,
        error: `Key must be ${KEY_LENGTH} bytes (${KEY_LENGTH * 2} hex characters)`
      };
    }
    
    // Test encryption/decryption
    const test = 'test-string';
    const { encryptedData, iv, authTag } = encrypt(test);
    const decrypted = decrypt(encryptedData, iv, authTag);
    
    if (decrypted !== test) {
      return {
        valid: false,
        error: 'Encryption test failed'
      };
    }
    
    return { valid: true };
  } catch (err) {
    return {
      valid: false,
      error: err.message
    };
  }
}

/**
 * EncryptionService class wrapper (for compatibility with index.js and models)
 */
export class EncryptionService {
  constructor(key) {
    // Key is already set in env by index.js, but store for reference
    this.key = key;
  }

  encrypt(plaintext) {
    const result = encrypt(plaintext);
    return {
      encrypted: result.encryptedData,
      iv: result.iv,
      authTag: result.authTag
    };
  }

  decrypt(encryptedData, iv, authTag) {
    return decrypt(encryptedData, iv, authTag);
  }
}

/**
 * Rotate encryption key (re-encrypt all stored keys with new key)
 * WARNING: Complex operation - backup database first!
 */
export async function rotateEncryptionKey(db, oldKeyHex, newKeyHex) {
  console.warn('[Encryption] Starting key rotation - this will re-encrypt all stored keys');
  
  // Temporarily use old key
  const originalKey = process.env.ENCRYPTION_KEY;
  process.env.ENCRYPTION_KEY = oldKeyHex;
  
  // Get all encrypted keys
  const keys = db.prepare(`
    SELECT id, user_id, provider, encrypted_key, iv, auth_tag
    FROM api_keys
    WHERE encrypted_key IS NOT NULL
  `).all();
  
  console.log(`[Encryption] Re-encrypting ${keys.length} keys`);
  
  const transaction = db.transaction(() => {
    for (const key of keys) {
      try {
        // Decrypt with old key
        const plaintext = decrypt(key.encrypted_key, key.iv, key.auth_tag);
        
        // Re-encrypt with new key
        process.env.ENCRYPTION_KEY = newKeyHex;
        const { encryptedData, iv, authTag } = encrypt(plaintext);
        
        // Update database
        db.prepare(`
          UPDATE api_keys
          SET encrypted_key = ?,
              iv = ?,
              auth_tag = ?
          WHERE id = ?
        `).run(encryptedData, iv, authTag, key.id);
        
        // Switch back to old key for next iteration
        process.env.ENCRYPTION_KEY = oldKeyHex;
      } catch (err) {
        console.error(`[Encryption] Failed to rotate key for ${key.provider}:`, err);
        throw err; // Rollback transaction
      }
    }
  });
  
  transaction();
  
  // Update to new key permanently
  process.env.ENCRYPTION_KEY = newKeyHex;
  
  console.log('[Encryption] Key rotation complete');
}
