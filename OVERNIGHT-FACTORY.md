# Overnight AI App Factory

## Concept
Every night, search for viral AI trends, pick the most interesting one, build a working app inspired by it, deploy to plex Docker, and present it in the morning briefing.

## Pipeline
1. **1:00 AM Central** — Cron fires isolated agent
2. **Search phase** — Web search for viral AI trends (Twitter/X, Reddit, Hacker News, Product Hunt, TikTok trends)
3. **Select** — Pick the most interesting, buildable, shareable concept
4. **Build** — Spawn sub-agents (backend, frontend, skeptic) 
5. **Deploy** — Docker container on plex, unique port per app
6. **Report** — Morning briefing includes link + description

## Design Standards
- Same award-winning UI/UX quality as PlotPulse
- Dark mode default, beautiful typography, Framer Motion animations
- Must be functional, not just a demo
- Each app gets its own Docker container and port

## Port Allocation
- 3000: Kanboard
- 3001: PlotPulse
- 3100+: Daily apps (increment each day)

## Future
- Push each app to GitHub
- Portfolio of AI micro-apps
- Potential income from any that go viral
