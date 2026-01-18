# Love on the Plate - Development Guide

## Project Overview

A webapp to document and celebrate homemade meals with AI-generated descriptions.

## Tech Stack

- **Frontend**: Next.js 16.1 + React 19 + TypeScript
- **Styling**: TailwindCSS v4 + Framer Motion
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (Magic Link)
- **Storage**: Supabase Storage
- **AI**: Google Gemini (gemini-2.0-flash)

## Commands

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Project Structure

```
src/
├── app/
│   ├── layout.tsx         # Root layout + providers
│   ├── page.tsx           # Home (public gallery)
│   ├── admin/
│   │   ├── page.tsx       # Upload dashboard
│   │   └── login/page.tsx # Login page
│   └── api/
│       ├── upload/        # Image upload + processing
│       ├── describe/      # Gemini description
│       └── photos/        # CRUD operations
├── components/
│   ├── ui/                # Reusable UI components
│   ├── layout/            # Header, Footer
│   ├── gallery/           # Gallery, PhotoCard, PhotoModal
│   └── upload/            # UploadZone, ImagePreview
├── lib/
│   ├── supabase/          # Client + server utilities
│   ├── gemini.ts          # AI integration
│   └── image-processing.ts
└── types/
```

## Database Schema

- `photos` table with RLS policies
- Fields: `id`, `storage_path`, `thumbnail_path`, `description_en`, `description_cn`, `original_filename`, `file_size`, `width`, `height`, `captured_at`, `created_at`, `updated_at`, `uploaded_by`
- Public SELECT, authenticated INSERT/UPDATE/DELETE
- Cursor-based pagination on `created_at`

## Key Features

- Three gallery views: Floating Plates, Masonry Grid, Love Timeline
- Magic link authentication
- **Bilingual AI descriptions** (English + Chinese)
- Image optimization (2000px full, 400px thumbnail)
- Infinite scroll pagination
- Dark/light mode
- Mobile-first bottom navigation
- Semantic design token system

## Design System v2.0

### Philosophy: "Intimate Minimalism Meets Culinary Poetry"

Every pixel serves a purpose. Warmth over coldness. Motion as emotion.

### Semantic Tokens

Use these CSS custom properties (not raw colors):

| Category    | Tokens                                                               |
| ----------- | -------------------------------------------------------------------- |
| **Canvas**  | `--canvas`, `--canvas-elevated`, `--canvas-recessed`                 |
| **Ink**     | `--ink`, `--ink-secondary`, `--ink-tertiary`                         |
| **Stroke**  | `--stroke`, `--stroke-emphasis`                                      |
| **Brand**   | `--love`, `--love-soft`, `--love-intense`, `--warmth`, `--freshness` |
| **Shadows** | `--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-glow`         |

### Typography Classes

| Class           | Purpose                       |
| --------------- | ----------------------------- |
| `.font-display` | Headlines (Fraunces)          |
| `.font-body`    | Body text (Plus Jakarta Sans) |
| `.font-accent`  | Handwritten (Caveat)          |
| `.text-hero`    | Largest display text          |
| `.text-display` | Section headers               |
| `.text-heading` | Card titles                   |
| `.text-body`    | Primary content               |
| `.text-caption` | Timestamps, metadata          |
| `.text-micro`   | Badges, labels                |

### Animation Classes

| Class                 | Effect             |
| --------------------- | ------------------ |
| `.animate-heartbeat`  | Heart pulse effect |
| `.animate-pulse-glow` | Glowing ring       |
| `.animate-float`      | Gentle floating    |
| `.animate-shimmer`    | Loading skeleton   |
| `.animate-fade-in-up` | Entrance animation |
| `.animate-scale-in`   | Scale entrance     |

### Layout Utilities

| Class           | Purpose                    |
| --------------- | -------------------------- |
| `.glass`        | Glass morphism background  |
| `.focus-ring`   | Accessible focus indicator |
| `.safe-bottom`  | Safe area inset for mobile |
| `.hide-mobile`  | Hidden on mobile           |
| `.hide-desktop` | Hidden on desktop          |

## Custom Hooks

Located in `src/lib/hooks/`:

### useTypewriter / useDualTypewriter

Animated text reveal with configurable options:

```tsx
import { useTypewriter, useDualTypewriter } from "@/lib/hooks/use-typewriter";

// Single language
const { displayedText, isComplete, skip, reset } = useTypewriter(text, {
  speed: 30, // ms per character
  delay: 500, // initial delay
  jitter: 10, // random variation
});

// Dual language (synchronized)
const { en, cn, isComplete, skip, reset } = useDualTypewriter(enText, cnText);
```

### useHeartbeat

Trigger heartbeat animation on success actions:

```tsx
import { useHeartbeat } from "@/lib/hooks/use-heartbeat";

const { isBeating, triggerHeartbeat } = useHeartbeat(1000); // duration in ms

<Heart className={isBeating ? "animate-heartbeat text-love" : ""} />;
```

## Toast System

Feedback notifications with heart animation:

```tsx
import { useToast } from "@/components/ui";

const { showToast } = useToast();

showToast("Photo uploaded!", "success"); // Green with heart
showToast("Failed to upload", "error"); // Red
showToast("Processing...", "info"); // Blue
```

**Note:** Wrap app in `<ToastProvider>` (already in root layout).

## Interaction Patterns

### Envelope Modal

Photo modal uses envelope metaphor:

- **Flap Animation**: 3D transform on open (180° rotation)
- **Staged Reveal**: Image → Title → Description with delays
- **Typewriter Effect**: AI descriptions type out character-by-character
- **Signature**: "With love" handwritten accent at bottom

### View Transitions

Gallery view switching uses directional morphing:

- **Horizontal**: Masonry ↔ Floating (slide left/right)
- **Vertical**: Masonry ↔ Timeline (slide up/down)
- **Diagonal**: Floating ↔ Timeline (combined)

AnimatePresence with LayoutGroup ensures smooth layout animations.

### Responsive Architecture

- **Mobile (<768px)**: Bottom navigation for view switching
- **Desktop (≥768px)**: Header with sticky view switcher
- Footer has `mb-16 md:mb-0` to accommodate bottom nav

## Bilingual Descriptions

Each photo has two description fields:

- `description_en`: English description
- `description_cn`: Chinese (Simplified) description

### AI Generation

The Gemini prompt generates both descriptions in a single API call, returning JSON:

```json
{ "en": "English description", "cn": "中文描述" }
```

### API Responses

- `/api/describe` returns: `{ descriptionEn, descriptionCn }`
- `/api/upload` stores both in database
- `/api/photos` PATCH accepts: `{ photoId, descriptionEn, descriptionCn }`

### Frontend Display

| Component      | English           | Chinese              |
| -------------- | ----------------- | -------------------- |
| PhotoCard      | Primary text      | Secondary (muted)    |
| PhotoModal     | Main section      | Below border divider |
| FloatingPlates | Hover overlay     | Lighter text below   |
| LoveTimeline   | Primary           | Lighter text below   |
| ImagePreview   | Editable textarea | Separate textarea    |

## Environment Variables

Required environment variables (see `.env.example`):

- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `GOOGLE_GEMINI_API_KEY` - Google AI Studio API key
- `GEMINI_MODEL` - Gemini model name (default: `gemini-2.0-flash`)
- `NEXT_PUBLIC_APP_URL` - App URL (for auth redirects)

## Deployment to Vercel

### Quick Deploy

1. Push code to GitHub/GitLab/Bitbucket
2. Import project at [vercel.com/new](https://vercel.com/new)
3. Add environment variables in Vercel dashboard
4. Update Supabase auth redirect URLs
5. Deploy

### Supabase Production Config

- Add Vercel URL to Site URL in Supabase Auth settings
- Add redirect URL: `https://your-app.vercel.app/auth/callback`

### Security Considerations

- `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS - keep it secret
- API routes validate authentication before mutations
- File uploads are validated for type and size
- Image processing uses Sharp for secure handling
