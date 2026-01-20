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
│   ├── ui/                # Reusable UI components (Button, Dialog, Toast, ViewSwitcher)
│   ├── layout/            # Header, Footer, BottomNav
│   ├── gallery/           # Gallery, PhotoCard, PhotoModal
│   │   └── views/         # FloatingPlates, MasonryGrid, LoveTimeline
│   └── upload/            # UploadZone, ImagePreview
├── lib/
│   ├── hooks/             # Custom React hooks (useHeartbeat)
│   ├── supabase/          # Client + server utilities
│   ├── gemini.ts          # AI integration
│   └── image-processing.ts
└── types/
```

## Database Schema

- `photos` table with RLS policies
- Fields: `id`, `storage_path`, `thumbnail_path`, `description_en`, `description_cn`, `original_filename`, `file_size`, `width`, `height`, `created_at`, `updated_at`, `uploaded_by`
- Public SELECT, authenticated INSERT/UPDATE/DELETE
- Cursor-based pagination on `created_at`

## Key Features

- Three gallery views: Floating Plates, Masonry Grid, Love Timeline
- Magic link authentication
- **Bilingual AI descriptions** (English + Chinese)
- Image optimization (2000px full, 400px thumbnail)
- Infinite scroll pagination
- Dark/light mode with logo adaptation
- Mobile-first bottom navigation
- Photo modal with prev/next navigation (keyboard and touch support)
- Directional view transitions with blur effects
- Semantic design token system
- Toast notification system with heartbeat animation

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

### Photo Modal

Photo modal features smooth, unified animations and 3D card interactions:

**Mobile Swipe Effects:**

- **3D Perspective Rotation**: Card rotates on Y-axis (-15° to 15°) and Z-axis (-8° to 8°) during swipe, creating a realistic page-flip effect
- **Dynamic Lift Effect**: Card rises (translateY: -15px) at drag midpoints, simulating physical card lift
- **Responsive Shadow**: Shadow offset, blur, and opacity respond to swipe direction in real-time using `useTransform`
- **Spring Physics**: Uses `useSpring` with damping: 25, stiffness: 400, mass: 0.5 for smooth 3D transforms
- **Optimized Drag**: Elastic coefficient of 0.12 with 80px swipe threshold

**Desktop Hover Effects:**

- **3D Hover Tilt**: Card tilts based on mouse position (rotateY: ±8°, rotateX: ±6°) for an interactive, premium feel
- **Spring-smoothed Mouse Tracking**: Mouse position smoothed with damping: 30, stiffness: 300, mass: 0.5
- **Combined Transforms**: Hover tilt adds to swipe rotation for seamless interaction
- **Auto-reset**: Card smoothly returns to neutral when mouse leaves

**Shared:**

- **Unified Animation**: Image and text animate together (damping: 28, stiffness: 350, mass: 0.8)
- **Navigation**: Prev/next buttons and keyboard arrows for browsing photos
- **Responsive**: Touch-friendly 3D swipe on mobile, hover tilt + button controls on desktop

```tsx
// Mobile swipe rotation
const swipeRotateY = useTransform(smoothX, [-300, 0, 300], [-15, 0, 15]);

// Desktop hover tilt
const hoverRotateY = useTransform(smoothMouseX, [-0.5, 0.5], [8, -8]);
const hoverRotateX = useTransform(smoothMouseY, [-0.5, 0.5], [-6, 6]);

// Combined effect
const combinedRotateY = useTransform(
  [swipeRotateY, hoverRotateY],
  ([swipe, hover]) => swipe + hover,
);
```

### View Transitions

Gallery view switching uses directional morphing animations:

- **Horizontal**: Floating ↔ Masonry (slide left/right)
- **Vertical**: Masonry ↔ Timeline (slide up/down)
- **Diagonal**: Floating ↔ Timeline (combined movement)
- **Blur Effect**: Subtle blur during transition for polish

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
