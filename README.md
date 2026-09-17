# Love on the Plate

A webapp to document and celebrate homemade meals with AI-generated bilingual descriptions.

## Features

- **Three Gallery Views**: Floating Plates, Masonry Grid, Love Timeline
- **Bilingual AI Descriptions**: English + Chinese captions via DeepSeek
- **Magic Link Auth**: Passwordless admin authentication
- **Image Optimization**: Two-tier client-side compression + server thumbnails
- **Dark/Light Mode**: Automatic theme switching
- **Mobile-First**: Bottom navigation, app-like swipe gestures with 3D card effects

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16.2 + React 19 + TypeScript 6 |
| Styling | TailwindCSS v4 + Framer Motion |
| Testing | Vitest (unit/integration) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (Magic Link) |
| Storage | Supabase Storage |
| AI | DeepSeek (deepseek-flash) |

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase account
- DeepSeek API key

### Setup

```bash
# Clone and install
git clone https://github.com/yourusername/love-on-the-plate.git
cd love-on-the-plate
pnpm install

# Configure environment
cp .env.example .env.local
# Fill in your credentials

# Start dev server
pnpm dev

# Lint and format
pnpm lint
pnpm format

# Run tests
pnpm test
pnpm test:run
pnpm test:coverage
```

### Supabase Setup

1. Create a new project
2. Copy keys from **Settings > API Keys**: the publishable key and a secret key (`sb_secret_...`)
3. Run migration from `supabase/migrations/`
4. Create `photos` storage bucket (public access)
5. Enable Email Auth with Magic Link

## Deploy to Vercel

1. Push to GitHub/GitLab/Bitbucket
2. Import at [vercel.com/new](https://vercel.com/new)
3. Add environment variables:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable API key (`sb_publishable_...`) |
| `SUPABASE_SECRET_KEY` | Supabase secret API key (`sb_secret_...`, server-only) |
| `DEEPSEEK_API_KEY` | DeepSeek API key |
| `DEEPSEEK_MODEL` | `deepseek-flash` (default) |
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
| AI | 1280×1280 | 70% | DeepSeek API (~200-600KB) |

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| "AI service is temporarily busy..." | DeepSeek rate limit | Wait and retry |
| "Session expired" | Auth cookie lost | Re-login |
| "Image file is too large" | File > 10MB | Use smaller image |

Photos upload successfully even if AI description fails (can regenerate later).

## Testing

Unit and integration tests using Vitest with React Testing Library.

```bash
pnpm test        # Watch mode
pnpm test:run    # Run once
pnpm test:coverage # With coverage report
```

Test coverage includes:
- Utility functions (validation, date formatting, image compression helpers)
- React hooks (useHeartbeat)
- AI error handling

## Security

- Input validation for UUIDs and base64 images
- Auth callback validates redirects against allowlist
- Role-based access control (admin required for uploads)
- RLS policies for database-level security
- Parameterized queries prevent SQL injection

## License

MIT
