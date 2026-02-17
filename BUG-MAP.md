# PlotPulse Bug Map - Complete API Mismatch Analysis

## Critical Issues Found

### 1. API Route Structure Mismatches

#### Settings / Model Listing
- **Frontend:** `GET /api/models/{provider}` (anthropic, openai, ollama)
- **Backend:** Only `GET /api/models/ollama` exists
- **Fix:** Add generic model listing endpoint or adjust frontend to only support Ollama

#### Outline Operations
- **Frontend:** `POST /api/generate/outline` with data in body
- **Backend:** `POST /api/generation/outline/:novelId` expects novelId in path
- **Fix:** Frontend needs to send novelId in path, not just body

- **Frontend:** `POST /api/novels/{novelId}/approve-outline`
- **Backend:** `POST /api/generation/outline/:novelId/approve`
- **Fix:** Update frontend to use correct route

#### Generation Operations
- **Frontend:** `POST /api/novels/{novelId}/generate`
- **Backend:** `POST /api/generation/novel/:novelId/generate-all`
- **Fix:** Update frontend to use correct route

- **Frontend:** `POST /api/novels/{novelId}/pause` (doesn't exist)
- **Backend:** No pause endpoint
- **Fix:** Add pause/resume endpoints to generation routes

- **Frontend:** `POST /api/novels/{novelId}/resume` (doesn't exist)
- **Backend:** No resume endpoint
- **Fix:** Add pause/resume endpoints to generation routes

#### Chapter Operations
- **Frontend:** `GET /api/novels/{novelId}/chapters`
- **Backend:** `GET /api/chapters/novel/:novelId`
- **Fix:** Update frontend to use correct route

- **Frontend:** `GET /api/novels/{novelId}/chapters/{chapterId}`
- **Backend:** `GET /api/chapters/:id`
- **Fix:** Update frontend to use backend structure

- **Frontend:** `PATCH /api/novels/{novelId}/chapters/{chapterId}`
- **Backend:** `PATCH /api/chapters/:id`
- **Fix:** Update frontend to use backend structure

- **Frontend:** `POST /api/novels/{novelId}/chapters/{chapterId}/regenerate`
- **Backend:** No regenerate endpoint
- **Fix:** Add regenerate endpoint to generation routes

#### Story Bible Operations
- **Frontend:** `GET /api/novels/{novelId}/story-bible`
- **Backend:** `GET /api/bible/:novelId`
- **Fix:** Update frontend to use `/api/bible/:novelId`

- **Frontend:** `PATCH /api/novels/{novelId}/story-bible`
- **Backend:** `PATCH /api/bible/:novelId`
- **Fix:** Update frontend to use `/api/bible/:novelId`

#### Export Operations
- **Frontend:** `POST /api/novels/{novelId}/export/epub`
- **Backend:** `POST /api/export/epub/:novelId`
- **Fix:** Update frontend to use correct route

#### Cost Analytics
- **Frontend:** `GET /api/novels/{novelId}/cost-stats`
- **Backend:** Only `GET /api/novels/:id/stats` exists (different data)
- **Fix:** Add cost-stats endpoint or adjust frontend expectations

- **Frontend:** `POST /api/estimate-cost` (doesn't exist)
- **Backend:** No cost estimation endpoint
- **Fix:** Add cost estimation endpoint or remove from frontend

### 2. Data Shape Mismatches

#### Novel Object Fields
- **Frontend expects:** `wordCount`, `totalCost`, `progress`, `updatedAt`, `premise`
- **Backend returns:** `current_word_count`, `total_cost`, `updated_at` (snake_case)
- **Fix:** Either add camelCase conversion middleware OR update frontend to use snake_case

#### Novel List Response
- **Frontend handles:** Both `{ novels: [...] }` and `[...]` (already flexible)
- **Backend returns:** `{ novels: [...] }`
- **Status:** ✓ No fix needed (frontend already handles both)

#### Chapter Object Fields
- **Frontend expects:** `chapterId`, `wordCount`, `flagged`, `flagNotes`
- **Backend returns:** `id`, `word_count` (snake_case)
- **Backend schema:** No `flagged` or `flag_notes` columns
- **Fix:** Add flagged/flag_notes columns to chapters table OR add to backend

#### Story Bible Structure
- **Frontend expects:** Flat object with `characters`, `world`, `timeline`, `themes`
- **Backend stores:** JSON blob in `content` column
- **Backend method:** `getParsed()` should return the parsed content
- **Fix:** Verify bible model returns correct structure

#### Outline Structure
- **Frontend expects:** `novel.outline.chapters` array with `{ title, summary }`
- **Backend stores:** Outline as separate table/model
- **Fix:** Include outline in novel GET response when mode is 'spark'

### 3. Missing Backend Endpoints

These need to be created:

1. `POST /api/generation/chapter/:chapterId/regenerate` - Regenerate a chapter with notes
2. `POST /api/generation/novel/:novelId/pause` - Pause generation
3. `POST /api/generation/novel/:novelId/resume` - Resume generation
4. `GET /api/models/anthropic` - List Anthropic models (or make generic)
5. `GET /api/models/openai` - List OpenAI models
6. `GET /api/novels/:novelId/cost-stats` - Get cost breakdown
7. `POST /api/cost/estimate` - Estimate generation cost

### 4. Missing Database Columns

Chapters table needs:
- `flagged` (INTEGER/BOOLEAN)
- `flag_notes` (TEXT)

### 5. Missing Imports/Exports

Need to verify all model imports/exports are consistent after skeptic agent rewrites.

### 6. Socket.IO Events

Frontend expects these socket events:
- `generation:progress` - Real-time chapter generation progress
- `generation:chapter-start` - When chapter generation starts
- `generation:chapter-complete` - When chapter completes
- `generation:complete` - When all generation complete
- `generation:error` - On errors

Backend needs to emit these from GenerationEngine/QueueProcessor.

## Fix Priority

### P0 (Breaks core functionality):
1. Fix outline generation route mismatch
2. Fix approve outline route mismatch
3. Fix generate-all route mismatch
4. Fix chapter listing route mismatch
5. Fix bible route mismatches
6. Fix export route mismatch
7. Add camelCase conversion OR update all frontend to snake_case

### P1 (Breaks secondary features):
1. Add pause/resume endpoints
2. Add regenerate endpoint
3. Add flagged columns to chapters
4. Fix cost-stats endpoint

### P2 (Nice to have):
1. Add model listing for all providers
2. Add cost estimation endpoint
3. Verify socket.io events are emitted correctly
