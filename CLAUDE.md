# Love on the Plate - Development Guide

## Tech Stack

- **Frontend**: Next.js 16.1 + React 19 + TypeScript
- **Styling**: TailwindCSS v4 + Framer Motion
- **Backend**: Next.js API Routes
- **Database/Auth/Storage**: Supabase (PostgreSQL, Magic Link, Storage)
- **AI**: Google Gemini (gemini-2.0-flash)

## Commands

```bash
npm run dev      # Development server
npm run build    # Production build
npm run lint     # ESLint
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
│   ├── gemini.ts             # AI integration
│   ├── validation.ts         # Input validation (UUID, base64)
│   └── client-image-compression.ts
└── types/
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
| `ai` | 1280x1280 | 0.7 | Gemini API |

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

**Gemini Error Codes**: `RATE_LIMIT`, `AUTH_ERROR`, `CONTENT_BLOCKED`, `SERVICE_UNAVAILABLE`, `PAYLOAD_TOO_LARGE`, `TIMEOUT`, `NETWORK_ERROR`

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
GOOGLE_GEMINI_API_KEY
GEMINI_MODEL=gemini-2.0-flash
NEXT_PUBLIC_APP_URL
```

## Security

- **Input Validation**: `isValidUUID()`, `isValidBase64Image()` in `src/lib/validation.ts`
- **Auth Callback**: Validates redirects against allowlist to prevent open redirects
- **RLS Policies**: Database-level access control
- `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS - keep secret
