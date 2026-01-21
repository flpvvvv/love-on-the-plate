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
- Image optimization (1920px full, 400px thumbnail) with two-tier client-side compression
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

## Security

### Input Validation

Located in `src/lib/validation.ts`:

```tsx
import { isValidUUID, isValidBase64Image, MAX_BASE64_LENGTH } from '@/lib/validation';

// UUID validation
if (!isValidUUID(photoId)) {
  return NextResponse.json({ error: 'Invalid photo ID format' }, { status: 400 });
}

// Base64 image validation with size limit (~10MB)
if (!isValidBase64Image(imageBase64)) {
  return NextResponse.json({ error: 'Invalid image data' }, { status: 400 });
}
```

### Auth Callback Security

The `/auth/callback` route validates redirect URLs against an allowlist to prevent open redirect attacks:

```tsx
const ALLOWED_PATHS = ['/', '/admin', '/admin/login'];
// Validates: starts with /, not //, matches allowlist
```

### Authorization Matrix

| Endpoint | Auth Required | Admin Required |
|----------|--------------|----------------|
| `GET /api/photos` | No | No |
| `PATCH /api/photos` | Yes | No (owner only) |
| `DELETE /api/photos` | Yes | Yes or owner |
| `POST /api/upload` | Yes | Yes |
| `POST /api/describe` | Yes | Yes |
| `POST /api/backfill` | Yes | Yes |
| `GET /api/backfill` | Yes | Yes |

## Error Handling

### Gemini API Errors

The `GeminiError` class (`src/lib/gemini.ts`) provides structured error handling for AI operations:

```tsx
import { GeminiError } from '@/lib/gemini';

// Error properties
error.code;        // Error code (e.g., 'RATE_LIMIT')
error.userMessage; // User-friendly message
error.isRetryable; // Whether the operation can be retried
```

**Error Codes:**

| Code | Description | User Message |
|------|-------------|--------------|
| `RATE_LIMIT` | Free tier quota exceeded | "AI service is temporarily busy. Free tier limit reached. Please wait a moment and try again." |
| `AUTH_ERROR` | Invalid API key | "AI service authentication failed. Please contact support." |
| `CONTENT_BLOCKED` | Safety filter triggered | "Image could not be analyzed. Please try a different photo." |
| `SERVICE_UNAVAILABLE` | Gemini API down (503) | "AI service is temporarily unavailable. Please try again later." |
| `PAYLOAD_TOO_LARGE` | Request too large | "Image is too large to process. Please try a smaller image." |
| `TIMEOUT` | Request timeout | "AI service took too long to respond. Please try again." |
| `NETWORK_ERROR` | Connection issues | "Network connection issue. Please check your internet and try again." |
| `INVALID_INPUT` | Missing/invalid base64 | "No image data provided." |
| `EMPTY_RESPONSE` | AI returned nothing | "AI returned an empty response. Please try again." |
| `UNKNOWN_ERROR` | Catch-all | "Failed to generate description. Please try again." |

### API Error Response Format

All API routes return consistent error responses:

```json
{
  "error": "User-friendly error message",
  "code": "ERROR_CODE",
  "isRetryable": true
}
```

**HTTP Status Codes:**

- `400` - Bad request (invalid input, missing data)
- `401` - Unauthorized (session expired)
- `403` - Forbidden (not admin)
- `404` - Not found
- `429` - Rate limit exceeded (Gemini free tier)
- `500` - Server error

### Client-Side Image Compression

Located in `src/lib/client-image-compression.ts`:

**Two-Tier Compression Presets:**

| Preset | Resolution | Quality | Purpose | Typical Size |
|--------|------------|---------|---------|--------------|
| `upload` | 1920x1920 | 0.8 | Stored in Supabase | ~500KB-1.5MB |
| `ai` | 1280x1280 | 0.7 | Sent to Gemini API | ~200-600KB |

```tsx
import { compressImage, COMPRESSION_PRESETS, base64ToBlob, formatFileSize } from '@/lib/client-image-compression';

// Compress for storage (higher quality)
const uploadBase64 = await compressImage(file, COMPRESSION_PRESETS.upload);

// Compress for AI (smaller/faster)
const aiBase64 = await compressImage(file, COMPRESSION_PRESETS.ai);

// Convert base64 to Blob for FormData upload
const blob = base64ToBlob(uploadBase64, 'image/jpeg');
const compressedFile = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
```

**Why Two Tiers?**
- **Upload tier**: High-quality images stored in Supabase for gallery display
- **AI tier**: Smaller images for faster AI description generation and reduced API costs

**Validation:** The compression function validates:
- Canvas context creation success
- DataURL format (must contain comma separator)
- Base64 extraction (must not be empty)

Throws descriptive errors on failure for user feedback.

### Frontend Error Display

Errors are displayed via the Toast system:

```tsx
const { showToast } = useToast();

// API errors are parsed and displayed
if (response.status === 429) {
  showToast('AI service is temporarily busy. Free tier limit reached.', 'error');
}
```

**Rate Limit Handling:** When Gemini rate limits are hit:
1. Description generation is skipped
2. Photo still uploads successfully
3. User sees info toast: "AI description skipped (rate limit). You can regenerate it later."
4. User can regenerate descriptions later from admin panel
