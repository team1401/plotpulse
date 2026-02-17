import { v4 as uuidv4 } from 'uuid';

export class GenerationQueueModel {
  constructor(db) {
    this.db = db;
  }

  enqueue(data) {
    const id = uuidv4();
    const now = Date.now();
    
    const {
      novel_id,
      chapter_id = null,
      task_type,
      priority = 0,
      max_retries = 3
    } = data;
    
    const stmt = this.db.prepare(`
      INSERT INTO generation_queue (
        id, novel_id, chapter_id, task_type, status,
        priority, max_retries, created_at
      ) VALUES (?, ?, ?, ?, 'pending', ?, ?, ?)
    `);
    
    stmt.run(id, novel_id, chapter_id, task_type, priority, max_retries, now);
    return this.findById(id);
  }

  findById(id) {
    const stmt = this.db.prepare('SELECT * FROM generation_queue WHERE id = ?');
    return stmt.get(id);
  }

  getNext() {
    const stmt = this.db.prepare(`
      SELECT * FROM generation_queue
      WHERE status = 'pending'
      ORDER BY priority DESC, created_at ASC
      LIMIT 1
    `);
    return stmt.get();
  }

  findByNovel(novelId, status = null) {
    let sql = 'SELECT * FROM generation_queue WHERE novel_id = ?';
    const params = [novelId];
    
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    
    sql += ' ORDER BY created_at DESC';
    
    const stmt = this.db.prepare(sql);
    return stmt.all(...params);
  }

  updateStatus(id, status, errorMessage = null, result = null) {
    const updates = ['status = ?', 'updated_at = ?'];
    const values = [status, Date.now()];
    
    if (status === 'processing') {
      updates.push('started_at = ?');
      values.push(Date.now());
    }
    
    if (status === 'completed' || status === 'failed') {
      updates.push('completed_at = ?');
      values.push(Date.now());
    }
    
    if (errorMessage) {
      updates.push('error_message = ?');
      values.push(errorMessage);
    }
    
    if (result) {
      updates.push('result = ?');
      values.push(typeof result === 'string' ? result : JSON.stringify(result));
    }
    
    values.push(id);
    
    const stmt = this.db.prepare(`
      UPDATE generation_queue SET ${updates.join(', ')} WHERE id = ?
    `);
    
    stmt.run(...values);
    return this.findById(id);
  }

  incrementRetry(id) {
    const stmt = this.db.prepare(`
      UPDATE generation_queue
      SET retry_count = retry_count + 1,
          status = 'pending',
          error_message = NULL
      WHERE id = ?
    `);
    stmt.run(id);
    return this.findById(id);
  }

  canRetry(id) {
    const task = this.findById(id);
    return task && task.retry_count < task.max_retries;
  }

  delete(id) {
    const stmt = this.db.prepare('DELETE FROM generation_queue WHERE id = ?');
    return stmt.run(id).changes > 0;
  }

  deleteByNovel(novelId) {
    const stmt = this.db.prepare('DELETE FROM generation_queue WHERE novel_id = ?');
    return stmt.run(novelId).changes;
  }

  getPendingCount(novelId = null) {
    if (novelId) {
      const stmt = this.db.prepare(`
        SELECT COUNT(*) as count FROM generation_queue
        WHERE novel_id = ? AND status = 'pending'
      `);
      return stmt.get(novelId).count;
    } else {
      const stmt = this.db.prepare(`
        SELECT COUNT(*) as count FROM generation_queue
        WHERE status = 'pending'
      `);
      return stmt.get().count;
    }
  }

  findByChapter(chapterId) {
    const stmt = this.db.prepare(`
      SELECT * FROM generation_queue 
      WHERE chapter_id = ?
      ORDER BY created_at DESC
    `);
    return stmt.all(chapterId);
  }

  cancel(id) {
    const stmt = this.db.prepare(`
      UPDATE generation_queue
      SET status = 'cancelled',
          updated_at = ?,
          completed_at = ?
      WHERE id = ? AND status = 'pending'
    `);
    const now = Date.now();
    stmt.run(now, now, id);
    return this.findById(id);
  }
}
