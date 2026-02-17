import { Router } from 'express';
import { authenticateUser } from '../middleware/auth.js';

export function createBibleRoutes(bibleModel, novelModel) {
  const router = Router();

  // All routes require authentication
  router.use(authenticateUser);

  // Get story bible for novel
  router.get('/:novelId', (req, res) => {
    const novel = novelModel.findById(req.params.novelId);

    if (!novel || novel.user_id !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    let bible = bibleModel.getParsed(req.params.novelId);

    // If bible doesn't exist, create a default empty one
    if (!bible) {
      bible = bibleModel.create(req.params.novelId, {});
      bible = bibleModel.getParsed(req.params.novelId);
    }

    res.json(bible);
  });

  // Update story bible
  router.patch('/:novelId', (req, res) => {
    const novel = novelModel.findById(req.params.novelId);

    if (!novel || novel.user_id !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updated = bibleModel.update(req.params.novelId, req.body);

    res.json(bibleModel.getParsed(req.params.novelId));
  });

  // Create story bible (if doesn't exist)
  router.post('/:novelId', (req, res) => {
    const novel = novelModel.findById(req.params.novelId);

    if (!novel || novel.user_id !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const existing = bibleModel.findByNovel(req.params.novelId);
    if (existing) {
      return res.status(400).json({ 
        error: 'Story bible already exists. Use PATCH to update.' 
      });
    }

    const bible = bibleModel.create(req.params.novelId, req.body);
    res.status(201).json(bible);
  });

  return router;
}
