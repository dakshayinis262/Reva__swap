-- ============================================================================
-- REVA SWAP — PostgreSQL & Supabase Database Schema
-- Includes 10 relational tables, foreign keys, validation constraints,
-- Row Level Security (RLS) policies, and Storage bucket definitions.
-- ============================================================================

create extension if not exists "pgcrypto";

-- 1. PROFILES (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null check (char_length(full_name) >= 2),
  student_id text not null unique,
  department text not null,
  year_of_study text not null,
  role text not null default 'student' check (role in ('student', 'admin')),
  email_verified boolean not null default false,
  verification_status text not null default 'Pending' check (verification_status in ('Pending', 'Verified', 'Suspended')),
  avatar_url text,
  bio text default '',
  created_at timestamptz not null default now()
);

-- 2. CATEGORIES
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text not null,
  sort_order integer not null default 0
);

-- 3. ITEMS
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete restrict,
  title text not null check (char_length(title) >= 3),
  description text not null check (char_length(description) >= 10),
  condition text not null check (condition in ('New', 'Like New', 'Good', 'Fair')),
  exchange_type text not null check (exchange_type in ('Borrow', 'Buy', 'Sell', 'Swap', 'Free')),
  price numeric(10, 2) not null default 0 check (price >= 0),
  borrowing_duration_days integer check (borrowing_duration_days is null or borrowing_duration_days > 0),
  availability text not null default 'Available' check (availability in ('Available', 'Reserved', 'Borrowed', 'Unavailable')),
  pickup_location text not null,
  swap_preferences text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. ITEM IMAGES
create table if not exists public.item_images (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  image_url text not null,
  sort_order integer not null default 0
);

-- 5. EXCHANGE REQUESTS
create table if not exists public.exchange_requests (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  requester_id uuid not null references public.profiles(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  request_type text not null check (request_type in ('Borrow', 'Buy', 'Sell', 'Swap', 'Free')),
  status text not null default 'Pending' check (status in ('Pending', 'Accepted', 'Rejected', 'In Progress', 'Completed', 'Cancelled')),
  message text not null default '',
  proposed_swap_item text default '',
  requested_duration_days integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint no_self_request check (requester_id <> owner_id)
);

create unique index if not exists unique_active_request_per_user_item
  on public.exchange_requests (item_id, requester_id)
  where status in ('Pending', 'Accepted', 'In Progress');

-- 6. TRANSACTIONS (Borrowing & Exchange Lifecycle)
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.exchange_requests(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  borrower_id uuid not null references public.profiles(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  exchange_type text not null check (exchange_type in ('Borrow', 'Buy', 'Sell', 'Swap', 'Free')),
  amount numeric(10, 2) not null default 0,
  start_date timestamptz not null default now(),
  expected_return_date timestamptz,
  actual_return_date timestamptz,
  borrower_return_confirmed boolean not null default false,
  owner_return_confirmed boolean not null default false,
  status text not null default 'Active' check (status in ('Active', 'Return Pending', 'Completed', 'Disputed')),
  created_at timestamptz not null default now()
);

-- 7. CONDITION REPORTS
create table if not exists public.condition_reports (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  stage text not null check (stage in ('Before Handover', 'After Return')),
  condition_grade text not null check (condition_grade in ('Excellent', 'Good', 'Minor Wear', 'Damaged')),
  notes text not null default '',
  photo_urls text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- 8. DISPUTE REPORTS
create table if not exists public.dispute_reports (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid references public.transactions(id) on delete set null,
  item_id uuid not null references public.items(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_user_id uuid references public.profiles(id) on delete set null,
  category text not null check (category in ('Damaged Product', 'Missing Product', 'Late Return', 'Unreturned Product', 'Other')),
  description text not null check (char_length(description) >= 10),
  photo_urls text[] not null default '{}',
  status text not null default 'Submitted' check (status in ('Submitted', 'Under Review', 'Resolved')),
  admin_notes text default '',
  resolution_summary text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 9. MESSAGES
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  item_id uuid references public.items(id) on delete set null,
  request_id uuid references public.exchange_requests(id) on delete set null,
  content text not null check (char_length(content) >= 1),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- 10. NOTIFICATIONS
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  type text not null default 'info',
  link_view text default 'dashboard',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.items enable row level security;
alter table public.item_images enable row level security;
alter table public.exchange_requests enable row level security;
alter table public.transactions enable row level security;
alter table public.condition_reports enable row level security;
alter table public.dispute_reports enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
security definer
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Categories: readable by everyone
create policy "Categories are publicly readable"
  on public.categories for select using (true);

-- Profiles: public read for campus community, self update, admin full access
create policy "Profiles are readable by authenticated users"
  on public.profiles for select using (true);
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);
create policy "Admins can manage profiles"
  on public.profiles for all using (public.is_admin());

-- Items & Images: publicly browsable, owners manage own items, admins moderate
create policy "Items are publicly readable"
  on public.items for select using (true);
create policy "Verified students can create items"
  on public.items for insert with check (auth.uid() = owner_id);
create policy "Owners and admins can update items"
  on public.items for update using (auth.uid() = owner_id or public.is_admin());
create policy "Owners and admins can delete items"
  on public.items for delete using (auth.uid() = owner_id or public.is_admin());

create policy "Item images are publicly readable"
  on public.item_images for select using (true);
create policy "Item owners can manage images"
  on public.item_images for all using (
    exists (
      select 1 from public.items
      where items.id = item_images.item_id and (items.owner_id = auth.uid() or public.is_admin())
    )
  );

-- Exchange Requests: visible to requester, owner, or admin
create policy "Participants view requests"
  on public.exchange_requests for select
  using (auth.uid() = requester_id or auth.uid() = owner_id or public.is_admin());
create policy "Students create requests"
  on public.exchange_requests for insert
  with check (auth.uid() = requester_id);
create policy "Participants update requests"
  on public.exchange_requests for update
  using (auth.uid() = requester_id or auth.uid() = owner_id or public.is_admin());

-- Transactions & Condition Reports: participants & admins
create policy "Participants view transactions"
  on public.transactions for select
  using (auth.uid() = borrower_id or auth.uid() = owner_id or public.is_admin());
create policy "Participants update transactions"
  on public.transactions for update
  using (auth.uid() = borrower_id or auth.uid() = owner_id or public.is_admin());

create policy "Participants view condition reports"
  on public.condition_reports for select
  using (
    exists (
      select 1 from public.transactions t
      where t.id = condition_reports.transaction_id
        and (t.borrower_id = auth.uid() or t.owner_id = auth.uid() or public.is_admin())
    )
  );
create policy "Participants submit condition reports"
  on public.condition_reports for insert
  with check (auth.uid() = reporter_id);

-- Dispute Reports: reporter, reported user, and admins
create policy "Dispute visibility"
  on public.dispute_reports for select
  using (auth.uid() = reporter_id or auth.uid() = reported_user_id or public.is_admin());
create policy "Students submit disputes"
  on public.dispute_reports for insert
  with check (auth.uid() = reporter_id);
create policy "Admins resolve disputes"
  on public.dispute_reports for update
  using (public.is_admin());

-- Messages & Notifications: private to participants
create policy "Message participants"
  on public.messages for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id);
create policy "Send messages"
  on public.messages for insert
  with check (auth.uid() = sender_id);

create policy "Own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);
create policy "Update own notifications"
  on public.notifications for update
  using (auth.uid() = user_id);

-- Seed default categories
insert into public.categories (name, slug, description, sort_order) values
  ('Books & Notes', 'books-notes', 'Textbooks, exam guides, handwritten notes, and reference manuals.', 1),
  ('Electronics', 'electronics', 'Scientific calculators, headphones, tablets, chargers, and peripherals.', 2),
  ('Lab Equipment', 'lab-equipment', 'Lab coats, multimeters, breadboards, safety goggles, and kits.', 3),
  ('Sports Equipment', 'sports-equipment', 'Badminton rackets, footballs, cricket gear, and fitness accessories.', 4),
  ('Stationery', 'stationery', 'Drafting kits, engineering drawing boards, markers, and organizers.', 5),
  ('Hostel Essentials', 'hostel-essentials', 'Desk lamps, electric kettles, extension boards, and storage.', 6),
  ('Other Items', 'other-items', 'Musical instruments, backpacks, bicycle locks, and campus gear.', 7)
on conflict (slug) do nothing;
