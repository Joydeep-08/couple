-- ============================================
-- COUPLE GIFT SITE — Supabase setup
-- Run this whole file in Supabase SQL Editor
-- ============================================

create extension if not exists "pgcrypto";

create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  name1 text not null,
  name2 text not null,
  passcode text not null,           -- 4 digit code, stored plain (low stakes, like the inspo site)
  message text not null,            -- the letter message
  photo1_url text,
  photo2_url text,
  photo3_url text,
  amount integer not null default 9900, -- in paise -> ₹99
  paid boolean not null default false,
  razorpay_order_id text,
  razorpay_payment_id text,
  created_at timestamptz not null default now()
);

alter table public.cards enable row level security;

-- Anyone (anon key) can create a card (the "form" step)
create policy "anon_insert_cards"
  on public.cards for insert
  to anon
  with check (true);

-- Anyone can read a card by id (needed for preview + the live link + passcode check client-side)
create policy "anon_select_cards"
  on public.cards for select
  to anon
  using (true);

-- IMPORTANT: no UPDATE policy for anon.
-- "paid" can ONLY be flipped to true by the verify-payment Edge Function,
-- which uses the service_role key (bypasses RLS). This stops people from
-- faking payment from the browser console.

-- ============================================
-- Storage bucket for the 3 uploaded photos
-- ============================================
insert into storage.buckets (id, name, public)
values ('card-photos', 'card-photos', true)
on conflict (id) do nothing;

create policy "anon_upload_card_photos"
  on storage.objects for insert
  to anon
  with check (bucket_id = 'card-photos');

create policy "anon_read_card_photos"
  on storage.objects for select
  to anon
  using (bucket_id = 'card-photos');

-- (Optional later) cleanup job for orphaned/unpaid cards older than 7 days,
-- same pattern you used on SurpriseIt. Add a pg_cron + edge function once this is live.
