import { v4 as uuidv4 } from 'uuid';

export class StoryBibleModel {
  constructor(db) {
    this.db = db;
  }

  create(novelId, data = {}) {
    // Delete existing bible for this novel (upsert behavior)
    this.db.prepare('DELETE FROM story_bibles WHERE novel_id = ?').run(novelId);
    
    const id = uuidv4();
    const now = Date.now();
    
    const {
      characters = '{}',
      world_rules = '{}',
      timeline = '[]',
      themes = '[]',
      tone_guide = '',
      style_reference = ''
    } = data;
    
    const stmt = this.db.prepare(`
      INSERT INTO story_bibles (
        id, novel_id, characters, world_rules, timeline,
        themes, tone_guide, style_reference, version, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `);
    
    stmt.run(id, novelId, characters, world_rules, timeline,
             themes, tone_guide, style_reference, now);
    
    return this.findByNovel(novelId);
  }

  findByNovel(novelId) {
    const stmt = this.db.prepare('SELECT * FROM story_bibles WHERE novel_id = ?');
    return stmt.get(novelId);
  }

  update(novelId, data) {
    let bible = this.findByNovel(novelId);
    
    if (!bible) {
      return this.create(novelId, data);
    }
    
    const fields = [];
    const values = [];
    
    const allowedFields = [
      'characters', 'world_rules', 'timeline', 'themes',
      'tone_guide', 'style_reference'
    ];
    
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(typeof data[field] === 'string' ? data[field] : JSON.stringify(data[field]));
      }
    }
    
    if (fields.length === 0) return bible;
    
    fields.push('version = version + 1');
    fields.push('updated_at = ?');
    values.push(Date.now());
    values.push(novelId);
    
    const stmt = this.db.prepare(`
      UPDATE story_bibles SET ${fields.join(', ')} WHERE novel_id = ?
    `);
    
    stmt.run(...values);
    return this.findByNovel(novelId);
  }

  delete(novelId) {
    const stmt = this.db.prepare('DELETE FROM story_bibles WHERE novel_id = ?');
    return stmt.run(novelId).changes > 0;
  }

  // Helper to parse JSON fields safely
  getParsed(novelId) {
    const bible = this.findByNovel(novelId);
    if (!bible) return null;

    try {
      return {
        ...bible,
        characters: JSON.parse(bible.characters || '{}'),
        world_rules: JSON.parse(bible.world_rules || '{}'),
        timeline: JSON.parse(bible.timeline || '[]'),
        themes: JSON.parse(bible.themes || '[]')
      };
    } catch (err) {
      console.error('Error parsing story bible JSON:', err);
      return bible;
    }
  }
}
