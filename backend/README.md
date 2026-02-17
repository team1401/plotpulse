# PlotPulse Backend

Backend API server for PlotPulse novel generation platform. Built with Node.js, Express, SQLite, and Socket.IO with support for Anthropic, OpenAI, and Ollama AI providers.

## Features

- ✨ **Multi-AI Provider Support** - Anthropic Claude, OpenAI GPT/O-series, and local Ollama models
- 📚 **Novel Generation Engine** - Outline generation, chapter-by-chapter writing with story bible consistency
- 🔄 **Queue System** - Robust task queue with retry logic for reliable generation
- 📖 **Story Bible** - Automatic tracking and maintenance of characters, world rules, timeline, and themes
- 📊 **Real-time Updates** - WebSocket support for live progress tracking
- 💰 **Cost Tracking** - Token counting and cost calculation per model
- 📦 **EPUB Export** - Professional EPUB generation with metadata and formatting
- 🔐 **API Key Encryption** - AES-256-GCM encrypted storage of user API keys
- 🚀 **Docker Support** - Containerized deployment

## Quick Start

### Prerequisites

- Node.js 22+
- OpenSSL (for generating encryption key)

### Installation

```bash
# Install dependencies
npm install

# Generate encryption key
openssl rand -hex 32

# Create .env file
cp .env.example .env
# Edit .env and add your ENCRYPTION_KEY
```

### Configuration

Edit `.env`:

```bash
PORT=3001
NODE_ENV=production
PLOTPULSE_DOMAIN=plotpulse.ai

DATABASE_PATH=./data/plotpulse.db
ENCRYPTION_KEY=your-32-byte-hex-key-here

CORS_ORIGINS=http://localhost:5173,http://localhost:3000

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Optional: Default API keys (users can provide their own)
# ANTHROPIC_API_KEY=
# OPENAI_API_KEY=
# OLLAMA_BASE_URL=http://localhost:11434
```

### Run

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

Server starts on `http://localhost:3001`

## Docker Deployment

```bash
# Build image
docker build -t plotpulse-backend .

# Run container
docker run -d \
  --name plotpulse-backend \
  -p 3001:3001 \
  -v plotpulse-data:/app/data \
  -e ENCRYPTION_KEY=your-key-here \
  -e CORS_ORIGINS=https://yourdomain.com \
  plotpulse-backend
```

## API Documentation

All endpoints require `x-user-id` header for authentication (except `/health` and `/api/users`).

### Health Check

```http
GET /health
```

Returns server status and queue information.

### Users

#### Create/Get User
```http
POST /api/users
Content-Type: application/json

{
  "email": "user@example.com"
}
```

Returns user object with ID. Idempotent - returns existing user if email already exists.

#### Get User
```http
GET /api/users/:id
```

### API Keys

All API key endpoints require authentication (`x-user-id` header).

#### Store API Key
```http
POST /api/apikeys
x-user-id: user-id-here
Content-Type: application/json

{
  "provider": "anthropic",
  "apiKey": "sk-ant-..."
}
```

Providers: `anthropic`, `openai`

#### List API Keys
```http
GET /api/apikeys
x-user-id: user-id-here
```

Returns list of providers (without exposing actual keys).

#### Delete API Key
```http
DELETE /api/apikeys/:provider
x-user-id: user-id-here
```

### Novels

#### Create Novel
```http
POST /api/novels
x-user-id: user-id-here
Content-Type: application/json

{
  "title": "My Novel",
  "premise": "A story about...",
  "mode": "spark",
  "target_word_count": 70000,
  "model_provider": "anthropic",
  "model_name": "claude-sonnet-4",
  "temperature": 0.7
}
```

Modes: `spark` (generate outline from premise) or `blueprint` (user provides outline)

#### List User's Novels
```http
GET /api/novels?limit=100&offset=0
x-user-id: user-id-here
```

#### Get Novel
```http
GET /api/novels/:id
x-user-id: user-id-here
```

#### Get Novel with Full Details
```http
GET /api/novels/:id/full
x-user-id: user-id-here
```

Includes outline, story bible, and chapters.

#### Get Novel Stats
```http
GET /api/novels/:id/stats
x-user-id: user-id-here
```

Returns word counts, chapter progress, and cost information.

#### Update Novel
```http
PATCH /api/novels/:id
x-user-id: user-id-here
Content-Type: application/json

{
  "title": "Updated Title",
  "status": "generating",
  "temperature": 0.8
}
```

#### Delete Novel
```http
DELETE /api/novels/:id
x-user-id: user-id-here
```

### Chapters

#### Create Chapter
```http
POST /api/chapters
x-user-id: user-id-here
Content-Type: application/json

{
  "novel_id": "novel-id",
  "chapter_number": 1,
  "title": "Chapter One",
  "outline": "Chapter outline or summary",
  "model_provider": "anthropic",
  "model_name": "claude-sonnet-4"
}
```

#### Get Chapters for Novel
```http
GET /api/chapters/novel/:novelId
x-user-id: user-id-here
```

#### Get Chapter
```http
GET /api/chapters/:id
x-user-id: user-id-here
```

#### Update Chapter
```http
PATCH /api/chapters/:id
x-user-id: user-id-here
Content-Type: application/json

{
  "title": "Updated Title",
  "content": "Chapter text...",
  "status": "completed"
}
```

#### Delete Chapter
```http
DELETE /api/chapters/:id
x-user-id: user-id-here
```

### Generation

#### Generate Outline (Spark Mode)
```http
POST /api/generation/outline/:novelId
x-user-id: user-id-here
```

Queues outline generation task. Returns task ID.

#### Approve Outline
```http
POST /api/generation/outline/:novelId/approve
x-user-id: user-id-here
```

Approves outline and sets novel status to `ready`.

#### Generate Single Chapter
```http
POST /api/generation/chapter/:chapterId
x-user-id: user-id-here
```

Queues chapter generation task.

#### Generate All Chapters (Autonomous Mode)
```http
POST /api/generation/novel/:novelId/generate-all
x-user-id: user-id-here
```

Creates chapters from outline and queues all for generation.

#### Get Generation Status
```http
GET /api/generation/novel/:novelId/status
x-user-id: user-id-here
```

Returns current generation progress, queue status, and costs.

### Story Bible

#### Get Story Bible
```http
GET /api/bible/:novelId
x-user-id: user-id-here
```

Returns story bible with characters, world rules, timeline, themes, and tone guide.

#### Update Story Bible
```http
PATCH /api/bible/:novelId
x-user-id: user-id-here
Content-Type: application/json

{
  "characters": {
    "Alice": {
      "description": "Tall, red hair, confident",
      "arc": "Learns to trust others"
    }
  },
  "world_rules": {
    "magic": "Costs life force to use"
  },
  "themes": ["redemption", "sacrifice"],
  "tone_guide": "Dark fantasy with hope"
}
```

#### Create Story Bible
```http
POST /api/bible/:novelId
x-user-id: user-id-here
Content-Type: application/json

{
  "characters": {},
  "world_rules": {},
  "timeline": [],
  "themes": []
}
```

### Export

#### Export as EPUB
```http
POST /api/export/epub/:novelId
x-user-id: user-id-here
Content-Type: application/json

{
  "author": "Author Name",
  "dedication": "For my readers",
  "copyright": "© 2026 Author Name"
}
```

Returns EPUB file as attachment.

#### Export as JSON
```http
GET /api/export/json/:novelId
x-user-id: user-id-here
```

Returns complete novel data as JSON (for backup/import).

### AI Models

#### List Ollama Models
```http
GET /api/models/ollama
```

Returns available Ollama models.

## WebSocket Events

Connect to Socket.IO at `http://localhost:3001`

### Client → Server

```javascript
// Subscribe to novel updates
socket.emit('subscribe', novelId);

// Unsubscribe
socket.emit('unsubscribe', novelId);
```

### Server → Client

```javascript
// Outline generation
socket.on('outline:start', (data) => { /* { novelId } */ });
socket.on('outline:complete', (data) => { /* { novelId, outline, cost } */ });
socket.on('outline:error', (data) => { /* { novelId, error } */ });

// Chapter generation
socket.on('chapter:start', (data) => { /* { novelId, chapterId, chapterNumber } */ });
socket.on('chapter:expanding', (data) => { /* { novelId, chapterId, currentWords, targetWords } */ });
socket.on('chapter:complete', (data) => { /* { novelId, chapterId, chapterNumber, wordCount, cost } */ });
socket.on('chapter:error', (data) => { /* { novelId, chapterId, chapterNumber, error } */ });
```

## Architecture

### Database Schema

- **users** - User accounts
- **api_keys** - Encrypted API keys per user/provider
- **novels** - Novel metadata and settings
- **outlines** - Generated outlines (Spark mode)
- **chapters** - Chapter content and metadata
- **story_bibles** - Character/world consistency tracking
- **generation_queue** - Task queue for async generation

### Services

- **AIService** - Abstraction over Anthropic/OpenAI/Ollama APIs
- **GenerationEngine** - Core novel generation logic
- **QueueProcessor** - Background task processing with retry logic
- **EPUBGenerator** - EPUB file creation
- **EncryptionService** - AES-256-GCM encryption for API keys

### Generation Flow

1. **Spark Mode**: Premise → Outline generation → User approval → Chapter creation → Generation queue
2. **Blueprint Mode**: User provides outline → Chapter creation → Generation queue
3. **Queue Processor**: Picks tasks, generates content, updates story bible, tracks costs
4. **Word Count Enforcement**: Retry with expansion prompt if chapter undershoots target
5. **Real-time Updates**: WebSocket events for progress tracking

## Cost Tracking

Token usage and costs are tracked per:
- Individual chapters (`chapters.cost`, `chapters.tokens_used`)
- Entire novel (`novels.total_cost`, `novels.total_tokens`)

Pricing is built into each AI provider class and automatically calculated based on:
- Model selected
- Input tokens (prompt)
- Output tokens (completion)

Current pricing (as of Feb 2026):
- **Claude Opus 4**: $15/1M input, $75/1M output
- **Claude Sonnet 4**: $3/1M input, $15/1M output
- **GPT-4o**: $2.50/1M input, $10/1M output
- **O1**: $15/1M input, $60/1M output
- **Ollama**: Free (local)

## Security

- API keys encrypted at rest using AES-256-GCM
- Keys never exposed in API responses
- CORS configuration for frontend domains
- Rate limiting on all API routes
- Helmet.js security headers
- Input sanitization via Express JSON parsing
- User isolation (all queries filtered by user_id)

## Troubleshooting

### Queue Not Processing

Check queue status:
```bash
curl http://localhost:3001/health
```

### Database Locked

SQLite WAL mode is enabled. If issues persist:
```bash
# Stop server
# Delete WAL files
rm data/*.db-shm data/*.db-wal
# Restart server
```

### Ollama Connection Failed

Verify Ollama is running:
```bash
curl http://localhost:11434/api/tags
```

Update `OLLAMA_BASE_URL` in `.env` if using different host/port.

### API Key Decryption Failed

This means your `ENCRYPTION_KEY` changed. Keys encrypted with the old key cannot be decrypted. Users must re-enter their API keys.

## Development

```bash
# Install dependencies
npm install

# Run with auto-reload
npm run dev

# Run tests (when implemented)
npm test
```

## Production Deployment

1. Generate strong encryption key: `openssl rand -hex 32`
2. Set environment variables (never commit `.env` to git)
3. Use process manager (PM2, systemd) or Docker
4. Configure reverse proxy (nginx/Caddy) for HTTPS
5. Set `NODE_ENV=production`
6. Enable logging and monitoring
7. Regular database backups (`data/plotpulse.db`)

## License

Proprietary - PlotPulse Platform

---

Built with ❤️ for novelists, by developers who love great stories.
