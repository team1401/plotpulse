import { v4 as uuidv4 } from 'uuid';

/**
 * Generation Queue Service
 * Handles task queuing with proper locking and retry logic
 */
export class QueueService {
  constructor(db) {
    this.db = db;
    this.processing = false;
  }
  
  /**
   * Add a task to the queue
   */
  enqueue(novelId, taskType, chapterId = null, priority = 0, maxRetries = 3) {
    const id = uuidv4();
    const now = Date.now();
    
    this.db.prepare(`
      INSERT INTO generation_queue (
        id, novel_id, chapter_id, task_type, status, priority, 
        max_retries, created_at
      ) VALUES (?, ?, ?, ?, 'pending', ?, ?, ?)
    `).run(id, novelId, chapterId, taskType, priority, maxRetries, now);
    
    return id;
  }
  
  /**
   * Claim the next pending task with proper locking
   * Uses UPDATE with subquery to prevent race conditions
   */
  claimNext() {
    const now = Date.now();
    
    // This is atomic in SQLite with WAL mode
    const task = this.db.prepare(`
      UPDATE generation_queue
      SET status = 'processing',
          started_at = ?
      WHERE id = (
        SELECT id FROM generation_queue
        WHERE status = 'pending'
          AND retry_count < max_retries
        ORDER BY priority DESC, created_at ASC
        LIMIT 1
      )
      RETURNING *
    `).get(now);
    
    return task;
  }
  
  /**
   * Mark task as completed
   */
  complete(taskId, result = null) {
    const now = Date.now();
    
    this.db.prepare(`
      UPDATE generation_queue
      SET status = 'completed',
          completed_at = ?,
          result = ?
      WHERE id = ?
    `).run(now, result ? JSON.stringify(result) : null, taskId);
  }
  
  /**
   * Mark task as failed
   */
  fail(taskId, errorMessage) {
    const now = Date.now();
    
    const task = this.db.prepare('SELECT * FROM generation_queue WHERE id = ?').get(taskId);
    
    if (!task) return;
    
    // If max retries not reached, schedule retry with backoff
    if (task.retry_count < task.max_retries) {
      const backoff = this.calculateBackoff(task.retry_count);
      
      console.log(`[Queue] Task ${taskId} failed, retrying in ${backoff}ms (attempt ${task.retry_count + 1}/${task.max_retries})`);
      
      // Schedule retry
      setTimeout(() => {
        this.db.prepare(`
          UPDATE generation_queue
          SET status = 'pending',
              retry_count = retry_count + 1,
              error_message = ?
          WHERE id = ?
        `).run(errorMessage, taskId);
      }, backoff);
    } else {
      // Max retries reached, mark as failed permanently
      console.error(`[Queue] Task ${taskId} permanently failed after ${task.retry_count} attempts`);
      
      this.db.prepare(`
        UPDATE generation_queue
        SET status = 'failed',
            completed_at = ?,
            error_message = ?
        WHERE id = ?
      `).run(now, errorMessage, taskId);
      
      // Mark novel as failed
      this.db.prepare(`
        UPDATE novels
        SET status = 'failed',
            updated_at = ?
        WHERE id = ?
      `).run(now, task.novel_id);
    }
  }
  
  /**
   * Calculate exponential backoff with jitter
   */
  calculateBackoff(retryCount, errorType = 'generic') {
    const config = {
      generic: { base: 1000, multiplier: 2, max: 60000 }, // 1s -> 2s -> 4s -> 8s -> max 1min
      apiError: { base: 5000, multiplier: 2, max: 300000 }, // 5s -> ... -> max 5min
      rateLimit: { base: 10000, multiplier: 3, max: 600000 } // 10s -> ... -> max 10min
    };
    
    const { base, multiplier, max } = config[errorType] || config.generic;
    
    const delay = Math.min(base * Math.pow(multiplier, retryCount), max);
    
    // Add jitter (±30%)
    const jitter = delay * 0.3 * (Math.random() * 2 - 1);
    
    return Math.round(delay + jitter);
  }
  
  /**
   * Get queue statistics
   */
  getStats() {
    return this.db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
      FROM generation_queue
      WHERE created_at > ?
    `).get(Date.now() - (24 * 60 * 60 * 1000)); // Last 24 hours
  }
  
  /**
   * Cleanup old completed/failed tasks
   */
  cleanup(olderThan = 7 * 24 * 60 * 60 * 1000) { // 7 days
    const cutoff = Date.now() - olderThan;
    
    const result = this.db.prepare(`
      DELETE FROM generation_queue
      WHERE status IN ('completed', 'failed')
        AND completed_at < ?
    `).run(cutoff);
    
    console.log(`[Queue] Cleaned up ${result.changes} old tasks`);
    
    return result.changes;
  }
  
  /**
   * Recover stale tasks (processing for too long)
   */
  recoverStale(staleTimeout = 10 * 60 * 1000) { // 10 minutes
    const cutoff = Date.now() - staleTimeout;
    
    const staleTasks = this.db.prepare(`
      SELECT * FROM generation_queue
      WHERE status = 'processing'
        AND started_at < ?
    `).all(cutoff);
    
    for (const task of staleTasks) {
      console.warn(`[Queue] Recovering stale task ${task.id} (started ${new Date(task.started_at)})`);
      
      // Reset to pending if retries available
      if (task.retry_count < task.max_retries) {
        this.db.prepare(`
          UPDATE generation_queue
          SET status = 'pending',
              retry_count = retry_count + 1,
              error_message = 'Task timed out and was recovered'
          WHERE id = ?
        `).run(task.id);
      } else {
        this.fail(task.id, 'Task timed out');
      }
    }
    
    return staleTasks.length;
  }
}

/**
 * Circuit Breaker for API calls
 * Prevents cascading failures by stopping requests when error rate is high
 */
export class CircuitBreaker {
  constructor(maxFailures = 5, resetTime = 60000) {
    this.failures = 0;
    this.maxFailures = maxFailures;
    this.resetTime = resetTime;
    this.state = 'closed'; // closed, open, half-open
    this.lastFailTime = null;
  }
  
  async call(fn, context = null) {
    // Check if circuit should reset
    if (this.state === 'open' && Date.now() - this.lastFailTime > this.resetTime) {
      console.log('[CircuitBreaker] Transitioning to half-open state');
      this.state = 'half-open';
      this.failures = 0;
    }
    
    if (this.state === 'open') {
      const waitTime = Math.round((this.resetTime - (Date.now() - this.lastFailTime)) / 1000);
      throw new Error(`Circuit breaker is open. Try again in ${waitTime}s`);
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }
  
  onSuccess() {
    if (this.state === 'half-open') {
      console.log('[CircuitBreaker] Half-open state successful, closing circuit');
      this.state = 'closed';
    }
    this.failures = 0;
  }
  
  onFailure() {
    this.failures++;
    this.lastFailTime = Date.now();
    
    if (this.failures >= this.maxFailures) {
      console.error(`[CircuitBreaker] Opening circuit after ${this.failures} failures`);
      this.state = 'open';
    }
  }
  
  getState() {
    return {
      state: this.state,
      failures: this.failures,
      maxFailures: this.maxFailures
    };
  }
}
