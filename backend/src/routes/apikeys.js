import { Router } from 'express';
import { authenticateUser } from '../middleware/auth.js';

export function createApiKeyRoutes(apiKeyModel, aiService) {
  const router = Router();

  // All routes require authentication
  router.use(authenticateUser);

  // Store API key
  router.post('/', (req, res) => {
    const { provider, apiKey } = req.body;

    if (!provider || !apiKey) {
      return res.status(400).json({ error: 'Provider and apiKey required' });
    }

    const validProviders = ['anthropic', 'openai'];
    if (!validProviders.includes(provider)) {
      return res.status(400).json({ 
        error: 'Invalid provider',
        validProviders 
      });
    }

    const result = apiKeyModel.store(req.userId, provider, apiKey);
    
    // Clear cached provider instances
    aiService.clearCache(req.userId);

    res.json({ 
      success: true, 
      provider: result.provider,
      created_at: result.created_at
    });
  });

  // List stored API keys (without exposing the keys)
  router.get('/', (req, res) => {
    const keys = apiKeyModel.list(req.userId);
    res.json(keys);
  });

  // Delete API key
  router.delete('/:provider', (req, res) => {
    const { provider } = req.params;
    const deleted = apiKeyModel.delete(req.userId, provider);

    if (!deleted) {
      return res.status(404).json({ error: 'API key not found' });
    }

    // Clear cached provider instances
    aiService.clearCache(req.userId);

    res.json({ success: true });
  });

  return router;
}
