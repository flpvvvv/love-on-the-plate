# Love on the Plate - Development Guide

## Project Overview
A webapp to document and celebrate homemade meals with AI-generated descriptions.

## Tech Stack
- **Frontend**: Next.js 16 + React 19 + TypeScript
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
- Public SELECT, authenticated INSERT/UPDATE/DELETE
- Cursor-based pagination on `created_at`

## Key Features
- Three gallery views: Floating Plates, Masonry Grid, Love Timeline
- Magic link authentication
- AI-powered meal descriptions
- Image optimization (2000px full, 400px thumbnail)
- Infinite scroll pagination
- Dark/light mode

## Environment Variables
Copy `.env.example` to `.env.local` and fill in your values.
