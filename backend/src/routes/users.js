import { Router } from 'express';

export function createUserRoutes(userModel) {
  const router = Router();

  // Get or create user
  router.post('/', (req, res) => {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    const user = userModel.findOrCreate(email);
    res.json(user);
  });

  // Get user by ID
  router.get('/:id', (req, res) => {
    const user = userModel.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  });

  // List users
  router.get('/', (req, res) => {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    const users = userModel.list(limit, offset);
    res.json(users);
  });

  return router;
}
