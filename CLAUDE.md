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

## Bilingual Descriptions

Each photo has two description fields:
- `description_en`: English description
- `description_cn`: Chinese (Simplified) description

### AI Generation
The Gemini prompt generates both descriptions in a single API call, returning JSON:
```json
{"en": "English description", "cn": "中文描述"}
```

### API Responses
- `/api/describe` returns: `{ descriptionEn, descriptionCn }`
- `/api/upload` stores both in database
- `/api/photos` PATCH accepts: `{ photoId, descriptionEn, descriptionCn }`

### Frontend Display
| Component | English | Chinese |
|-----------|---------|---------|
| PhotoCard | Primary text | Secondary (muted) |
| PhotoModal | Main section | Below border divider |
| FloatingPlates | Hover overlay | Lighter text below |
| LoveTimeline | Primary | Lighter text below |
| ImagePreview | Editable textarea | Separate textarea |

## Environment Variables
Copy `.env.example` to `.env.local` and fill in your values.
