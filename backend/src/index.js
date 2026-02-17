import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Database and models
import { initDatabase } from './database/init.js';
import { UserModel } from './models/User.js';
import { NovelModel } from './models/Novel.js';
import { ChapterModel } from './models/Chapter.js';
import { StoryBibleModel } from './models/StoryBible.js';
import { GenerationQueueModel } from './models/GenerationQueue.js';
import { OutlineModel } from './models/Outline.js';
import { ApiKeyModel } from './models/ApiKey.js';

// Services
import { EncryptionService } from './services/encryption.js';
import { AIService } from './services/ai/AIService.js';
import { GenerationEngine } from './services/generation/GenerationEngine.js';
import { QueueProcessor } from './services/generation/QueueProcessor.js';
import { EPUBGenerator } from './services/epub/EPUBGenerator.js';

// Routes
import { createUserRoutes } from './routes/users.js';
import { createApiKeyRoutes } from './routes/apikeys.js';
import { createNovelRoutes } from './routes/novels.js';
import { createChapterRoutes } from './routes/chapters.js';
import { createGenerationRoutes } from './routes/generation.js';
import { createExportRoutes } from './routes/export.js';
import { createBibleRoutes } from './routes/bible.js';

// Middleware
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { camelCaseResponse } from './middleware/caseConverter.js';

// Logging
import { createLogRoutes, requestLogger } from './routes/log.js';

// Configuration
const PORT = process.env.PORT || 3001;
const DATABASE_PATH = process.env.DATABASE_PATH || './data/plotpulse.db';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

if (!ENCRYPTION_KEY) {
  console.error('ERROR: ENCRYPTION_KEY environment variable is required');
  console.error('Generate one with: openssl rand -hex 32');
  process.exit(1);
}

// Initialize Express
const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || '*',
    credentials: true
  }
});

// Trust proxy (behind nginx)
app.set('trust proxy', 1);

// Request logging (before other middleware)
app.use(requestLogger);

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Case conversion middleware (snake_case DB → camelCase API)
app.use(camelCaseResponse);

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000,
  message: 'Too many requests, please try again later'
});
app.use('/api/', limiter);

// Initialize database and services
console.log('Initializing database...');
const db = initDatabase(DATABASE_PATH);

const encryptionService = new EncryptionService(ENCRYPTION_KEY);

const userModel = new UserModel(db);
const novelModel = new NovelModel(db);
const chapterModel = new ChapterModel(db);
const bibleModel = new StoryBibleModel(db);
const queueModel = new GenerationQueueModel(db);
const outlineModel = new OutlineModel(db);
const apiKeyModel = new ApiKeyModel(db, encryptionService);

const aiService = new AIService(apiKeyModel, OLLAMA_BASE_URL);
const generationEngine = new GenerationEngine(
  aiService,
  novelModel,
  chapterModel,
  bibleModel,
  outlineModel,
  queueModel
);
const epubGenerator = new EPUBGenerator(novelModel, chapterModel);

// Socket.IO event emitter for real-time updates
const socketEmit = (event, data) => {
  io.emit(event, data);
};

const queueProcessor = new QueueProcessor(queueModel, generationEngine, socketEmit);

// Store db and models in app.locals for access in routes
app.locals.db = db;
app.locals.models = {
  user: userModel,
  novel: novelModel,
  chapter: chapterModel,
  bible: bibleModel,
  queue: queueModel,
  outline: outlineModel,
  apiKey: apiKeyModel
};

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: Date.now(),
    queue: queueProcessor.getStatus()
  });
});

// API routes
app.use('/api/users', createUserRoutes(userModel));
app.use('/api/apikeys', createApiKeyRoutes(apiKeyModel, aiService));
app.use('/api/novels', createNovelRoutes(novelModel, outlineModel, bibleModel, chapterModel));
app.use('/api/chapters', createChapterRoutes(chapterModel, novelModel));
app.use('/api/generation', createGenerationRoutes(novelModel, chapterModel, outlineModel, queueModel));
app.use('/api/export', createExportRoutes(novelModel, epubGenerator));
app.use('/api/bible', createBibleRoutes(bibleModel, novelModel));

// Logging routes (no auth required)
app.use('/api/log', createLogRoutes());

// API key validation endpoint
app.post('/api/settings/validate-key', async (req, res) => {
  const { provider, key } = req.body;
  if (!provider || !key) {
    return res.status(400).json({ error: 'Provider and key required' });
  }
  
  try {
    if (provider === 'anthropic') {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5-20250514',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'hi' }]
        })
      });
      if (response.status === 401) {
        return res.status(400).json({ error: 'Invalid API key', valid: false });
      }
      // Any other response (including 200 or 429) means the key is valid
      return res.json({ valid: true, provider });
    } else if (provider === 'openai') {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${key}` }
      });
      if (response.status === 401) {
        return res.status(400).json({ error: 'Invalid API key', valid: false });
      }
      return res.json({ valid: true, provider });
    } else {
      return res.status(400).json({ error: 'Unknown provider' });
    }
  } catch (err) {
    console.error('Key validation error:', err.message);
    return res.status(500).json({ error: 'Validation request failed: ' + err.message });
  }
});

// AI models list endpoint
app.get('/api/models/ollama', async (req, res) => {
  try {
    const models = await aiService.listOllamaModels();
    res.json(models);
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch Ollama models',
      message: error.message 
    });
  }
});

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });

  // Allow clients to subscribe to specific novel updates
  socket.on('subscribe', (novelId) => {
    socket.join(`novel:${novelId}`);
    console.log(`Client ${socket.id} subscribed to novel ${novelId}`);
  });

  socket.on('unsubscribe', (novelId) => {
    socket.leave(`novel:${novelId}`);
    console.log(`Client ${socket.id} unsubscribed from novel ${novelId}`);
  });
});

// Recover orphaned tasks from previous crash/restart
(() => {
  // Reset any tasks stuck in 'processing' back to 'pending'
  const orphanedTasks = db.prepare(
    "UPDATE generation_queue SET status = 'pending', retry_count = retry_count WHERE status = 'processing'"
  ).run();
  if (orphanedTasks.changes > 0) {
    console.log(`Recovered ${orphanedTasks.changes} orphaned task(s) from interrupted processing`);
  }
  
  // Reset any chapters stuck in 'generating' back to 'pending'
  const orphanedChapters = db.prepare(
    "UPDATE chapters SET status = 'pending' WHERE status = 'generating'"
  ).run();
  if (orphanedChapters.changes > 0) {
    console.log(`Reset ${orphanedChapters.changes} chapter(s) from interrupted generation`);
  }
})();

// Start queue processor
console.log('Starting queue processor...');
queueProcessor.start().catch(err => {
  console.error('Queue processor error:', err);
});

// Start server
httpServer.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log('PlotPulse Backend Server');
  console.log('='.repeat(50));
  console.log(`Port: ${PORT}`);
  console.log(`Database: ${DATABASE_PATH}`);
  console.log(`Ollama: ${OLLAMA_BASE_URL}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('='.repeat(50));
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  queueProcessor.stop();
  httpServer.close(() => {
    db.close();
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  queueProcessor.stop();
  httpServer.close(() => {
    db.close();
    console.log('Server closed');
    process.exit(0);
  });
});
