export class QueueProcessor {
  constructor(queueModel, generationEngine, socketEmit = null) {
    this.queue = queueModel;
    this.engine = generationEngine;
    this.socketEmit = socketEmit;
    this.isProcessing = false;
    this.currentTask = null;
  }

  /**
   * Start processing the queue
   */
  async start() {
    if (this.isProcessing) {
      console.log('Queue processor already running');
      return;
    }

    this.isProcessing = true;
    console.log('Queue processor started');

    while (this.isProcessing) {
      try {
        const task = this.queue.getNext();
        
        if (!task) {
          // No tasks, wait before checking again
          await this.sleep(5000);
          continue;
        }

        this.currentTask = task;
        await this.processTask(task);
        this.currentTask = null;
      } catch (error) {
        console.error('Queue processor error:', error);
        await this.sleep(5000);
      }
    }

    console.log('Queue processor stopped');
  }

  /**
   * Stop processing the queue
   */
  stop() {
    this.isProcessing = false;
  }

  /**
   * Process a single task
   */
  async processTask(task) {
    console.log(`Processing task ${task.id}: ${task.task_type}`);

    this.queue.updateStatus(task.id, 'processing');

    try {
      let result;

      switch (task.task_type) {
        case 'generate_outline':
          result = await this.engine.generateOutline(task.novel_id, this.socketEmit);
          break;

        case 'generate_chapter':
          if (!task.chapter_id) {
            throw new Error('Chapter ID required for generate_chapter task');
          }
          result = await this.engine.generateChapter(task.chapter_id, this.socketEmit);
          break;

        default:
          throw new Error(`Unknown task type: ${task.task_type}`);
      }

      this.queue.updateStatus(task.id, 'completed', null, result);
      console.log(`Task ${task.id} completed`);
      
      // Check if all tasks for this novel are done — update novel status to 'complete'
      if (task.task_type === 'generate_chapter' && task.novel_id) {
        const remaining = this.queue.getPendingCount(task.novel_id);
        const processing = this.queue.findByNovel(task.novel_id, 'processing');
        if (remaining === 0 && processing.length === 0) {
          try {
            this.engine.novels.update(task.novel_id, { status: 'complete' });
            console.log(`Novel ${task.novel_id} generation complete!`);
            if (this.socketEmit) {
              this.socketEmit('generation:complete', { novelId: task.novel_id });
            }
          } catch (e) {
            console.error('Failed to update novel status:', e.message);
          }
        }
      }
    } catch (error) {
      console.error(`Task ${task.id} failed:`, error.message);

      if (this.queue.canRetry(task.id)) {
        console.log(`Retrying task ${task.id} (${task.retry_count + 1}/${task.max_retries})`);
        this.queue.incrementRetry(task.id);
      } else {
        console.log(`Task ${task.id} exceeded max retries`);
        this.queue.updateStatus(task.id, 'failed', error.message);
      }
    }
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      isProcessing: this.isProcessing,
      currentTask: this.currentTask,
      pendingCount: this.queue.getPendingCount()
    };
  }

  /**
   * Helper: Sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
