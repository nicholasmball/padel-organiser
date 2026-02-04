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

-- ============================================
-- Row Level Security Policies
-- ============================================

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
