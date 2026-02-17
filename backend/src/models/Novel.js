import { v4 as uuidv4 } from 'uuid';

export class NovelModel {
  constructor(db) {
    this.db = db;
  }

  create(data) {
    const id = uuidv4();
    const now = Date.now();
    
    const {
      user_id,
      title,
      premise,
      mode,
      target_word_count = 70000,
      model_provider,
      model_name,
      temperature = 0.7
    } = data;
    
    const stmt = this.db.prepare(`
      INSERT INTO novels (
        id, user_id, title, premise, status, mode, target_word_count,
        model_provider, model_name, temperature, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'outlining', ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(id, user_id, title, premise, mode, target_word_count, 
             model_provider, model_name, temperature, now, now);
    
    return this.findById(id);
  }

  findById(id) {
    const stmt = this.db.prepare('SELECT * FROM novels WHERE id = ?');
    return stmt.get(id);
  }

  findByUser(userId, limit = 100, offset = 0) {
    const stmt = this.db.prepare(`
      SELECT * FROM novels
      WHERE user_id = ?
      ORDER BY updated_at DESC
      LIMIT ? OFFSET ?
    `);
    return stmt.all(userId, limit, offset);
  }

  update(id, data) {
    const fields = [];
    const values = [];
    
    const allowedFields = [
      'title', 'premise', 'status', 'mode', 'target_word_count',
      'current_word_count', 'model_provider', 'model_name', 
      'temperature', 'total_cost', 'total_tokens'
    ];
    
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(data[field]);
      }
    }
    
    if (fields.length === 0) return this.findById(id);
    
    fields.push('updated_at = ?');
    values.push(Date.now());
    values.push(id);
    
    const stmt = this.db.prepare(`
      UPDATE novels SET ${fields.join(', ')} WHERE id = ?
    `);
    
    stmt.run(...values);
    return this.findById(id);
  }

  incrementCost(id, cost, tokens) {
    const stmt = this.db.prepare(`
      UPDATE novels
      SET total_cost = total_cost + ?,
          total_tokens = total_tokens + ?,
          updated_at = ?
      WHERE id = ?
    `);
    stmt.run(cost, tokens, Date.now(), id);
  }

  incrementWordCount(id, wordCount) {
    const stmt = this.db.prepare(`
      UPDATE novels
      SET current_word_count = current_word_count + ?,
          updated_at = ?
      WHERE id = ?
    `);
    stmt.run(wordCount, Date.now(), id);
  }

  delete(id) {
    // Cascade delete related data
    this.db.prepare('DELETE FROM chapters WHERE novel_id = ?').run(id);
    this.db.prepare('DELETE FROM outlines WHERE novel_id = ?').run(id);
    this.db.prepare('DELETE FROM story_bibles WHERE novel_id = ?').run(id);
    this.db.prepare('DELETE FROM generation_queue WHERE novel_id = ?').run(id);
    const stmt = this.db.prepare('DELETE FROM novels WHERE id = ?');
    return stmt.run(id).changes > 0;
  }

  getStats(id) {
    const novel = this.findById(id);
    if (!novel) return null;

    const chapterStats = this.db.prepare(`
      SELECT 
        COUNT(*) as total_chapters,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_chapters,
        SUM(word_count) as total_words
      FROM chapters
      WHERE novel_id = ?
    `).get(id);

    return {
      ...novel,
      ...chapterStats
    };
  }
}
