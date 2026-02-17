import { v4 as uuidv4 } from 'uuid';

export class UserModel {
  constructor(db) {
    this.db = db;
  }

  create(email) {
    const id = uuidv4();
    const now = Date.now();
    
    const stmt = this.db.prepare(`
      INSERT INTO users (id, email, created_at, updated_at)
      VALUES (?, ?, ?, ?)
    `);
    
    stmt.run(id, email, now, now);
    return this.findById(id);
  }

  findById(id) {
    const stmt = this.db.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(id);
  }

  findByEmail(email) {
    const stmt = this.db.prepare('SELECT * FROM users WHERE email = ?');
    return stmt.get(email);
  }

  findOrCreate(email) {
    let user = this.findByEmail(email);
    if (!user) {
      user = this.create(email);
    }
    return user;
  }

  list(limit = 100, offset = 0) {
    const stmt = this.db.prepare(`
      SELECT * FROM users
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);
    return stmt.all(limit, offset);
  }

  delete(id) {
    const stmt = this.db.prepare('DELETE FROM users WHERE id = ?');
    return stmt.run(id).changes > 0;
  }
}
