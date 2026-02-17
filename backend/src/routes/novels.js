import { Router } from 'express';
import { authenticateUser } from '../middleware/auth.js';

export function createNovelRoutes(novelModel, outlineModel, bibleModel, chapterModel) {
  const router = Router();
  router.use(authenticateUser);

  // List novels
  router.get('/', (req, res) => {
    try {
      const novels = novelModel.findByUser(req.user.id);
      res.json({ novels });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get single novel
  router.get('/:id', (req, res) => {
    try {
      const novel = novelModel.findById(req.params.id);
      if (!novel) return res.status(404).json({ error: 'Novel not found' });
      
      // Include outline if it exists
      const outline = outlineModel.getParsed(novel.id);
      if (outline) {
        novel.outline = outline;
      }
      
      res.json(novel);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Create novel
  router.post('/', (req, res) => {
    try {
      const { title, premise, mode, model, style, creativity, autonomous, outline, target_word_count } = req.body;

      if (!premise && mode === 'spark') {
        return res.status(400).json({ error: 'Premise is required for spark mode' });
      }

      // Parse model string into provider/name
      let model_provider = 'anthropic';
      let model_name = model || 'claude-sonnet-4';
      if (model_name.startsWith('gpt') || model_name.startsWith('o1') || model_name.startsWith('o3')) {
        model_provider = 'openai';
      } else if (model_name.startsWith('ollama:')) {
        model_provider = 'ollama';
        model_name = model_name.replace('ollama:', '');
      }

      const novel = novelModel.create({
        user_id: req.user.id,
        title: title || 'Untitled Novel',
        premise: premise || '',
        mode: mode || 'spark',
        model_provider,
        model_name,
        temperature: creativity || 0.7,
        target_word_count: target_word_count || 70000
      });

      // If blueprint mode with outline, store it
      if (mode === 'blueprint' && outline && outline.chapters) {
        try {
          outlineModel.create({
            novel_id: novel.id,
            content: JSON.stringify(outline),
            status: 'approved'
          });
        } catch (e) {
          console.error('Failed to store outline:', e.message);
        }
      }

      res.status(201).json(novel);
    } catch (err) {
      console.error('Create novel error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Update novel
  router.patch('/:id', (req, res) => {
    try {
      const novel = novelModel.findById(req.params.id);
      if (!novel) return res.status(404).json({ error: 'Novel not found' });
      const updated = novelModel.update(req.params.id, req.body);
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Delete novel
  router.delete('/:id', (req, res) => {
    try {
      novelModel.delete(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get novel stats
  router.get('/:id/stats', (req, res) => {
    try {
      const novel = novelModel.findById(req.params.id);
      if (!novel) return res.status(404).json({ error: 'Novel not found' });
      const chapters = chapterModel.findByNovel(req.params.id);
      const totalWords = chapters.reduce((sum, ch) => sum + (ch.word_count || 0), 0);
      res.json({
        title: novel.title,
        status: novel.status,
        current_word_count: totalWords,
        target_word_count: novel.target_word_count,
        chapters_complete: chapters.filter(ch => ch.status === 'complete').length,
        chapters_total: chapters.length
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
