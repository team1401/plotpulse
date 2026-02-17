import { Router } from 'express';
import { authenticateUser } from '../middleware/auth.js';

export function createChapterRoutes(chapterModel, novelModel) {
  const router = Router();

  // All routes require authentication
  router.use(authenticateUser);

  // Create chapter
  router.post('/', (req, res) => {
    const {
      novel_id,
      chapter_number,
      title,
      outline,
      model_provider,
      model_name
    } = req.body;

    if (!novel_id || !chapter_number) {
      return res.status(400).json({ 
        error: 'Required fields: novel_id, chapter_number' 
      });
    }

    // Verify novel ownership
    const novel = novelModel.findById(novel_id);
    if (!novel || novel.user_id !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const chapter = chapterModel.create({
      novel_id,
      chapter_number,
      title,
      outline,
      model_provider: model_provider || novel.model_provider,
      model_name: model_name || novel.model_name
    });

    res.status(201).json(chapter);
  });

  // Get chapters for a novel
  router.get('/novel/:novelId', (req, res) => {
    const novel = novelModel.findById(req.params.novelId);
    
    if (!novel || novel.user_id !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const chapters = chapterModel.findByNovel(req.params.novelId);
    res.json(chapters);
  });

  // Get chapter by ID
  router.get('/:id', (req, res) => {
    const chapter = chapterModel.findById(req.params.id);

    if (!chapter) {
      return res.status(404).json({ error: 'Chapter not found' });
    }

    // Verify ownership
    const novel = novelModel.findById(chapter.novel_id);
    if (!novel || novel.user_id !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(chapter);
  });

  // Update chapter
  router.patch('/:id', (req, res) => {
    const chapter = chapterModel.findById(req.params.id);

    if (!chapter) {
      return res.status(404).json({ error: 'Chapter not found' });
    }

    // Verify ownership
    const novel = novelModel.findById(chapter.novel_id);
    if (!novel || novel.user_id !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updated = chapterModel.update(req.params.id, req.body);
    res.json(updated);
  });

  // Delete chapter
  router.delete('/:id', (req, res) => {
    const chapter = chapterModel.findById(req.params.id);

    if (!chapter) {
      return res.status(404).json({ error: 'Chapter not found' });
    }

    // Verify ownership
    const novel = novelModel.findById(chapter.novel_id);
    if (!novel || novel.user_id !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    chapterModel.delete(req.params.id);
    res.json({ success: true });
  });

  return router;
}
