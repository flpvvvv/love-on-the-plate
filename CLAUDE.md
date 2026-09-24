# Love on the Plate - Development Guide

## Tech Stack

- **Frontend**: Next.js 16.2 + React 19 + TypeScript 6
- **Styling**: TailwindCSS v4 + Framer Motion
- **Backend**: Next.js API Routes
- **Database/Auth/Storage**: Supabase (PostgreSQL, Magic Link, Storage)
- **AI**: DeepSeek (deepseek-flash, OpenAI-compatible API)

## Commands

```bash
pnpm dev        # Development server
pnpm build      # Production build
pnpm lint       # Biome lint check
pnpm lint:fix   # Biome lint + auto-fix
pnpm format     # Biome format all files
pnpm test       # Vitest in watch mode
pnpm test:run   # Vitest run once
pnpm test:coverage # Vitest with coverage
```

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Public gallery
│   ├── admin/page.tsx        # Upload dashboard
│   ├── admin/login/page.tsx  # Login
│   └── api/                  # upload/, describe/, photos/, backfill/
├── components/
│   ├── ui/                   # Button, Dialog, Toast, ViewSwitcher
│   ├── layout/               # Header, Footer, BottomNav
│   ├── gallery/              # Gallery, PhotoCard, PhotoModal
│   │   └── views/            # FloatingPlates, MasonryGrid, LoveTimeline
│   └── upload/               # UploadZone, ImagePreview
├── lib/
│   ├── hooks/                # useHeartbeat
│   ├── supabase/             # Client + server utilities
│   ├── ai.ts                 # AI integration
│   ├── validation.ts         # Input validation (UUID, base64)
│   └── client-image-compression.ts
└── types/
```

## Testing

### Framework
Vitest with React Testing Library (jsdom environment).

### Test Files
Located next to source files: `src/**/*.test.{ts,tsx}`

### What to Test
- **Utilities**: Pure functions in `src/lib/` (validation, utils, client-image-compression)
- **Hooks**: React hooks in `src/lib/hooks/` using `renderHook`
- **API Routes**: Mock Supabase clients for route tests

### Running Tests
```bash
pnpm test        # Watch mode
pnpm test:run    # Single run
pnpm test:coverage # Coverage report
```

## Database Schema

**`photos` table**: `id`, `storage_path`, `thumbnail_path`, `dish_name`, `description_en`, `description_cn`, `original_filename`, `file_size`, `width`, `height`, `created_at`, `updated_at`, `uploaded_by`

- RLS: Public SELECT, authenticated INSERT/UPDATE/DELETE
- Cursor-based pagination on `created_at`

## Design System

### Semantic Tokens (use these, not raw colors)

| Category | Tokens |
|----------|--------|
| Canvas | `--canvas`, `--canvas-elevated`, `--canvas-recessed` |
| Ink | `--ink`, `--ink-secondary`, `--ink-tertiary` |
| Brand | `--love`, `--love-soft`, `--warmth`, `--freshness` |

### Typography

| Class | Font |
|-------|------|
| `.font-display` | Fraunces (headlines) |
| `.font-body` | Plus Jakarta Sans |
| `.font-accent` | Caveat (handwritten) |

### Animation Classes

`.animate-heartbeat`, `.animate-float`, `.animate-shimmer`, `.animate-fade-in-up`, `.animate-scale-in`

## Key Patterns

### Toast System

```tsx
import { useToast } from "@/components/ui";
const { showToast } = useToast();
showToast("Photo uploaded!", "success");
```

### Photo Modal Swipe (Mobile)

Uses `useAnimation()` for programmatic control with momentum-preserving gestures:
- Velocity-based navigation (300px/s threshold OR 80px distance)
- 3D rotation follows swipe direction (rotateY, rotateZ)
- Cards exit with swipe momentum, new cards enter from opposite side
- Rubber-band effect when can't navigate

### Image Compression (Two-Tier)

| Preset | Resolution | Quality | Purpose |
|--------|------------|---------|---------|
| `upload` | 1920x1920 | 0.8 | Supabase storage |
| `ai` | 1280x1280 | 0.7 | DeepSeek API |

```tsx
import { compressImage, COMPRESSION_PRESETS } from '@/lib/client-image-compression';
const uploadBase64 = await compressImage(file, COMPRESSION_PRESETS.upload);
```

## API Reference

### Authorization Matrix

| Endpoint | Auth | Admin |
|----------|------|-------|
| `GET /api/photos` | No | No |
| `PATCH /api/photos` | Yes | Owner only |
| `DELETE /api/photos` | Yes | Yes or owner |
| `POST /api/upload` | Yes | Yes |
| `POST /api/describe` | Yes | Yes |

### Bilingual Descriptions

- `/api/describe` returns: `{ descriptionEn, descriptionCn, dishName }`
- `/api/photos` PATCH accepts: `{ photoId, descriptionEn, descriptionCn, dishName }`

### Error Response Format

```json
{ "error": "Message", "code": "ERROR_CODE", "isRetryable": true }
```

**AI Error Codes**: `RATE_LIMIT`, `AUTH_ERROR`, `CONTENT_BLOCKED`, `SERVICE_UNAVAILABLE`, `PAYLOAD_TOO_LARGE`, `INVALID_REQUEST`, `TIMEOUT`, `NETWORK_ERROR`, `EMPTY_RESPONSE`, `INVALID_INPUT`

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY
DEEPSEEK_API_KEY
DEEPSEEK_MODEL=deepseek-flash
NEXT_PUBLIC_APP_URL
```

## Security

- **Input Validation**: `isValidUUID()`, `isValidBase64Image()` in `src/lib/validation.ts`
- **Auth Callback**: Validates redirects against allowlist to prevent open redirects
- **RLS Policies**: Database-level access control
- `SUPABASE_SECRET_KEY` (`sb_secret_...`) maps to the `service_role` role and bypasses RLS - keep secret

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
