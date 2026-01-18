# Love on the Plate

A beautiful webapp to document and celebrate homemade meals with AI-generated descriptions.

## Features

- **Three Gallery Views**: Floating Plates, Masonry Grid, and Love Timeline
- **Bilingual AI Descriptions**: Automatically generate warm, descriptive captions in both English and Chinese using Google Gemini
- **Magic Link Auth**: Passwordless authentication for admin access
- **Image Optimization**: Automatic resizing and thumbnail generation
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

#### Typewriter Effect

AI-generated descriptions animate character-by-character in the photo modal, creating an intimate "letter being written" experience. Click to skip the animation.

#### Envelope Modal

Photo modals feature a smooth, elegant opening animation:

- Spring physics for natural feeling motion
- Content slides up with staged reveal
- Typewriter effect for descriptions
- Decorative "With love" signature

#### View Transitions

Gallery views morph smoothly between layouts using Framer Motion's `AnimatePresence` and `LayoutGroup`. Directional animations slide based on view order.

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

## License

MIT
