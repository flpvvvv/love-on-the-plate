# Love on the Plate

A beautiful webapp to document and celebrate homemade meals with AI-generated descriptions.

## Features

- **Three Gallery Views**: Floating Plates, Masonry Grid, and Love Timeline
- **Bilingual AI Descriptions**: Automatically generate warm, descriptive captions in both English and Chinese using Google Gemini
- **Magic Link Auth**: Passwordless authentication for admin access
- **Image Optimization**: Two-tier client-side compression + server thumbnail generation
- **Dark/Light Mode**: Beautiful themes for any time of day
- **Responsive Design**: Mobile-first with premium desktop experience
- **Modern Design System**: Semantic tokens, fluid typography, and refined animations

## Design System v2.0

### Philosophy: "Intimate Minimalism Meets Culinary Poetry"

The design system balances radical minimalism with high-end functionality, creating an interface that feels like a love letter to home cooking.

### Color Palette

#### Light Mode: "Morning Kitchen"

| Token               | Value     | Purpose                      |
| ------------------- | --------- | ---------------------------- |
| `--canvas`          | `#FFFBF8` | Warm white background        |
| `--canvas-elevated` | `#FFFFFF` | Card surfaces                |
| `--ink`             | `#1C1512` | Primary text                 |
| `--ink-secondary`   | `#6B5B4F` | Secondary text               |
| `--love`            | `#D94B38` | Primary accent (terracotta)  |
| `--warmth`          | `#E8A86C` | Secondary accent (honey)     |
| `--freshness`       | `#7BA085` | Tertiary accent (herb green) |

#### Dark Mode: "Candlelit Dinner"

| Token               | Value     | Purpose                        |
| ------------------- | --------- | ------------------------------ |
| `--canvas`          | `#0F0C0A` | Deep espresso background       |
| `--canvas-elevated` | `#1A1512` | Elevated surfaces              |
| `--ink`             | `#F5EEE8` | Primary text (cream)           |
| `--love`            | `#FF7B68` | Brighter accent for visibility |

### Typography

| Font                  | Purpose                               |
| --------------------- | ------------------------------------- |
| **Fraunces**          | Display/headlines with optical sizing |
| **Plus Jakarta Sans** | Body text and UI                      |
| **Caveat**            | Handwritten accents                   |

Fluid scale using `clamp()` for responsive sizing without breakpoints.

### Responsive Architecture

- **Mobile**: Bottom navigation with view switching, safe area support
- **Desktop**: Traditional header with sticky view switcher
- **Glass morphism** for floating UI elements
- **Dynamic viewport units** (`dvh`) for true mobile heights

### Interaction Design

#### Photo Modal

The photo modal provides an immersive viewing experience:

- **3D Card Rotation Effect**: Swipe gestures trigger realistic perspective rotation (rotateY + rotateZ) like flipping a physical card
- **Desktop Hover Tilt**: Mouse position creates subtle 3D tilt effect (rotateY: ±8°, rotateX: ±6°) for interactive premium feel
- **Dynamic Lift & Scale**: Cards rise and scale dynamically during drag for a tactile feel
- **Responsive Shadow**: Shadow direction and intensity respond to swipe direction in real-time
- Unified spring physics for synchronized image and text transitions
- Smooth swipe gestures on mobile with optimized drag elasticity
- Previous/Next navigation with keyboard support (arrow keys)
- Touch-friendly on mobile devices
- Cohesive card animation (image and content move together)

#### View Transitions

Gallery views morph smoothly between layouts using Framer Motion's `AnimatePresence` and `LayoutGroup`. Directional animations:

- **Horizontal**: Floating ↔ Masonry (left/right slide)
- **Vertical**: Masonry ↔ Timeline (up/down slide)
- **Diagonal**: Floating ↔ Timeline (combined movement)
- **Blur effect**: Subtle blur during transition for polish

#### Toast Notifications

Success/error feedback with heartbeat animation on the icon. Toasts appear from the bottom with spring physics.

## Bilingual Descriptions

Each photo automatically receives two AI-generated descriptions:

- **English**: Warm, evocative description of the dish
- **Chinese (中文)**: Matching description in Simplified Chinese

### Frontend Layout

The bilingual descriptions are displayed throughout the app:

| View                | English           | Chinese                    |
| ------------------- | ----------------- | -------------------------- |
| **Photo Card**      | Primary text      | Secondary text below       |
| **Photo Modal**     | Top section       | Below divider line         |
| **Floating Plates** | Hover overlay     | Lighter text below         |
| **Love Timeline**   | Primary text      | Lighter text below         |
| **Admin Upload**    | Editable textarea | Separate editable textarea |

Both descriptions can be edited before upload and regenerated using the "Regenerate Both" button.

## Error Handling & Rate Limits

### Gemini Free Tier

If using Google Gemini's free tier, you may encounter rate limits. The app handles this gracefully:

- **During preview**: Shows a clear error message: "AI service is temporarily busy. Free tier limit reached."
- **During upload**: Photo uploads successfully, with a note that AI descriptions can be regenerated later
- **All errors** are displayed with user-friendly messages via toast notifications

### Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "AI service is temporarily busy..." | Gemini rate limit | Wait a moment and try again |
| "Session expired. Please sign in again." | Auth cookie lost | Re-login via magic link |
| "Image file is too large." | File > 10MB | Use a smaller image |
| "Failed to compress image..." | Browser issue | Try a different browser or refresh |

### Mobile Upload & Image Compression

Mobile uploads are fully supported with two-tier client-side compression:

| Tier | Resolution | Quality | Purpose |
|------|------------|---------|---------|
| **Upload** | 1920x1920 | 80% | Stored in Supabase (~500KB-1.5MB) |
| **AI** | 1280x1280 | 70% | Sent to Gemini API (~200-600KB) |

This approach:
- Prevents 413 errors on Vercel (4.5MB body limit)
- Reduces bandwidth usage on mobile
- Speeds up AI description generation
- Maintains high-quality stored images

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase account
- Google AI Studio API key

### Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/love-on-the-plate.git
   cd love-on-the-plate
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up environment variables:

   ```bash
   cp .env.example .env.local
   ```

   Fill in your Supabase and Google Gemini credentials.

4. Set up Supabase:
   - Create a new Supabase project
   - Run the migration in `supabase/migrations/`
   - Create a storage bucket named `photos` (public access)
   - Enable Email Auth with Magic Link

5. Start the development server:

   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000)

## Deploy to Vercel

### Prerequisites

- A [Vercel](https://vercel.com) account
- Your project pushed to a Git repository (GitHub, GitLab, or Bitbucket)

### Step-by-Step Deployment

1. **Push your code to Git**

   ```bash
   git add .
   git commit -m "Ready for Vercel deployment"
   git push origin main
   ```

2. **Import project to Vercel**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Select your Git provider and authorize Vercel
   - Import the `love-on-the-plate` repository

3. **Configure environment variables**

   In the Vercel dashboard, add these environment variables:
   | Variable | Description |
   |----------|-------------|
   | `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (keep secret!) |
   | `GOOGLE_GEMINI_API_KEY` | Google AI Studio API key |
   | `GEMINI_MODEL` | AI model name (default: `gemini-2.0-flash`) |
   | `NEXT_PUBLIC_APP_URL` | Your Vercel deployment URL (e.g., `https://your-app.vercel.app`) |

4. **Configure Supabase for production**
   - Go to Supabase Dashboard → Authentication → URL Configuration
   - Add your Vercel URL to **Site URL**: `https://your-app.vercel.app`
   - Add redirect URLs:
     - `https://your-app.vercel.app/auth/callback`
     - `https://your-app.vercel.app/**`

5. **Deploy**
   - Click "Deploy" in Vercel
   - Wait for the build to complete (~1-2 minutes)

6. **Verify deployment**
   - Visit your deployed URL
   - Test the magic link login flow
   - Upload a test photo

### Post-Deployment Checklist

- [ ] Magic link emails are received and work correctly
- [ ] Images upload and display properly
- [ ] AI descriptions generate for new uploads
- [ ] Dark/light mode toggle works
- [ ] All three gallery views render correctly

## Tech Stack

- **Framework**: Next.js 16 + React 19
- **Language**: TypeScript
- **Styling**: TailwindCSS v4 + Framer Motion
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage
- **AI**: Google Gemini (gemini-2.0-flash)

## Security

This application implements several security measures:

- **Input Validation**: UUID format validation for all photo IDs, base64 size limits
- **Authentication**: Magic link auth via Supabase with admin role verification
- **Authorization**: Role-based access control (admin required for uploads/AI generation)
- **Open Redirect Prevention**: Auth callback validates redirect URLs against allowlist
- **File Validation**: Type and size limits on uploads
- **Error Sanitization**: Internal errors are sanitized before client response
- **Parameterized Queries**: Supabase client prevents SQL injection
- **RLS Policies**: Database-level access control

## License

MIT
