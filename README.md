# Love on the Plate

A webapp to document and celebrate homemade meals with AI-generated bilingual descriptions.

## Features

- **Three Gallery Views**: Floating Plates, Masonry Grid, Love Timeline
- **Bilingual AI Descriptions**: English + Chinese captions via Google Gemini
- **Magic Link Auth**: Passwordless admin authentication
- **Image Optimization**: Two-tier client-side compression + server thumbnails
- **Dark/Light Mode**: Automatic theme switching
- **Mobile-First**: Bottom navigation, app-like swipe gestures with 3D card effects

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 + React 19 + TypeScript |
| Styling | TailwindCSS v4 + Framer Motion |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (Magic Link) |
| Storage | Supabase Storage |
| AI | Google Gemini (gemini-2.0-flash) |

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase account
- Google AI Studio API key

### Setup

```bash
# Clone and install
git clone https://github.com/yourusername/love-on-the-plate.git
cd love-on-the-plate
npm install

# Configure environment
cp .env.example .env.local
# Fill in your credentials

# Start dev server
npm run dev
```

### Supabase Setup

1. Create a new project
2. Run migration from `supabase/migrations/`
3. Create `photos` storage bucket (public access)
4. Enable Email Auth with Magic Link

## Deploy to Vercel

1. Push to GitHub/GitLab/Bitbucket
2. Import at [vercel.com/new](https://vercel.com/new)
3. Add environment variables:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (secret!) |
| `GOOGLE_GEMINI_API_KEY` | Google AI Studio API key |
| `GEMINI_MODEL` | `gemini-2.0-flash` (default) |
| `NEXT_PUBLIC_APP_URL` | Your Vercel URL |

4. Configure Supabase Auth:
   - Site URL: `https://your-app.vercel.app`
   - Redirect URL: `https://your-app.vercel.app/auth/callback`

5. Deploy

## Image Compression

Two-tier client-side compression prevents upload failures:

| Tier | Resolution | Quality | Purpose |
|------|------------|---------|---------|
| Upload | 1920×1920 | 80% | Gallery display (~500KB-1.5MB) |
| AI | 1280×1280 | 70% | Gemini API (~200-600KB) |

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| "AI service is temporarily busy..." | Gemini rate limit | Wait and retry |
| "Session expired" | Auth cookie lost | Re-login |
| "Image file is too large" | File > 10MB | Use smaller image |

Photos upload successfully even if AI description fails (can regenerate later).

## Security

- Input validation for UUIDs and base64 images
- Auth callback validates redirects against allowlist
- Role-based access control (admin required for uploads)
- RLS policies for database-level security
- Parameterized queries prevent SQL injection

## License

MIT
