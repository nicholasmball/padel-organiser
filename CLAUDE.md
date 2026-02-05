# Padel Organiser

A web app for organising padel games with friends — bookings, signups, payments, weather, and notifications.

## Tech Stack

- **Framework**: Next.js 16 (App Router, Server Components, Server Actions)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 + shadcn/ui (new-york style)
- **Database**: Supabase (PostgreSQL + Auth + Row Level Security)
- **Deployment**: Vercel
- **APIs**: Open-Meteo (weather), OpenStreetMap Nominatim (geocoding)

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/weather/        # Weather API route (Open-Meteo + caching)
│   ├── auth/               # Sign-in, sign-up, callback
│   ├── balances/           # Payment balances and settle-up
│   ├── bookings/[id]/      # Booking detail + edit pages
│   ├── calendar/           # Monthly calendar with availability overlay
│   ├── members/            # Member directory
│   ├── my-games/           # User's game history and stats
│   ├── notifications/      # Notification centre
│   ├── profile/            # User profile + availability management
│   ├── error.tsx           # Global error boundary
│   └── loading.tsx         # Home page loading skeleton
├── components/
│   ├── availability/       # AvailabilityManager, CalendarView
│   ├── balances/           # BalancesView
│   ├── bookings/           # BookingForm, BookingCard, BookingDetail, CommentsSection
│   ├── layout/             # Header, BottomNav, SideNav, NotificationBell
│   ├── members/            # MembersList
│   ├── ui/                 # shadcn/ui primitives + page-skeleton.tsx
│   └── weather/            # WeatherBadge
├── hooks/
│   └── use-auth.ts         # Client-side auth state hook
└── lib/
    ├── actions/            # Server Actions (bookings, comments, notifications, payments, availability, account)
    ├── supabase/           # Supabase clients (client, server, admin, middleware)
    ├── types/database.ts   # Full Supabase Database types (must include Relationships arrays)
    ├── ensure-profile.ts   # Auto-creates profile row if missing
    └── geocode.ts          # UK address geocoding with postcode fallback
```

## Key Architecture Decisions

- **Server Components** for data fetching (pages), **Client Components** for interactivity (forms, buttons)
- **Server Actions** (`"use server"`) for all mutations — no API routes except weather
- **Admin client** (`createAdminClient`) uses service role key to bypass RLS for cross-user operations: waitlist promotion, payment toggling, notification creation, comment pinning, account deletion
- **`ensureProfile()`** called before booking creation/signup to auto-create missing profile rows
- **Geocoding** is automatic — addresses are geocoded server-side in booking create/update actions using Nominatim, with UK postcode fallback if full address fails
- **Weather** is cached in `weather_cache` table with 3-hour TTL

## Auth & Navigation

- **Middleware** (`src/lib/supabase/middleware.ts`) redirects unauthenticated users to `/auth/sign-in` and authenticated users away from auth pages
- **Side nav, bottom nav, and header controls** are hidden when signed out or on auth pages (prevents flash during sign-in transition)
- `useAuth()` hook tracks client-side auth state via Supabase `onAuthStateChange`
- Public paths: `/auth/sign-in`, `/auth/sign-up`, `/auth/callback`, `/api/*`

## Database

8 tables: `profiles`, `availability`, `unavailable_dates`, `bookings`, `signups`, `comments`, `weather_cache`, `notifications`

All tables use Row Level Security. Most tables cascade delete from `profiles`. Delete account order: notifications → profile (cascades rest) → auth user.

## Gotchas

- The `Database` type in `database.ts` **must** include `Relationships` arrays for each table — without them, Supabase insert/update types resolve to `never`
- `revalidatePath()` only works in server-rendered pages — client components need `router.refresh()` or an `onUpdate` callback
- `onAuthStateChange` fires before page navigation — always check `pathname.startsWith("/auth/")` in nav components
- When shadcn adds components, it may update `package.json` — **always commit package.json and package-lock.json** or Vercel builds will fail
- Nominatim geocoding often fails on specific venue addresses — the UK postcode regex fallback in `geocode.ts` handles this
- Each server-rendered page has a `loading.tsx` skeleton and the app has a root `error.tsx` boundary

## Commands

```bash
npm run dev          # Start dev server
npx next build       # Production build (also runs TypeScript checking)
```

## Environment Variables

Required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase publishable/anon key
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase secret/service role key (server-side only)
