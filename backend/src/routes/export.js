import { Router } from 'express';
import { authenticateUser } from '../middleware/auth.js';

export function createExportRoutes(novelModel, epubGenerator) {
  const router = Router();

  // All routes require authentication
  router.use(authenticateUser);

  // Export novel as EPUB
  router.post('/epub/:novelId', async (req, res) => {
    try {
      const novel = novelModel.findById(req.params.novelId);

      if (!novel || novel.user_id !== req.userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const {
        author = 'Unknown Author',
        dedication = null,
        copyright = null
      } = req.body;

      const epubBuffer = await epubGenerator.generate(novel.id, {
        author,
        dedication,
        copyright
      });

      const filename = `${novel.title.replace(/[^a-z0-9]/gi, '_')}.epub`;

      res.setHeader('Content-Type', 'application/epub+zip');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', epubBuffer.length);

      res.send(epubBuffer);
    } catch (error) {
      console.error('EPUB generation error:', error);
      res.status(500).json({ 
        error: 'EPUB generation failed',
        message: error.message 
      });
    }
  });

  // Export novel as JSON (for backup/import)
  router.get('/json/:novelId', (req, res) => {
    const novel = novelModel.findById(req.params.novelId);

    if (!novel || novel.user_id !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const chapters = req.app.locals.models.chapter.findByNovel(novel.id);
    const outline = req.app.locals.models.outline.findByNovel(novel.id);
    const bible = req.app.locals.models.bible.findByNovel(novel.id);

    const exportData = {
      novel,
      chapters,
      outline,
      bible,
      exported_at: Date.now()
    };

    const filename = `${novel.title.replace(/[^a-z0-9]/gi, '_')}.json`;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    res.json(exportData);
  });

  return router;
}
