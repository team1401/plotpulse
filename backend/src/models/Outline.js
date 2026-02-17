import { v4 as uuidv4 } from 'uuid';

export class OutlineModel {
  constructor(db) {
    this.db = db;
  }

  create(novelId, data) {
    // Delete existing outline for this novel (upsert behavior)
    this.db.prepare('DELETE FROM outlines WHERE novel_id = ?').run(novelId);
    
    const id = uuidv4();
    const now = Date.now();
    
    const {
      chapter_summaries,
      character_profiles = '[]',
      world_details = '{}',
      theme_notes = '[]'
    } = data;
    
    const stmt = this.db.prepare(`
      INSERT INTO outlines (
        id, novel_id, chapter_summaries, character_profiles,
        world_details, theme_notes, approved, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)
    `);
    
    stmt.run(
      id, novelId,
      typeof chapter_summaries === 'string' ? chapter_summaries : JSON.stringify(chapter_summaries),
      typeof character_profiles === 'string' ? character_profiles : JSON.stringify(character_profiles),
      typeof world_details === 'string' ? world_details : JSON.stringify(world_details),
      typeof theme_notes === 'string' ? theme_notes : JSON.stringify(theme_notes),
      now, now
    );
    
    return this.findByNovel(novelId);
  }

  findByNovel(novelId) {
    const stmt = this.db.prepare('SELECT * FROM outlines WHERE novel_id = ?');
    return stmt.get(novelId);
  }

  update(novelId, data) {
    const fields = [];
    const values = [];
    
    const allowedFields = [
      'chapter_summaries', 'character_profiles', 'world_details',
      'theme_notes', 'approved'
    ];
    
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        fields.push(`${field} = ?`);
        const value = (field !== 'approved' && typeof data[field] !== 'string') 
          ? JSON.stringify(data[field]) 
          : data[field];
        values.push(value);
      }
    }
    
    if (fields.length === 0) return this.findByNovel(novelId);
    
    fields.push('updated_at = ?');
    values.push(Date.now());
    values.push(novelId);
    
    const stmt = this.db.prepare(`
      UPDATE outlines SET ${fields.join(', ')} WHERE novel_id = ?
    `);
    
    stmt.run(...values);
    return this.findByNovel(novelId);
  }

  approve(novelId) {
    const stmt = this.db.prepare(`
      UPDATE outlines SET approved = 1, updated_at = ? WHERE novel_id = ?
    `);
    stmt.run(Date.now(), novelId);
    return this.findByNovel(novelId);
  }

  delete(novelId) {
    const stmt = this.db.prepare('DELETE FROM outlines WHERE novel_id = ?');
    return stmt.run(novelId).changes > 0;
  }

  // Helper to parse JSON fields safely
  getParsed(novelId) {
    const outline = this.findByNovel(novelId);
    if (!outline) return null;

    try {
      return {
        ...outline,
        chapter_summaries: JSON.parse(outline.chapter_summaries || '[]'),
        character_profiles: JSON.parse(outline.character_profiles || '[]'),
        world_details: JSON.parse(outline.world_details || '{}'),
        theme_notes: JSON.parse(outline.theme_notes || '[]')
      };
    } catch (err) {
      console.error('Error parsing outline JSON:', err);
      return outline;
    }
  }
}
