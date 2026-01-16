# Love on the Plate

A beautiful webapp to document and celebrate homemade meals with AI-generated descriptions.

## Features

- **Three Gallery Views**: Floating Plates, Masonry Grid, and Love Timeline
- **AI Descriptions**: Automatically generate warm, descriptive captions using Google Gemini
- **Magic Link Auth**: Passwordless authentication for admin access
- **Image Optimization**: Automatic resizing and thumbnail generation
- **Dark/Light Mode**: Beautiful themes for any time of day
- **Responsive Design**: Works great on mobile and desktop

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
