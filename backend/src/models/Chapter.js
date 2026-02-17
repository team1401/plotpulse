import { v4 as uuidv4 } from 'uuid';

export class ChapterModel {
  constructor(db) {
    this.db = db;
  }

  create(data) {
    const id = uuidv4();
    const now = Date.now();
    
    const {
      novel_id,
      chapter_number,
      title,
      outline,
      model_provider,
      model_name
    } = data;
    
    const stmt = this.db.prepare(`
      INSERT INTO chapters (
        id, novel_id, chapter_number, title, outline,
        model_provider, model_name, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
    `);
    
    stmt.run(id, novel_id, chapter_number, title, outline,
             model_provider, model_name, now, now);
    
    return this.findById(id);
  }

  findById(id) {
    const stmt = this.db.prepare('SELECT * FROM chapters WHERE id = ?');
    return stmt.get(id);
  }

  findByNovel(novelId) {
    const stmt = this.db.prepare(`
      SELECT * FROM chapters
      WHERE novel_id = ?
      ORDER BY chapter_number ASC
    `);
    return stmt.all(novelId);
  }

  findByNovelAndNumber(novelId, chapterNumber) {
    const stmt = this.db.prepare(`
      SELECT * FROM chapters
      WHERE novel_id = ? AND chapter_number = ?
    `);
    return stmt.get(novelId, chapterNumber);
  }

  update(id, data) {
    const fields = [];
    const values = [];
    
    const allowedFields = [
      'title', 'outline', 'content', 'word_count', 'status',
      'model_provider', 'model_name', 'cost', 'tokens_used',
      'generation_attempts', 'flagged', 'flag_notes', 'regeneration_notes'
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
      UPDATE chapters SET ${fields.join(', ')} WHERE id = ?
    `);
    
    stmt.run(...values);
    return this.findById(id);
  }

  incrementAttempts(id) {
    const stmt = this.db.prepare(`
      UPDATE chapters
      SET generation_attempts = generation_attempts + 1,
          updated_at = ?
      WHERE id = ?
    `);
    stmt.run(Date.now(), id);
  }

  getPreviousChapter(novelId, chapterNumber) {
    const stmt = this.db.prepare(`
      SELECT * FROM chapters
      WHERE novel_id = ? AND chapter_number < ?
      ORDER BY chapter_number DESC
      LIMIT 1
    `);
    return stmt.get(novelId, chapterNumber);
  }

  delete(id) {
    const stmt = this.db.prepare('DELETE FROM chapters WHERE id = ?');
    return stmt.run(id).changes > 0;
  }

  deleteByNovel(novelId) {
    const stmt = this.db.prepare('DELETE FROM chapters WHERE novel_id = ?');
    return stmt.run(novelId).changes;
  }
}
