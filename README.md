# PlotPulse - AI Novel Generation Platform

**Status:** 🟡 Core Backend Complete, AI Integration & Frontend In Progress

A production-quality web application that generates full-length novels (70,000+ words) using AI models from Anthropic, OpenAI, or local Ollama.

---

## 🔒 Security Audit Summary

A comprehensive security audit was completed on 2026-02-09. **All critical security vulnerabilities have been fixed:**

✅ Authentication system (API key with SHA-256 hashing)  
✅ WebSocket authentication  
✅ Input validation & sanitization  
✅ Queue locking (race condition prevention)  
✅ Exponential backoff & circuit breaker  
✅ Rate limiting  
✅ CORS configuration  
✅ Cost tracking & spending limits  
✅ Encryption for AI provider keys  

See [AUDIT.md](./AUDIT.md) for complete details.

---

## ⚡ Quick Start

### Prerequisites

- Node.js 18+ (ESM support required)
- SQLite 3.35+ (for RETURNING support)

### Installation

```bash
# Clone repository
git clone <repo-url>
cd plotpulse

# Install backend dependencies
cd backend
npm install

# Generate encryption key
openssl rand -hex 32

# Copy and configure environment
cp .env.example .env
# Edit .env and set ENCRYPTION_KEY to the generated value

# Initialize database and start server
npm run dev
```

Server will start on http://localhost:3001

### First Steps

1. **Register a user and get an API key:**

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "your@email.com"}'
```

Save the `apiKey` from the response - you'll need it for all requests.

2. **Test authentication:**

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  http://localhost:3001/api/novels
```

3. **Create a novel:**

```bash
curl -X POST http://localhost:3001/api/novels \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "The Last Starship",
    "premise": "In the year 2847, humanity's last starship searches for a new home...",
    "mode": "spark",
    "model_provider": "anthropic",
    "model_name": "claude-sonnet-4",
    "target_word_count": 70000,
    "temperature": 0.7
  }'
```

---

## 📁 Project Structure

```
plotpulse/
├── backend/
│   ├── src/
│   │   ├── index.js              # Main server entry
│   │   ├── database/
│   │   │   └── init.js           # SQLite schema
│   │   ├── middleware/
│   │   │   ├── auth.js           # API key authentication
│   │   │   ├── validation.js     # Input validation
│   │   │   └── errorHandler.js   # Centralized error handling
│   │   ├── models/
│   │   │   ├── User.js
│   │   │   └── Novel.js
│   │   ├── routes/
│   │   │   ├── auth.js           # /api/auth/* endpoints
│   │   │   └── novels.js         # /api/novels/* endpoints
│   │   └── services/
│   │       ├── websocket.js      # Real-time updates
│   │       ├── queue.js          # Task queue with locking
│   │       ├── encryption.js     # AES-256-GCM encryption
│   │       ├── costTracking.js   # Cost estimation & limits
│   │       ├── ai.js             # 🚧 TODO: AI integration
│   │       ├── storyBible.js     # 🚧 TODO: Consistency engine
│   │       └── epub.js           # 🚧 TODO: EPUB generation
│   ├── package.json
│   └── .env.example
├── frontend/                      # 🚧 TODO: React app
├── SPEC.md                        # Product specification
├── AUDIT.md                       # Security audit report
└── README.md                      # This file
```

---

## 🔐 Authentication

PlotPulse uses API key authentication with secure hashing.

### Register a New User

```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "User created successfully",
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  },
  "apiKey": "64-character-hex-string",
  "warning": "Save this API key securely. It will not be shown again."
}
```

**Important:** The API key is only shown once! Store it securely.

### Verify API Key

```bash
GET /api/auth/verify
Authorization: Bearer YOUR_API_KEY
```

### Reset API Key

```bash
POST /api/auth/reset-key
Content-Type: application/json

{
  "email": "user@example.com",
  "currentKey": "your-current-api-key"
}
```

---

## 📚 API Endpoints

All endpoints (except `/api/auth/*`) require authentication via `Authorization: Bearer <api_key>` header.

### Novels

#### List Novels
```bash
GET /api/novels?limit=50&offset=0
```

#### Get Novel Details
```bash
GET /api/novels/:id
```

#### Create Novel
```bash
POST /api/novels
Content-Type: application/json

{
  "title": "Novel Title",
  "premise": "Brief story premise (10-10000 chars)",
  "mode": "spark",  // or "blueprint"
  "model_provider": "anthropic",  // "anthropic", "openai", or "ollama"
  "model_name": "claude-sonnet-4",
  "target_word_count": 70000,  // 10000-200000
  "temperature": 0.7  // 0-2
}
```

#### Update Novel
```bash
PATCH /api/novels/:id
Content-Type: application/json

{
  "title": "Updated Title",
  "status": "generating"
}
```

#### Delete Novel (Soft Delete)
```bash
DELETE /api/novels/:id
```

#### Get Chapters
```bash
GET /api/novels/:id/chapters
```

#### Get Progress
```bash
GET /api/novels/:id/progress
```

Returns real-time generation progress including chapter completion percentage.

---

## 🔌 WebSocket API

Connect to real-time updates via Socket.io:

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3001', {
  auth: {
    token: 'YOUR_API_KEY'
  }
});

// Subscribe to novel updates
socket.emit('subscribe:novel', novelId);

// Listen for progress
socket.on('progress', (data) => {
  console.log('Progress:', data);
  // { novelId, total_chapters, completed_chapters, latest_chapter }
});

// Listen for chapter completion
socket.on('chapter:complete', (data) => {
  console.log('Chapter complete:', data);
  // { novelId, chapterNumber, title, wordCount }
});

// Listen for errors
socket.on('generation:error', (data) => {
  console.error('Error:', data);
  // { novelId, error: { code, message, chapter } }
});

// Listen for completion
socket.on('generation:complete', (data) => {
  console.log('Novel complete!', data);
});

// Heartbeat
socket.on('heartbeat', () => {
  socket.emit('ping');
});

socket.on('pong', () => {
  console.log('Connection alive');
});
```

---

## 💰 Cost Tracking

PlotPulse includes comprehensive cost tracking to prevent runaway API spending.

### Default Spending Limit
- **$50/day per user** (configurable via `DAILY_SPENDING_LIMIT` env var)

### Check Spending
```bash
GET /api/novels/spending/analytics?timeRange=30
```

Returns:
- Total spending
- Daily breakdown
- Cost by model
- Average cost per novel

### Cost Estimation

Before starting a novel, get a cost estimate:

```javascript
// This endpoint will be available once AI service is implemented
GET /api/novels/estimate
{
  "outline": {...},
  "model_provider": "anthropic",
  "model_name": "claude-sonnet-4"
}
```

---

## ⚙️ Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3001` | Server port |
| `NODE_ENV` | No | `development` | Environment |
| `PLOTPULSE_DOMAIN` | No | `localhost` | Domain name |
| `DATABASE_PATH` | No | `./data/plotpulse.db` | SQLite database file |
| `ENCRYPTION_KEY` | **Yes** | - | 64-char hex (generate with `openssl rand -hex 32`) |
| `CORS_ORIGINS` | No | `http://localhost:5173` | Comma-separated allowed origins |
| `RATE_LIMIT_WINDOW_MS` | No | `900000` | Rate limit window (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | No | `100` | Max requests per window |
| `DAILY_SPENDING_LIMIT` | No | `50` | Max $ per user per day |

### Security Best Practices

1. **Generate a secure encryption key:**
   ```bash
   openssl rand -hex 32
   ```

2. **Never commit `.env` to version control**
   - `.env` is in `.gitignore`
   - Use `.env.example` as a template

3. **Use HTTPS in production**
   - Set `NODE_ENV=production`
   - Server will automatically redirect HTTP → HTTPS

4. **Rotate encryption keys periodically**
   ```javascript
   import { rotateEncryptionKey } from './services/encryption.js';
   await rotateEncryptionKey(db, oldKey, newKey);
   ```

5. **Monitor spending limits**
   - Review daily spending in logs
   - Adjust limits per user if needed

---

## 🚧 Remaining Work

### High Priority (Required for MVP)

1. **AI Integration Service** (`backend/src/services/ai.js`)
   - Anthropic API integration
   - OpenAI API integration
   - Ollama local model support
   - Streaming response handling
   - Content refusal detection
   - Token counting

2. **Story Bible Service** (`backend/src/services/storyBible.js`)
   - Generate initial bible from outline
   - Update after each chapter
   - Context window management
   - Sliding window for long novels

3. **EPUB Generation** (`backend/src/services/epub.js`)
   - EPUB file creation
   - Cover image handling
   - Metadata generation
   - Validation

4. **Frontend Application**
   - React UI components
   - WebSocket client integration
   - Novel editor
   - Progress visualization
   - Cost tracking dashboard

5. **Docker Deployment**
   - `docker-compose.yml`
   - Nginx reverse proxy config
   - Data volume persistence

### Nice to Have

- Email notifications (novel complete)
- User dashboard
- Novel sharing/collaboration
- Multi-language support
- Export formats (PDF, DOCX)
- Mobile app

---

## 🧪 Testing

### Manual Testing

```bash
# Health check
curl http://localhost:3001/health

# Metrics
curl http://localhost:3001/metrics

# Register user
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# Create novel (will fail until AI service is implemented)
curl -X POST http://localhost:3001/api/novels \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test Novel", "premise": "A test story", "mode": "spark", "model_provider": "anthropic", "model_name": "claude-sonnet-4"}'
```

### Automated Tests (TODO)

```bash
npm test           # Run all tests
npm run test:unit  # Unit tests
npm run test:e2e   # End-to-end tests
npm run test:load  # Load testing
```

---

## 📊 Monitoring

### Metrics Endpoint

```bash
GET /metrics
```

Returns:
```json
{
  "total_novels": 42,
  "active_generations": 3,
  "total_spent": 127.50
}
```

### Logs

The server logs important events:
- User authentication
- WebSocket connections
- Queue task processing
- API errors
- Cost tracking
- Circuit breaker state changes

In production, configure log aggregation (CloudWatch, Papertrail, etc.).

---

## 🐛 Troubleshooting

### "ENCRYPTION_KEY not set"

Generate a key:
```bash
openssl rand -hex 32
```
Add to `.env`:
```
ENCRYPTION_KEY=your-64-character-hex-string
```

### "Database is busy"

SQLite is under high write contention. Solutions:
1. Reduce concurrent novel generations
2. Increase `busy_timeout`: `db.pragma('busy_timeout = 5000')`
3. Migrate to PostgreSQL for production

### "Daily spending limit exceeded"

Increase limit in `.env`:
```
DAILY_SPENDING_LIMIT=100
```

Or per-user in database:
```sql
UPDATE users SET spending_limit_daily = 100 WHERE email = 'user@example.com';
```

### WebSocket won't connect

Ensure:
1. API key is valid
2. CORS origin matches frontend URL
3. WebSocket upgrade headers are allowed
4. No proxy blocking WebSocket connections

---

## 📄 License

UNLICENSED - Private project

---

## 🤝 Contributing

This is a private project. For issues or questions, contact the development team.

---

## 📞 Support

- **Documentation:** [SPEC.md](./SPEC.md) - Product specification
- **Security:** [AUDIT.md](./AUDIT.md) - Security audit report
- **API:** See "API Endpoints" section above

---

**Built with ❤️ for writers who want to explore AI-assisted storytelling.**
