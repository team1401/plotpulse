import { Router } from 'express';
import { authenticateUser } from '../middleware/auth.js';

export function createGenerationRoutes(
  novelModel,
  chapterModel,
  outlineModel,
  queueModel
) {
  const router = Router();

  // All routes require authentication
  router.use(authenticateUser);

  // Generate outline (Spark Mode)
  router.post('/outline/:novelId', async (req, res) => {
    const novel = novelModel.findById(req.params.novelId);

    if (!novel || novel.user_id !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (novel.mode !== 'spark') {
      return res.status(400).json({ 
        error: 'Outline generation only available in Spark mode' 
      });
    }

    // Enqueue outline generation
    const task = queueModel.enqueue({
      novel_id: novel.id,
      task_type: 'generate_outline',
      priority: 10
    });

    // Update novel status
    novelModel.update(novel.id, { status: 'outlining' });

    res.json({ 
      success: true,
      task_id: task.id,
      message: 'Outline generation queued'
    });
  });

  // Approve outline
  router.post('/outline/:novelId/approve', (req, res) => {
    const novel = novelModel.findById(req.params.novelId);

    if (!novel || novel.user_id !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const outline = outlineModel.findByNovel(novel.id);
    if (!outline) {
      return res.status(404).json({ error: 'Outline not found' });
    }

    outlineModel.approve(novel.id);
    novelModel.update(novel.id, { status: 'ready' });

    res.json({ success: true });
  });

  // Generate single chapter
  router.post('/chapter/:chapterId', async (req, res) => {
    const chapter = chapterModel.findById(req.params.chapterId);

    if (!chapter) {
      return res.status(404).json({ error: 'Chapter not found' });
    }

    const novel = novelModel.findById(chapter.novel_id);
    if (!novel || novel.user_id !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Enqueue chapter generation
    const task = queueModel.enqueue({
      novel_id: novel.id,
      chapter_id: chapter.id,
      task_type: 'generate_chapter',
      priority: 5
    });

    res.json({ 
      success: true,
      task_id: task.id,
      message: 'Chapter generation queued'
    });
  });

  // Generate all chapters (autonomous mode)
  router.post('/novel/:novelId/generate-all', async (req, res) => {
    const novel = novelModel.findById(req.params.novelId);

    if (!novel || novel.user_id !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get outline
    const outline = outlineModel.getParsed(novel.id);
    if (!outline) {
      return res.status(400).json({ 
        error: 'Outline required. Generate or upload outline first.' 
      });
    }

    if (!outline.approved) {
      return res.status(400).json({ 
        error: 'Outline must be approved before generation' 
      });
    }

    // Create chapters from outline
    const chapters = outline.chapter_summaries;
    const tasks = [];

    for (let i = 0; i < chapters.length; i++) {
      const chapterOutline = chapters[i];
      
      // Check if chapter already exists
      let chapter = chapterModel.findByNovelAndNumber(novel.id, chapterOutline.number);
      
      if (!chapter) {
        chapter = chapterModel.create({
          novel_id: novel.id,
          chapter_number: chapterOutline.number,
          title: chapterOutline.title,
          outline: JSON.stringify(chapterOutline),
          model_provider: novel.model_provider,
          model_name: novel.model_name
        });
      }

      // Enqueue if not completed
      if (chapter.status !== 'completed') {
        const task = queueModel.enqueue({
          novel_id: novel.id,
          chapter_id: chapter.id,
          task_type: 'generate_chapter',
          priority: chapters.length - i // Earlier chapters have higher priority
        });
        tasks.push(task);
      }
    }

    // Update novel status
    novelModel.update(novel.id, { status: 'generating' });

    res.json({ 
      success: true,
      chapters_queued: tasks.length,
      tasks: tasks.map(t => t.id)
    });
  });

  // Get generation status
  router.get('/novel/:novelId/status', (req, res) => {
    const novel = novelModel.findById(req.params.novelId);

    if (!novel || novel.user_id !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const pendingTasks = queueModel.findByNovel(novel.id, 'pending');
    const processingTasks = queueModel.findByNovel(novel.id, 'processing');
    const completedTasks = queueModel.findByNovel(novel.id, 'completed');
    const failedTasks = queueModel.findByNovel(novel.id, 'failed');

    const chapters = chapterModel.findByNovel(novel.id);
    const completedChapters = chapters.filter(c => c.status === 'completed').length;

    res.json({
      novel: {
        id: novel.id,
        title: novel.title,
        status: novel.status,
        current_word_count: novel.current_word_count,
        target_word_count: novel.target_word_count,
        total_cost: novel.total_cost
      },
      chapters: {
        total: chapters.length,
        completed: completedChapters,
        pending: chapters.filter(c => c.status === 'pending').length,
        generating: chapters.filter(c => c.status === 'generating').length,
        failed: chapters.filter(c => c.status === 'failed').length
      },
      queue: {
        pending: pendingTasks.length,
        processing: processingTasks.length,
        completed: completedTasks.length,
        failed: failedTasks.length
      }
    });
  });

  // Pause generation
  router.post('/novel/:novelId/pause', (req, res) => {
    const novel = novelModel.findById(req.params.novelId);

    if (!novel || novel.user_id !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Cancel all pending tasks for this novel
    const pendingTasks = queueModel.findByNovel(novel.id, 'pending');
    pendingTasks.forEach(task => {
      queueModel.cancel(task.id);
    });

    // Update novel status
    novelModel.update(novel.id, { status: 'paused' });

    res.json({ 
      success: true,
      message: 'Generation paused',
      tasks_cancelled: pendingTasks.length
    });
  });

  // Resume generation
  router.post('/novel/:novelId/resume', (req, res) => {
    const novel = novelModel.findById(req.params.novelId);

    if (!novel || novel.user_id !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (novel.status !== 'paused') {
      return res.status(400).json({ 
        error: 'Novel is not paused' 
      });
    }

    // Find incomplete chapters and re-enqueue them
    const chapters = chapterModel.findByNovel(novel.id);
    const tasks = [];

    for (const chapter of chapters) {
      if (chapter.status !== 'completed' && chapter.status !== 'generating') {
        const task = queueModel.enqueue({
          novel_id: novel.id,
          chapter_id: chapter.id,
          task_type: 'generate_chapter',
          priority: 5
        });
        tasks.push(task);
      }
    }

    // Update novel status
    novelModel.update(novel.id, { status: 'generating' });

    res.json({ 
      success: true,
      message: 'Generation resumed',
      chapters_queued: tasks.length
    });
  });

  // Regenerate chapter
  router.post('/chapter/:chapterId/regenerate', async (req, res) => {
    const chapter = chapterModel.findById(req.params.chapterId);

    if (!chapter) {
      return res.status(404).json({ error: 'Chapter not found' });
    }

    const novel = novelModel.findById(chapter.novel_id);
    if (!novel || novel.user_id !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { notes } = req.body;

    // Update chapter with regeneration notes
    if (notes) {
      chapterModel.update(chapter.id, { 
        regeneration_notes: notes,
        status: 'pending'
      });
    }

    // Cancel any existing tasks for this chapter
    const existingTasks = queueModel.findByChapter(chapter.id);
    existingTasks.forEach(task => {
      if (task.status === 'pending') {
        queueModel.cancel(task.id);
      }
    });

    // Enqueue regeneration
    const task = queueModel.enqueue({
      novel_id: novel.id,
      chapter_id: chapter.id,
      task_type: 'generate_chapter',
      priority: 10 // High priority for regeneration
    });

    res.json({ 
      success: true,
      task_id: task.id,
      message: 'Chapter regeneration queued'
    });
  });

  return router;
}
