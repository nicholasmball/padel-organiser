# Padel Game Organiser Web App

## Overview
Build a web application to help organise padel games among a growing community. The app should handle player availability, court bookings, game sign-ups, payment tracking, weather information, and communication between players.

## Tech Stack
- **Frontend**: Next.js 14+ with App Router, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL database, Auth, Row Level Security)
- **Deployment**: Vercel
- **UI Components**: shadcn/ui
- **Weather API**: Open-Meteo (free, no API key required)

## Design Principles
- **Mobile-first**: Primary use is on phones, but must work well on laptop/desktop
- **Touch-friendly**: Large tap targets, swipe gestures where appropriate
- **Fast**: Optimistic updates, minimal loading states
- **Public access**: Anyone can sign up and join the community

---

## Core Features

### 1. Authentication & Users
- Email/password authentication via Supabase Auth
- Public registration (anyone can sign up)
- User profiles with:
  - Name and contact info
  - Skill level (Beginner / Intermediate / Advanced / Pro)
  - Profile picture (optional)
  - Phone number (optional, for WhatsApp coordination)
- Email verification required before joining games

### 2. Availability Management
- Users can set their general weekly availability (recurring schedule)
  - Example: "Available Tuesdays 18:00-21:00, Saturdays 09:00-14:00"
- Users can mark specific dates as unavailable (holidays, exceptions)
- Calendar view showing who's available when
- Quick filters: "Who's free this Saturday afternoon?"
- Availability is visible to all members to help organisers plan

### 3. Court Bookings
- Any user can create a booking with:
  - Venue name and address
  - Date and time (start/end)
  - Court number (optional)
  - Indoor/Outdoor flag (for weather relevance)
  - Total cost
  - Maximum players (default: 4)
  - Notes (e.g., "bring water", "parking available")
- Booking statuses: Open (needs players) → Full → Confirmed → Completed → Cancelled
- Edit and cancel functionality (with notifications to signed-up players)
- Duplicate booking feature (for recurring games at same venue)

### 4. Weather Integration
- For outdoor court bookings, display weather forecast:
  - Temperature
  - Precipitation probability
  - Wind speed
  - Weather icon/condition
- Show weather on booking cards and detail pages
- Weather warning banner if rain >50% probability for outdoor games
- Use Open-Meteo API (free, no key needed): fetch forecast for booking date/location
- Cache weather data to avoid excessive API calls (refresh every 3 hours)

### 5. Game Sign-ups
- Players can opt-in to available bookings with one tap
- Show current sign-ups with player names and skill levels
- Waitlist when game is full (auto-promote if someone drops out)
- Organiser can manually add/remove players
- Deadline for sign-ups (optional, set by organiser)
- "I'm interested but not sure" option (shown separately from confirmed players)

### 6. Comments & Chat per Booking
- Each booking has a comments/chat section
- Any signed-up player (or organiser) can post messages
- Use cases:
  - "Running 5 mins late"
  - "I can bring extra balls"
  - "Anyone want to grab food after?"
  - "Should we move indoors given the weather?"
- Simple threaded comments (not real-time websockets - page refresh or pull-to-refresh to see new messages)
- Timestamp and author shown on each message
- Organiser can pin important messages
- Optional: notify signed-up players when new comment posted

### 7. Payment Tracking
- Auto-calculate cost per player (total cost ÷ number of players)
- Display each player's share on the booking page
- Payment status per player: Unpaid → Paid
- Either party can mark as paid:
  - Player marks themselves as "paid"
  - OR organiser marks player as "paid"
- Simple toggle - no dual confirmation needed initially
- Payment summary: who owes whom, outstanding balances
- "Settle up" view showing net balances between members

### 8. Notifications
- Email notifications for:
  - New booking created (to users who are available at that time)
  - Spot available (to waitlist members)
  - Payment reminders (day before game if unpaid)
  - Game cancelled or time changed
  - New comment on a booking you're signed up for (optional, user can disable)
- In-app notification centre with unread count

### 9. Dashboard & Views
- **Home**: 
  - Upcoming games I'm signed up for (with weather if outdoor)
  - Open games needing players
  - Recent activity feed
- **Calendar**: Monthly/weekly view of all bookings with availability overlay
- **My Games**: History of past games, payment history, stats (games played, etc.)
- **Members**: List of all community members, their skill levels, availability patterns
- **Balances**: Who owes money, who is owed money, settle-up suggestions

---

## Database Schema (Supabase)

```sql
-- Users table (extends Supabase auth.users)
create table profiles (
  id uuid references auth.users primary key,
  full_name text not null,
  email text not null,
  phone text,
  skill_level text check (skill_level in ('beginner', 'intermediate', 'advanced', 'pro')),
  avatar_url text,
  email_notifications boolean default true,
  created_at timestamp with time zone default now()
);

-- Recurring weekly availability
create table availability (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles on delete cascade,
  day_of_week int check (day_of_week between 0 and 6), -- 0 = Sunday
  start_time time not null,
  end_time time not null,
  created_at timestamp with time zone default now()
);

-- Specific unavailable dates
create table unavailable_dates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles on delete cascade,
  date date not null,
  reason text,
  created_at timestamp with time zone default now()
);

-- Court bookings
create table bookings (
  id uuid primary key default gen_random_uuid(),
  organiser_id uuid references profiles on delete cascade,
  venue_name text not null,
  venue_address text,
  venue_lat decimal(10,7), -- for weather lookup
  venue_lng decimal(10,7),
  court_number text,
  is_outdoor boolean default true,
  date date not null,
  start_time time not null,
  end_time time not null,
  total_cost decimal(10,2) not null default 0,
  max_players int default 4,
  notes text,
  status text default 'open' check (status in ('open', 'full', 'confirmed', 'completed', 'cancelled')),
  signup_deadline timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Player sign-ups for bookings
create table signups (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings on delete cascade,
  user_id uuid references profiles on delete cascade,
  status text default 'confirmed' check (status in ('confirmed', 'waitlist', 'interested')),
  position int, -- order in waitlist
  payment_status text default 'unpaid' check (payment_status in ('unpaid', 'paid')),
  signed_up_at timestamp with time zone default now(),
  unique(booking_id, user_id)
);

-- Comments per booking
create table comments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings on delete cascade,
  user_id uuid references profiles on delete cascade,
  content text not null,
  is_pinned boolean default false,
  created_at timestamp with time zone default now()
);

-- Weather cache
create table weather_cache (
  id uuid primary key default gen_random_uuid(),
  lat decimal(10,7) not null,
  lng decimal(10,7) not null,
  date date not null,
  forecast_data jsonb not null,
  fetched_at timestamp with time zone default now(),
  unique(lat, lng, date)
);
```

---

## Row Level Security Policies

```sql
-- Profiles: anyone can read, users can update their own
alter table profiles enable row level security;

create policy "Profiles are viewable by everyone" on profiles
  for select using (true);

create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);

create policy "Users can insert own profile" on profiles
  for insert with check (auth.uid() = id);

-- Availability: anyone can read, users can manage their own
alter table availability enable row level security;

create policy "Availability is viewable by everyone" on availability
  for select using (true);

create policy "Users can manage own availability" on availability
  for all using (auth.uid() = user_id);

-- Unavailable dates: anyone can read, users can manage their own
alter table unavailable_dates enable row level security;

create policy "Unavailable dates viewable by everyone" on unavailable_dates
  for select using (true);

create policy "Users can manage own unavailable dates" on unavailable_dates
  for all using (auth.uid() = user_id);

-- Bookings: anyone can read, creator can update/delete
alter table bookings enable row level security;

create policy "Bookings are viewable by everyone" on bookings
  for select using (true);

create policy "Authenticated users can create bookings" on bookings
  for insert with check (auth.uid() = organiser_id);

create policy "Organisers can update own bookings" on bookings
  for update using (auth.uid() = organiser_id);

create policy "Organisers can delete own bookings" on bookings
  for delete using (auth.uid() = organiser_id);

-- Signups: anyone can read, users can manage their own, organiser can manage all
alter table signups enable row level security;

create policy "Signups are viewable by everyone" on signups
  for select using (true);

create policy "Users can create own signup" on signups
  for insert with check (auth.uid() = user_id);

create policy "Users can update own signup" on signups
  for update using (
    auth.uid() = user_id 
    or auth.uid() = (select organiser_id from bookings where id = booking_id)
  );

create policy "Users can delete own signup or organiser can remove" on signups
  for delete using (
    auth.uid() = user_id 
    or auth.uid() = (select organiser_id from bookings where id = booking_id)
  );

-- Comments: anyone can read, users can manage their own
alter table comments enable row level security;

create policy "Comments are viewable by everyone" on comments
  for select using (true);

create policy "Authenticated users can create comments" on comments
  for insert with check (auth.uid() = user_id);

create policy "Users can update own comments" on comments
  for update using (auth.uid() = user_id);

create policy "Users can delete own comments" on comments
  for delete using (auth.uid() = user_id);

-- Organiser can pin comments on their bookings
create policy "Organisers can pin comments on their bookings" on comments
  for update using (
    auth.uid() = (select organiser_id from bookings where id = booking_id)
  );

-- Weather cache: anyone can read/write (it's just cached data)
alter table weather_cache enable row level security;

create policy "Weather cache is public" on weather_cache
  for all using (true);
```

---

## API Routes / Server Actions

- `GET /api/weather?lat=X&lng=Y&date=YYYY-MM-DD` - fetch weather with caching
- Server actions for all CRUD operations using Supabase client

### Weather API Integration (Open-Meteo)

```typescript
// Example weather fetch function
async function getWeather(lat: number, lng: number, date: string) {
  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,weather_code&timezone=auto`
  );
  return response.json();
}
```

---

## UI/UX Requirements

### Mobile-First Design
- Bottom navigation bar (Home, Calendar, Add Booking, Members, Profile)
- Card-based layout for bookings
- Pull-to-refresh on lists
- Swipe actions where appropriate (e.g., swipe to leave game)
- Large touch targets (minimum 44x44px)
- Sticky headers for context

### Desktop Adaptation
- Side navigation instead of bottom bar
- Multi-column layouts where appropriate
- Hover states on interactive elements
- Keyboard shortcuts for power users

### Component Patterns
- **Booking card**: date/time, venue, players (avatars), weather icon, cost per person, status badge
- **Player chip**: avatar, name, skill level badge, payment status indicator
- **Comment bubble**: author, timestamp, content, pin indicator
- **Empty states**: helpful prompts and CTAs

### Colour Scheme Suggestions
- Primary: Vibrant blue or teal (energetic, sporty)
- Success: Green (for confirmed, paid)
- Warning: Amber (for weather alerts, pending payments)
- Error: Red (for cancellations, issues)
- Neutral: Slate greys for text and backgrounds

---

## Implementation Order

### Phase 1: Project Setup
- [ ] Next.js with TypeScript, Tailwind, shadcn/ui
- [ ] Supabase project and client configuration
- [ ] Environment variables for Vercel deployment
- [ ] Basic project structure and layouts

### Phase 2: Authentication
- [ ] Sign up, sign in, sign out flows
- [ ] Email verification
- [ ] Profile creation on first sign-up
- [ ] Profile editing page

### Phase 3: Bookings Core
- [ ] Create booking form
- [ ] Booking list view (home page)
- [ ] Booking detail page
- [ ] Edit and delete booking
- [ ] Sign-up and leave functionality
- [ ] Waitlist logic

### Phase 4: Availability System
- [ ] Set recurring weekly availability
- [ ] Mark specific dates as unavailable
- [ ] Availability calendar view
- [ ] Filter: "Who's free when?"

### Phase 5: Payment Tracking
- [ ] Cost calculation and display per player
- [ ] Payment status toggle
- [ ] Balance summary view
- [ ] "Who owes whom" calculations

### Phase 6: Weather Integration
- [ ] Open-Meteo API integration
- [ ] Weather caching in database
- [ ] Weather display on outdoor booking cards
- [ ] Weather warning banners

### Phase 7: Comments
- [ ] Comment list on booking detail page
- [ ] Add comment form
- [ ] Edit and delete own comments
- [ ] Pin functionality for organisers

### Phase 8: Notifications
- [ ] In-app notification system
- [ ] Notification centre page
- [ ] Email notifications via Supabase Edge Functions or Resend

### Phase 9: Polish & Deploy
- [ ] Loading skeletons and error states
- [ ] Empty states with helpful messaging
- [ ] Final UI polish and responsiveness testing
- [ ] Vercel deployment and custom domain

---

## Future Enhancements (TODO for later)

- [ ] **Payment integrations**: Splitwise API, Revolut payment links, or Wise integration for actual money transfers
- [ ] **Real-time chat**: WebSocket-based live chat instead of comments
- [ ] **Push notifications**: Mobile push via service workers
- [ ] **Recurring bookings**: Auto-create weekly games
- [ ] **Player matching**: Suggest balanced teams based on skill levels
- [ ] **Venue management**: Save favourite courts with pre-filled details
- [ ] **Stats & leaderboards**: Games played, most active players, win/loss if tracking matches
- [ ] **Multiple groups/clubs**: Support separate communities within one app
- [ ] **Guest players**: Allow one-off players without full accounts
- [ ] **Court booking integration**: Direct booking with padel venues (if they have APIs)
- [ ] **Match results**: Track scores and generate player rankings
- [ ] **Social features**: Player reviews, preferred partners

---

## Notes for Implementation

1. **Start with the database**: Set up Supabase, create all tables and RLS policies first
2. **Authentication before features**: Get auth working end-to-end before building features
3. **Test on mobile early**: Use browser dev tools mobile view from the start
4. **Pause after each phase**: Let me test and provide feedback before continuing
5. **Keep it simple initially**: We can always add complexity later

---

## Environment Variables Needed

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key (for server-side only)
```

---

Please implement this specification phase by phase, pausing after each major phase for testing and feedback. Ask me if you need any clarification on requirements.
