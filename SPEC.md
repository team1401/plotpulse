# PlotPulse — Novel Generation Web App

## Vision
A beautiful, production-quality web app that takes a brief outline and generates a full 70,000+ word novel using AI. Designed to become a commercial product.

## Domain
- plotpulse.ai / plotpulse.com (DO NOT hardcode — use env var `PLOTPULSE_DOMAIN` or config)

## Deployment
- **Initial host:** plex server (100.97.65.28 via Tailscale, SSH: helix@plex)
- **Future:** Mac Mini (arriving tomorrow), then potentially cloud for public launch
- **Container:** Docker Compose on plex
- **Port:** 3001 (3000 is Kanboard)

## Tech Stack
- **Frontend:** React + Vite + TailwindCSS + Framer Motion (animations)
- **Backend:** Node.js + Express + SQLite (simple, portable)
- **AI Integration:** Anthropic SDK, OpenAI SDK, Ollama (local LLM)
- **Export:** EPUB generation (epub-gen or similar)
- **Auth:** Simple API key per user (no complex auth initially, but architected for it)

## Core Features

### Two Input Modes
1. **Spark Mode** — User provides a brief premise/idea. App generates:
   - Detailed outline with chapter summaries
   - Character profiles
   - World/setting details
   - Theme notes
   - User reviews and approves/edits before generation begins
2. **Blueprint Mode** — User provides structured chapter-by-chapter outline. App validates and fills gaps, then generates.

### Model Selection
- Anthropic: Claude Sonnet 4, Claude Opus 4 (user chooses)
- OpenAI: GPT-4o, o1, o3 (user chooses)
- Local: Ollama models (auto-detected)
- User provides their own API key (stored encrypted in browser localStorage or server-side)
- Model can be changed mid-novel (e.g., use Opus for critical chapters, Sonnet for others)

### Story Bible (Consistency Engine)
- Auto-generated and maintained document tracking:
  - Characters (physical descriptions, personality, speech patterns, relationships, arcs)
  - World rules, locations, technology, magic systems
  - Timeline of events
  - Themes, motifs, symbols
  - Tone/voice guide
  - Style reference (user-provided or generated)
- Updated after each chapter generation
- Visible and editable in the UI
- Used as context for every subsequent chapter

### Generation Workflow
- **Autonomous Mode:** Hit go, come back to a complete novel. Progress shown in real-time.
- **Interactive Mode:** Review/approve each chapter. Provide feedback. Steer the story.
- **Toggle between modes mid-generation**
- **Post-generation review:** Chapter-by-chapter review panel. Flag chapters for rewrite with notes. Regenerate while maintaining bible consistency.
- **Creativity slider:** Temperature/creativity control (conservative → experimental)

### EPUB Export
- Professional EPUB output
- Cover image: upload custom OR auto-generate
- Front matter: title page, copyright, dedication, TOC — manual or auto-generated
- Chapter titles: manual or auto-generated
- Font/formatting options

### Cost Tracking
- Per-chapter token usage and cost
- Running total per novel
- Cost estimates before starting (based on model + outline length)
- Model comparison: "This novel would cost ~$X on Sonnet, ~$Y on Opus"

### Novel Dashboard
- All novels with status (outlining, drafting, reviewing, complete)
- Word counts, chapter progress
- Total cost spent
- Resume interrupted generations

## Design Philosophy
- **Award-winning UI/UX** — Think Linear, Vercel, Stripe level polish
- Dark mode default, light mode option
- Smooth animations (Framer Motion)
- Typography-first design (this is a WRITING app)
- Progress visualization during generation (not just a spinner)
- Mobile responsive but desktop-first
- No domain hardcoded anywhere — all configurable via environment

## Architecture Notes
- Backend handles all AI API calls (keys never exposed to frontend)
- SQLite for novels, chapters, story bibles, user settings
- WebSocket for real-time generation progress
- Queue system for chapter generation (retry on failure)
- Each chapter generation includes: story bible context + outline + previous chapter summary + style guide
- Word count enforcement: if Claude undershoots target, auto-retry with "expand" prompt
- API keys encrypted at rest

## Security Considerations
- API keys encrypted before storage
- No secrets in frontend code
- Rate limiting
- Input sanitization
- CORS properly configured
- No eval() or dynamic code execution
- Dependencies audited

## File Structure
```
plotpulse/
├── docker-compose.yml
├── .env.example
├── backend/
│   ├── package.json
│   ├── src/
│   │   ├── index.js          # Express server entry
│   │   ├── routes/           # API routes
│   │   ├── services/         # AI, EPUB, Bible services
│   │   ├── models/           # SQLite models
│   │   ├── middleware/        # Auth, rate limiting
│   │   └── utils/            # Helpers
│   └── Dockerfile
├── frontend/
│   ├── package.json
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/       # UI components
│   │   ├── pages/            # Route pages
│   │   ├── hooks/            # Custom hooks
│   │   ├── stores/           # State management
│   │   └── styles/           # Tailwind + custom
│   ├── Dockerfile
│   └── vite.config.js
└── nginx.conf                # Reverse proxy
```
